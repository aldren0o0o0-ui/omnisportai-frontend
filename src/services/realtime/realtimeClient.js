const CANONICAL_TYPES = new Set([
  "match.state.updated",
  "match.completed",
  "match.result.corrected",
  "match.participant.updated",
  "match.schedule.updated",
  "match.visibility.updated",
]);

const LEGACY_TYPES = new Set([
  "match.live_state",
  "match.event.created",
  "match.event.deleted",
  "match.event.undone",
]);

const safeVersion = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const legacyPayload = (message) => {
  const payload = message?.payload && typeof message.payload === "object" ? message.payload : {};
  return payload?.live_state && typeof payload.live_state === "object" ? payload.live_state : payload;
};

export const normalizeRealtimeEnvelope = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const canonicalType = String(raw.event_type || "").trim().toLowerCase();
  if (CANONICAL_TYPES.has(canonicalType)) {
    const version = safeVersion(raw.state_version);
    if (!raw.event_id || !Number(raw.match_id) || version === null || !raw.payload || typeof raw.payload !== "object") return null;
    return {
      eventId: String(raw.event_id),
      eventType: canonicalType,
      matchId: Number(raw.match_id),
      stateVersion: version,
      occurredAt: raw.occurred_at || null,
      payload: raw.payload,
      raw,
    };
  }

  const type = String(raw.type || "").trim().toLowerCase();
  if (!LEGACY_TYPES.has(type) && type !== "match.result.corrected") return null;
  const payload = legacyPayload(raw);
  const version = safeVersion(payload?.state_version ?? raw.state_version);
  if (!Number(raw.match_id) || version === null) return null;
  return {
    eventId: String(raw.event_id || `legacy:${type}:${raw.match_id}:${version}`),
    eventType: type === "match.result.corrected" ? type : "match.state.updated",
    matchId: Number(raw.match_id),
    stateVersion: version,
    occurredAt: raw.occurred_at || null,
    payload,
    raw,
  };
};

export const decideRealtimeEvent = ({ currentVersion, incomingVersion, duplicateEvent = false }) => {
  if (duplicateEvent) return "ignore_duplicate";
  const current = safeVersion(currentVersion) ?? 0;
  const incoming = safeVersion(incomingVersion);
  if (incoming === null || incoming < current) return "ignore_stale";
  if (incoming === current) return "ignore_duplicate";
  if (incoming === current + 1) return "apply";
  return "refresh_gap";
};

export class MatchRealtimeClient {
  constructor({
    matchId,
    socketFactory,
    fetchCanonicalState,
    onState,
    onStatus = () => {},
    onAuthExpired = () => {},
    onVersionGap = () => {},
    onDiagnostic = () => {},
    onSynchronized = () => {},
    pollSeconds = 5,
    reconnectMinMs = 500,
    reconnectMaxMs = 15000,
    setIntervalFn = globalThis.setInterval?.bind(globalThis),
    clearIntervalFn = globalThis.clearInterval?.bind(globalThis),
    setTimeoutFn = globalThis.setTimeout?.bind(globalThis),
    clearTimeoutFn = globalThis.clearTimeout?.bind(globalThis),
    documentRef = typeof document !== "undefined" ? document : null,
  }) {
    this.matchId = Number(matchId);
    this.socketFactory = socketFactory;
    this.fetchCanonicalState = fetchCanonicalState;
    this.onState = onState;
    this.onStatus = onStatus;
    this.onAuthExpired = onAuthExpired;
    this.onVersionGap = onVersionGap;
    this.onDiagnostic = onDiagnostic;
    this.onSynchronized = onSynchronized;
    this.pollMs = Math.max(1000, Number(pollSeconds || 5) * 1000);
    this.reconnectMinMs = reconnectMinMs;
    this.reconnectMaxMs = reconnectMaxMs;
    this.setIntervalFn = setIntervalFn;
    this.clearIntervalFn = clearIntervalFn;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.documentRef = documentRef;
    this.socket = null;
    this.pollTimer = null;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.currentVersion = 0;
    this.recentEventIds = new Map();
    this.destroyed = false;
    this.refreshInFlight = null;
    this.refreshFailures = 0;
    this.socketOpen = false;
    this.subscriptionAcknowledged = false;
    this.canonicalSynchronized = false;
    this.brokerAvailable = null;
    this.connectionMetadata = null;
    this.subscriptionSyncPromise = null;
    this.lastPongAt = 0;
    this.visibilityHandler = () => {
      if (!this.documentRef?.hidden) void this.refreshCanonical("page_visible");
    };
  }

