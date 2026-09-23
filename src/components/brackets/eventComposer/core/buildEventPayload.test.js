import test from "node:test";
import assert from "node:assert/strict";

import { buildEventPayload } from "./buildEventPayload.js";

globalThis.window = {
  crypto: { randomUUID: () => "phase5-event-id" },
};

const config = {
  state_version: 4,
  event_types: [
    { name: "GOAL", has_team: true, has_player: true },
    { name: "RALLY_WIN", has_team: true, has_player: false },
  ],
};

test("existing TEAM payload preserves target, player, event, and state version", () => {
  const result = buildEventPayload({
    selectedControl: { event_type: "GOAL", requires_team: true, requires_player: true },
    formState: { selectedTeamId: "10", selectedPlayerId: "7" },
    validatedConfig: config,
    liveStateVersion: 9,
  });
  assert.deepEqual(result.payload, {
    event_type: "GOAL",
    team_id: 10,
    player_id: 7,
    client_event_id: "phase5-event-id",
    expected_state_version: 9,
  });
});

test("existing optional attribution remains optional and preserves a player when supplied", () => {
  const control = { event_type: "RALLY_WIN", requires_team: true, requires_player: false };
  const withoutPlayer = buildEventPayload({
    selectedControl: control,
    formState: { selectedTeamId: "20", selectedPlayerId: "" },
    validatedConfig: config,
    liveStateVersion: 4,
  });
  assert.equal(withoutPlayer.error, null);
  assert.equal(Object.hasOwn(withoutPlayer.payload, "player_id"), false);

  const withPlayer = buildEventPayload({
    selectedControl: control,
    formState: { selectedTeamId: "20", selectedPlayerId: "8" },
    validatedConfig: config,
    liveStateVersion: 4,
  });
  assert.equal(withPlayer.payload.player_id, 8);
});

test("existing required attribution still rejects a missing player", () => {
  const result = buildEventPayload({
    selectedControl: { event_type: "GOAL", requires_team: true, requires_player: true },
    formState: { selectedTeamId: "10", selectedPlayerId: "" },
    validatedConfig: config,
  });
  assert.equal(result.payload, null);
  assert.equal(result.error, "Please select a player.");
});
