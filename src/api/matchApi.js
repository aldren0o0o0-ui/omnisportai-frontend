import api from "./axios";
import { getAccessToken } from "./tokenStore";
import { BACKEND_RUNTIME_URLS } from "./realtimeUrl";

const WS_BASE_URL = BACKEND_RUNTIME_URLS.webSocketBaseUrl;

export const getMatchEventConfig = async (matchId) => {
  const res = await api.get(`/matches/${matchId}/events/config`);
  return res.data;
};

export const getMatchById = async (matchId) => {
  const res = await api.get(`/matches/${matchId}`);
  return res.data;
};

export const getMatchEvents = async (matchId) => {
  const res = await api.get(`/matches/${matchId}/events`);
  return res.data;
};

export const getMatchLiveState = async (matchId) => {
  const res = await api.get(`/matches/${matchId}/events/live`);
  return res.data;
};

export const getLiveMatchViewer = async (matchId) => {
  const res = await api.get(`/matches/${matchId}/viewer`);
  return res.data;
};

export const getLiveMatchViewerActions = async (matchId, params = {}) => {
  const res = await api.get(`/matches/${matchId}/viewer/actions`, { params });
  return res.data;
};

export const getMatchReplay = async (matchId, params = {}) => {
  const res = await api.get(`/matches/${matchId}/replay`, { params });
  return res.data;
};

export const getMatchTimeline = async (matchId, params = {}) => {
  const res = await api.get(`/matches/${matchId}/timeline`, { params });
  return res.data;
};

export const createMatchEvent = async (matchId, payload) => {
  const res = await api.post(`/matches/${matchId}/events`, payload);
  return res.data;
};

export const deleteMatchEvent = async (matchId, eventId) => {
  const res = await api.delete(`/matches/${matchId}/events/${eventId}`);
  return res.data;
};

export const undoLastMatchEvent = async (matchId) => {
  const res = await api.post(`/matches/${matchId}/events/undo`);
  return res.data;
};

export const migrateMatchTemplate = async (matchId, payload) => {
  const res = await api.post(`/matches/${matchId}/migrate-template`, payload);
  return res.data;
};

export const createMatchEventsSocket = (matchId) => {
  const token = getAccessToken();
  if (!token) {
    const error = new Error("WebSocket authentication is not ready.");
    error.code = "WEBSOCKET_AUTH_NOT_READY";
    throw error;
  }
  const params = `?token=${encodeURIComponent(token)}`;
  return new WebSocket(`${WS_BASE_URL}/matches/${matchId}/events/ws${params}`);
};

export const getMatchBackendRuntime = () => ({ ...BACKEND_RUNTIME_URLS });