  connect() {
    if (this.destroyed) this.destroyed = false;
    if (this.socket && [0, 1].includes(Number(this.socket.readyState))) return;
    this.onStatus(this.reconnectAttempt > 0 ? "reconnecting" : "connecting");
    let socket;
    try {
      socket = this.socketFactory();
    } catch {
      this.startPollingFallback();
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.onopen = () => void this.handleSocketOpen();
    socket.onmessage = (message) => {
      try {
        const parsed = JSON.parse(message.data);
        if (String(parsed?.type || "").toLowerCase() === "ping") {
          if (this.socket?.readyState === 1) this.socket.send("ping");
          return;
        }
        if (this.handleControlMessage(parsed)) return;
        void this.handleEnvelope(parsed);
      } catch {
        void this.refreshCanonical("invalid_message");
      }
    };
    socket.onerror = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.socketOpen = false;
      this.onStatus("reconnecting");
      this.startPollingFallback();
      this.scheduleReconnect();
    };
    socket.onclose = (event) => {
      if (this.socket && this.socket !== socket) return;
      this.handleSocketClose(event);
    };
    this.documentRef?.addEventListener?.("visibilitychange", this.visibilityHandler);
  }

  async handleSocketOpen() {
    this.reconnectAttempt = 0;
    this.socketOpen = true;
    this.subscriptionAcknowledged = false;
    this.canonicalSynchronized = false;
    this.onStatus("connecting");
    this.startHeartbeat();
    if (this.socket?.readyState === 1) this.socket.send("ping");
  }

  handleControlMessage(message) {
    const type = String(message?.type || "").trim().toLowerCase();
    if (!Number(message?.match_id) || Number(message.match_id) !== this.matchId) return false;
    if (type === "match.subscription.ack") {
      this.subscriptionAcknowledged = true;
      this.connectionMetadata = message;
      this.onDiagnostic(message);
      this.brokerAvailable = message?.transport?.available !== false;
      this.subscriptionSyncPromise = this.synchronizeSubscription("subscription_ack");
      return true;
    }
    if (type === "pong") {
      this.lastPongAt = Date.now();
      const wasUnavailable = this.brokerAvailable === false;
      this.brokerAvailable = message?.transport?.available !== false;
      this.connectionMetadata = { ...(this.connectionMetadata || {}), ...message };
      this.onDiagnostic(this.connectionMetadata);
      if (!this.brokerAvailable) {
        this.canonicalSynchronized = false;
        this.onStatus("reconnecting");
        this.startPollingFallback();
      } else if (wasUnavailable && this.subscriptionAcknowledged) {
        this.subscriptionSyncPromise = this.synchronizeSubscription("broker_recovered");
      }
      return true;
    }
    return false;
  }

  async synchronizeSubscription(reason) {
    try {
      const state = await this.refreshCanonical(reason);
      this.canonicalSynchronized = true;
      this.onSynchronized({
        reason,
        state,
        metadata: this.connectionMetadata,
      });
      if (
        !this.destroyed
        && this.socketOpen
        && this.subscriptionAcknowledged
        && this.brokerAvailable !== false
      ) {
        this.stopPollingFallback();
        this.onStatus("live");
      }
    } catch {
      this.canonicalSynchronized = false;
      this.startPollingFallback();
    }
  }

