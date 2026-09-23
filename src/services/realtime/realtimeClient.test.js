import assert from "node:assert/strict";
import test from "node:test";

import {
  MatchRealtimeClient,
  decideRealtimeEvent,
  normalizeRealtimeEnvelope,
} from "./realtimeClient.js";

const event = (eventId, stateVersion, payload = {}) => ({
  event_id: eventId,
  event_type: "match.state.updated",
  match_id: 9,
  state_version: stateVersion,
  occurred_at: "2026-08-01T10:00:00Z",
  payload: { state_version: stateVersion, ...payload },
});

test("canonical and legacy WebSocket payloads normalize through one adapter", () => {
  assert.equal(normalizeRealtimeEnvelope(event("e1", 2)).eventId, "e1");
  const legacy = normalizeRealtimeEnvelope({
    type: "match.event.created",
    match_id: 9,
    payload: { live_state: { state_version: 3, status: "ONGOING" } },
  });
  assert.equal(legacy.stateVersion, 3);
  assert.equal(legacy.payload.status, "ONGOING");
});

test("duplicates and stale events are ignored, sequential events apply, and gaps refresh", () => {
  assert.equal(decideRealtimeEvent({ currentVersion: 5, incomingVersion: 5, duplicateEvent: true }), "ignore_duplicate");
  assert.equal(decideRealtimeEvent({ currentVersion: 5, incomingVersion: 4 }), "ignore_stale");
  assert.equal(decideRealtimeEvent({ currentVersion: 5, incomingVersion: 6 }), "apply");
  assert.equal(decideRealtimeEvent({ currentVersion: 5, incomingVersion: 8 }), "refresh_gap");
});

test("client detects a version gap and reloads canonical state", async () => {
  let refreshes = 0;
  const states = [];
  const client = new MatchRealtimeClient({
    matchId: 9,
    socketFactory: () => ({ close() {} }),
    fetchCanonicalState: async () => {
      refreshes += 1;
      return { state_version: 8, status: "ONGOING" };
    },
    onState: (state) => states.push(state),
  });
  client.currentVersion = 5;
  await client.handleEnvelope(event("gap", 8));
  assert.equal(refreshes, 1);
  assert.equal(states.at(-1).state_version, 8);
});

test("client suppresses duplicate event IDs and stale versions", async () => {
  const states = [];
  const client = new MatchRealtimeClient({
    matchId: 9,
    socketFactory: () => ({ close() {} }),
    fetchCanonicalState: async () => ({ state_version: 0 }),
    onState: (state) => states.push(state),
  });
  await client.handleEnvelope(event("same", 1));
  await client.handleEnvelope(event("same", 1));
  await client.handleEnvelope(event("older", 0));
  assert.equal(states.length, 1);
});

test("socket failure enters refresh mode and recovery stops polling", async () => {
  const scheduled = new Map();
  let timerId = 0;
  const statuses = [];
  const client = new MatchRealtimeClient({
    matchId: 9,
    socketFactory: () => ({ close() {} }),
    fetchCanonicalState: async () => ({ state_version: 1 }),
    onState: () => {},
    onStatus: (status) => statuses.push(status),
    setIntervalFn: (fn) => { timerId += 1; scheduled.set(timerId, fn); return timerId; },
    clearIntervalFn: (id) => scheduled.delete(id),
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => {},
  });
  client.startPollingFallback();
  assert.equal(statuses.at(-1), "refresh_mode");
  assert.equal(scheduled.size, 1);
  await client.handleSocketOpen();
  assert.notEqual(statuses.at(-1), "live", "an open socket is not a subscribed live connection");
  await client.handleControlMessage({
    type: "match.subscription.ack",
    match_id: 9,
    connection_id: "connection-1",
    transport: { mode: "redis", available: true },
  });
  await client.subscriptionSyncPromise;
  assert.equal(statuses.at(-1), "live");
  assert.equal(scheduled.size, 1, "polling stops and only the heartbeat remains");
  client.disconnect();
  assert.equal(scheduled.size, 0);
});

