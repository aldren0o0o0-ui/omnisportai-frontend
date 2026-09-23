import api from "../api/axios";
import { getAccessToken } from "../api/tokenStore";
import { BACKEND_RUNTIME_URLS } from "../api/realtimeUrl";

export const searchGlobal = async ({
  query,
  type = "all",
  limit = 8,
  sportId = null,
  tournamentId = null,
} = {}) => {
  const params = {
    q: query,
    type,
    limit,
  };
  if (sportId) params.sport_id = sportId;
  if (tournamentId) params.tournament_id = tournamentId;

  const res = await api.get("/search", { params });
  return res.data;
};

export const getLeaderboards = async ({
  type = "all",
  metric = null,
  sportId = null,
  tournamentId = null,
  limit = 10,
} = {}) => {
  const params = {
    type,
    limit,
  };
  if (metric) params.metric = metric;
  if (sportId) params.sport_id = sportId;
  if (tournamentId) params.tournament_id = tournamentId;

  const res = await api.get("/leaderboards", { params });
  return res.data;
};

export const createLeaderboardSocket = ({ tournamentId = null, workspaceId = null } = {}) => {
  const token = getAccessToken();
  if (!token) throw new Error("WebSocket authentication is not ready.");
  const params = new URLSearchParams({ token });
  if (tournamentId) params.set("tournament_id", String(tournamentId));
  else if (workspaceId) params.set("workspace_id", String(workspaceId));
  else throw new Error("A leaderboard realtime scope is required.");
  return new WebSocket(`${BACKEND_RUNTIME_URLS.webSocketBaseUrl}/leaderboards/ws?${params}`);
};

export const getMatchSummary = async (matchId) => {
  const res = await api.get(`/matches/${matchId}/summary`);
  return res.data;
};

export const generateMatchSummary = async (matchId, { forceRegenerate = false } = {}) => {
  const res = await api.post(`/matches/${matchId}/generate-summary`, {
    force_regenerate: forceRegenerate,
  });
  return res.data;
};
