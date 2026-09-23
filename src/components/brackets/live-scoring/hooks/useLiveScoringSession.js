import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createMatchEvent,
  createMatchEventsSocket,
  getMatchBackendRuntime,
  getMatchLiveState,
  undoLastMatchEvent,
} from "../../../../services/matchEventService";
import { MatchRealtimeClient } from "../../../../services/realtime/realtimeClient";
import { deriveSessionAuthority } from "../sessionSelectors.js";

const isAuthFailure = (error) => Number(error?.response?.status || 0) === 401;

export const useLiveScoringSession = ({ matchId, onLiveState, onConfigRecovery }) => {
  const realtimeClientRef = useRef(null);
  const liveStateRef = useRef(null);
  const onLiveStateRef = useRef(onLiveState);
  const onConfigRecoveryRef = useRef(onConfigRecovery);
  const [liveState, setLiveState] = useState(null);
  const [lastLiveSyncAt, setLastLiveSyncAt] = useState(null);
  const [socketStatus, setSocketStatus] = useState("disconnected");
  const [reconnectKey, setReconnectKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [blockingSessionError, setBlockingSessionError] = useState("");

  useEffect(() => { onLiveStateRef.current = onLiveState; }, [onLiveState]);
  useEffect(() => { onConfigRecoveryRef.current = onConfigRecovery; }, [onConfigRecovery]);

  const replaceAuthoritativeState = useCallback((nextState) => {
    if (!nextState) return;
    liveStateRef.current = nextState;
    if (realtimeClientRef.current) {
      realtimeClientRef.current.currentVersion = Number(nextState?.state_version || 0);
    }
    setLiveState(nextState);
    setLastLiveSyncAt(new Date().toISOString());
    setBlockingSessionError("");
    if (typeof onLiveStateRef.current === "function") {
      onLiveStateRef.current(Number(matchId), nextState);
    }
  }, [matchId]);

  useEffect(() => {
    liveStateRef.current = null;
    setLiveState(null);
    setLastLiveSyncAt(null);
    setSocketStatus("disconnected");
    setBlockingSessionError("");
    setIsSubmitting(false);
    setIsUndoing(false);
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return undefined;
    const client = new MatchRealtimeClient({
      matchId,
      socketFactory: () => createMatchEventsSocket(matchId),
      fetchCanonicalState: getMatchLiveState,
      onState: replaceAuthoritativeState,
      onStatus: setSocketStatus,
      onSynchronized: () => onConfigRecoveryRef.current?.(),
      onDiagnostic: (metadata) => {
        if (import.meta.env.DEV || import.meta.env.VITE_REALTIME_DEBUG === "true") {
          const runtime = getMatchBackendRuntime();
          console.info("[LIVE REALTIME]", {
            rest_origin: runtime.apiBaseUrl,
            websocket_origin: runtime.webSocketBaseUrl,
            worker_id: metadata?.worker_id || null,
            transport_mode: metadata?.transport?.mode || null,
            match_id: Number(matchId),
            connection_state: metadata?.type || null,
            state_version: Number(liveStateRef.current?.state_version || 0),
          });
        }
      },
      pollSeconds: Number(import.meta.env.VITE_REALTIME_FALLBACK_POLL_SECONDS || 5),
    });
    realtimeClientRef.current = client;
    client.currentVersion = Number(liveStateRef.current?.state_version || 0);
    client.connect();
    return () => {
      client.disconnect();
      if (realtimeClientRef.current === client) realtimeClientRef.current = null;
    };
  }, [matchId, reconnectKey, replaceAuthoritativeState]);

  const refresh = useCallback(async () => {
    if (!matchId) return null;
    try {
      const nextState = await getMatchLiveState(matchId);
      replaceAuthoritativeState(nextState);
      return nextState;
    } catch (error) {
      if (isAuthFailure(error)) {
        setSocketStatus("auth_required");
        setBlockingSessionError("Sign in is required before scoring can continue.");
      }
      throw error;
    }
  }, [matchId, replaceAuthoritativeState]);

  const reconnect = useCallback(() => {
    realtimeClientRef.current?.disconnect();
    setReconnectKey((current) => current + 1);
  }, []);

  const submitEvent = useCallback(async (payload) => {
    if (!matchId || socketStatus === "auth_required") {
      throw new Error("Scoring authority is unavailable.");
    }
    setIsSubmitting(true);
    try {
      const response = await createMatchEvent(matchId, payload);
      if (response?.live_state) replaceAuthoritativeState(response.live_state);
      return response;
    } catch (error) {
      if (isAuthFailure(error)) {
        setSocketStatus("auth_required");
        setBlockingSessionError("Sign in is required before scoring can continue.");
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [matchId, replaceAuthoritativeState, socketStatus]);

  const undoLastAction = useCallback(async () => {
    if (!matchId || socketStatus === "auth_required") {
      throw new Error("Scoring authority is unavailable.");
    }
    setIsUndoing(true);
    try {
      const response = await undoLastMatchEvent(matchId);
      if (response?.live_state) replaceAuthoritativeState(response.live_state);
      return response;
    } catch (error) {
      if (isAuthFailure(error)) {
        setSocketStatus("auth_required");
        setBlockingSessionError("Sign in is required before scoring can continue.");
      }
      throw error;
    } finally {
      setIsUndoing(false);
    }
  }, [matchId, replaceAuthoritativeState, socketStatus]);

  const connectionStatus = useMemo(() => String(socketStatus || "disconnected").toUpperCase(), [socketStatus]);
  const authority = deriveSessionAuthority({ socketStatus, isSubmitting, isUndoing });

  return {
    liveState,
    liveStateRef,
    lastLiveSyncAt,
    socketStatus,
    connectionStatus,
    isAuthenticatedForScoring: authority.isAuthenticatedForScoring,
    isConnectionHealthy: socketStatus === "live",
    blockingSessionError,
    isSubmitting,
    isUndoing,
    canSubmitSessionActions: authority.canSubmitSessionActions,
    replaceAuthoritativeState,
    refresh,
    reconnect,
    submitEvent,
    undoLastAction,
  };
};

export default useLiveScoringSession;
