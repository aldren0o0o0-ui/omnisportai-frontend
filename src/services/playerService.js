import api from "../api/axios";

export const getPlayers = async ({
  teamId = null,
  query = "",
  includeArchived = false,
  archiveState = "active"
} = {}) => {
  const params = {};
  if (teamId) params.team_id = Number(teamId);
  if (query && String(query).trim()) params.q = String(query).trim();
  if (includeArchived) params.include_archived = true;
  if (archiveState) params.archive_state = archiveState;
  const res = await api.get("/players", { params });
  return res.data;
};

export const createPlayer = async (payload) => {
  const res = await api.post("/players", payload);
  return res.data;
};

export const updatePlayer = async (playerId, payload) => {
  const res = await api.put(`/players/${playerId}`, payload);
  return res.data;
};

export const deletePlayer = async (playerId) => {
  const res = await api.delete(`/players/${playerId}`);
  return res.data;
};

export const getPlayerDeleteImpact = async (playerId) => {
  const res = await api.get(`/players/${playerId}/delete-impact`);
  return res.data;
};

export const archivePlayer = async (playerId, reason = "") => {
  const params = {};
  if (reason && String(reason).trim()) params.reason = String(reason).trim();
  const res = await api.patch(`/players/${playerId}/archive`, null, { params });
  return res.data;
};

export const restorePlayer = async (playerId) => {
  const res = await api.patch(`/players/${playerId}/restore`);
  return res.data;
};

export const assignPlayerToTeam = async (playerId, teamId, payload = {}) => {
  const res = await api.post(`/players/${playerId}/teams/${teamId}`, payload);
  return res.data;
};

export const removePlayerFromTeam = async (playerId, teamId, options = {}) => {
  const params = {};
  if (options.tournamentId) params.tournament_id = Number(options.tournamentId);
  const res = await api.delete(`/players/${playerId}/teams/${teamId}`, { params });
  return res.data;
};

export const uploadPlayerProfileImage = async (playerId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/players/${playerId}/profile-image`, formData);
  return res.data;
};

export const removePlayerProfileImage = async (playerId) => {
  const res = await api.delete(`/players/${playerId}/profile-image`);
  return res.data;
};