test("subscription acknowledgement and canonical synchronization are both required for Live", async () => {
  const statuses = [];
  let resolveRefresh;
  const refresh = new Promise((resolve) => { resolveRefresh = resolve; });
  const client = new MatchRealtimeClient({
    matchId: 9,
    socketFactory: () => ({ close() {}, send() {}, readyState: 1 }),
    fetchCanonicalState: async () => refresh,
    onState: () => {},
    onStatus: (status) => statuses.push(status),
  });
  client.socket = { close() {}, send() {}, readyState: 1 };
  client.socketOpen = true;
  client.handleControlMessage({
    type: "match.subscription.ack",
    match_id: 9,
    connection_id: "connection-2",
    transport: { mode: "redis", available: true },
  });
  assert.notEqual(statuses.at(-1), "live");
  resolveRefresh({ state_version: 3, status: "ONGOING" });
  await client.subscriptionSyncPromise;
  assert.equal(statuses.at(-1), "live");
});

test("canonical subscription synchronization can trigger scoring-config recovery", async () => {
  const synchronized = [];
  const client = new MatchRealtimeClient({
    matchId: 9,
    socketFactory: () => ({ close() {}, send() {}, readyState: 1 }),
    fetchCanonicalState: async () => ({ state_version: 4, status: "ONGOING" }),
    onState: () => {},
    onSynchronized: (result) => synchronized.push(result),
  });
  client.socket = { close() {}, send() {}, readyState: 1 };
  client.socketOpen = true;

  client.handleControlMessage({
    type: "match.subscription.ack",
    match_id: 9,
    connection_id: "connection-recovery",
    transport: { mode: "redis", available: true },
  });
  await client.subscriptionSyncPromise;

  assert.equal(synchronized.length, 1);
  assert.equal(synchronized[0].reason, "subscription_ack");
  assert.equal(synchronized[0].state.state_version, 4);
  assert.equal(synchronized[0].metadata.connection_id, "connection-recovery");
});

test("broker degradation enters refresh mode and broker recovery resynchronizes without reload", async () => {
  const statuses = [];
  let refreshes = 0;
  const client = new MatchRealtimeClient({
    matchId: 9,
    socketFactory: () => ({ close() {}, send() {}, readyState: 1 }),
    fetchCanonicalState: async () => ({ state_version: ++refreshes, status: "ONGOING" }),
    onState: () => {},
    onStatus: (status) => statuses.push(status),
    setIntervalFn: () => 1,
    clearIntervalFn: () => {},
  });
  client.socket = { close() {}, send() {}, readyState: 1 };
  client.socketOpen = true;
  client.handleControlMessage({ type: "match.subscription.ack", match_id: 9, transport: { mode: "redis", available: true } });
  await client.subscriptionSyncPromise;
  assert.equal(statuses.at(-1), "live");

  await client.handleControlMessage({ type: "pong", match_id: 9, transport: { mode: "redis", available: false } });
  assert.equal(statuses.at(-1), "refresh_mode");

  await client.handleControlMessage({ type: "pong", match_id: 9, transport: { mode: "redis", available: true } });
  await client.subscriptionSyncPromise;
  assert.equal(statuses.at(-1), "live");
  assert.ok(refreshes >= 2);
});

test("cleanup closes the socket and cancels reconnect and polling work", () => {
  let closes = 0;
  const client = new MatchRealtimeClient({
    matchId: 9,
    socketFactory: () => ({ close: () => { closes += 1; } }),
    fetchCanonicalState: async () => ({ state_version: 0 }),
    onState: () => {},
  });
  client.socket = { close: () => { closes += 1; } };
  client.disconnect();
  assert.equal(closes, 1);
  assert.equal(client.destroyed, true);
});

test("repeated REST refresh failures become Offline and auth expiry fails closed", async () => {
  const statuses = [];
  let expired = 0;
  const client = new MatchRealtimeClient({
    matchId: 9,
    socketFactory: () => ({ close() {} }),
    fetchCanonicalState: async () => { throw new Error("network"); },
    onState: () => {},
    onStatus: (status) => statuses.push(status),
  });
  await client.refreshCanonical().catch(() => {});
  await client.refreshCanonical().catch(() => {});
  assert.equal(statuses.at(-1), "offline");

  client.fetchCanonicalState = async () => {
    const error = new Error("expired");
    error.response = { status: 401 };
    throw error;
  };
  client.onAuthExpired = () => { expired += 1; };
  await client.refreshCanonical().catch(() => {});
  assert.equal(statuses.at(-1), "auth_required");
  assert.equal(expired, 1);
});