  handleSocketClose(event = {}) {
    this.stopHeartbeat();
    this.socketOpen = false;
    this.subscriptionAcknowledged = false;
    this.canonicalSynchronized = false;
    this.socket = null;
    if (this.destroyed) return;
    if ([4401, 4403].includes(Number(event?.code))) {
      this.onStatus("auth_required");
      this.onAuthExpired();
      this.stopPollingFallback();
      return;
    }
    this.onStatus("reconnecting");
    this.startPollingFallback();
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.destroyed || this.reconnectTimer) return;
    const base = Math.min(this.reconnectMaxMs, this.reconnectMinMs * (2 ** this.reconnectAttempt));
    const jitter = Math.floor(Math.random() * Math.max(1, base * 0.2));
    this.reconnectAttempt += 1;
    this.reconnectTimer = this.setTimeoutFn?.(() => {
      this.reconnectTimer = null;
      this.connect();
    }, base + jitter);
  }

  async handleEnvelope(raw) {
    const envelope = normalizeRealtimeEnvelope(raw);
    if (!envelope || envelope.matchId !== this.matchId) return;
    const duplicateEvent = this.recentEventIds.has(envelope.eventId);
    const decision = decideRealtimeEvent({
      currentVersion: this.currentVersion,
      incomingVersion: envelope.stateVersion,
      duplicateEvent,
    });
    if (decision.startsWith("ignore")) return;
    this.rememberEvent(envelope.eventId);
    if (decision === "refresh_gap" || envelope.eventType !== "match.state.updated") {
      this.onVersionGap({ currentVersion: this.currentVersion, incomingVersion: envelope.stateVersion });
      await this.refreshCanonical(decision === "refresh_gap" ? "version_gap" : envelope.eventType);
      return;
    }
    const state = envelope.payload?.live_state || envelope.payload;
    this.applyCanonicalState(state);
  }

  rememberEvent(eventId) {
    this.recentEventIds.set(eventId, Date.now());
    while (this.recentEventIds.size > 256) {
      this.recentEventIds.delete(this.recentEventIds.keys().next().value);
    }
  }

  applyCanonicalState(state) {
    if (!state || typeof state !== "object") return;
    const version = safeVersion(state.state_version);
    if (version !== null && version < this.currentVersion) return;
    if (version !== null) this.currentVersion = version;
    this.onState(state);
  }

  async refreshCanonical() {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = Promise.resolve(this.fetchCanonicalState(this.matchId))
      .then((state) => {
        this.refreshFailures = 0;
        this.applyCanonicalState(state);
        return state;
      })
      .catch((error) => {
        this.refreshFailures += 1;
        if (!this.destroyed) {
          if ([401, 403].includes(Number(error?.response?.status))) {
            this.onStatus("auth_required");
            this.onAuthExpired();
          } else {
            this.onStatus(globalThis.navigator?.onLine === false || this.refreshFailures >= 2 ? "offline" : "refresh_mode");
          }
        }
        throw error;
      })
      .finally(() => { this.refreshInFlight = null; });
    return this.refreshInFlight;
  }

  startPollingFallback() {
    if (this.destroyed || this.pollTimer) return;
    this.onStatus("refresh_mode");
    void this.refreshCanonical("poll_start").catch(() => {});
    this.pollTimer = this.setIntervalFn?.(() => {
      if (!this.documentRef?.hidden) void this.refreshCanonical("poll").catch(() => {});
    }, this.pollMs);
  }

  stopPollingFallback() {
    if (this.pollTimer) this.clearIntervalFn?.(this.pollTimer);
    this.pollTimer = null;
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = this.setIntervalFn?.(() => {
      if (this.socket?.readyState === 1) {
        if (this.lastPongAt && Date.now() - this.lastPongAt > 70000) {
          this.onStatus("reconnecting");
          this.socket.close();
          return;
        }
        this.socket.send("ping");
      }
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) this.clearIntervalFn?.(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  disconnect() {
    this.destroyed = true;
    this.stopPollingFallback();
    this.stopHeartbeat();
    if (this.reconnectTimer) this.clearTimeoutFn?.(this.reconnectTimer);
    this.reconnectTimer = null;
    this.documentRef?.removeEventListener?.("visibilitychange", this.visibilityHandler);
    const socket = this.socket;
    this.socket = null;
    this.socketOpen = false;
    this.subscriptionAcknowledged = false;
    this.canonicalSynchronized = false;
    if (socket) socket.close();
    this.onStatus("disconnected");
  }
}
