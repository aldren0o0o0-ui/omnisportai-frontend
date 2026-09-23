import api from "../api/axios";

export const getMyPlayerStats = async ({ sportId = null } = {}) => {
  const params = {};
  if (sportId !== null && sportId !== undefined && sportId !== "") {
    params.sport_id = sportId;
  }
  const res = await api.get("/player-stats/me", { params });
  return res.data;
};

export const getMatchPlayerStats = async (matchId) => {
  const res = await api.get(`/player-stats/matches/${matchId}`);
  return res.data;
};

export const upsertMatchPlayerStats = async ({
  matchId,
  playerId,
  payload,
}) => {
  const res = await api.put(
    `/player-stats/matches/${matchId}/players/${playerId}`,
    payload
  );
  return res.data;
};

