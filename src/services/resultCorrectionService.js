import api from "../api/axios";

export const getCorrectionContext = async (matchId) => {
  const response = await api.get(`/result-corrections/matches/${Number(matchId)}/context`);
  return response.data;
};

export const getMatchCorrectionHistory = async (matchId) => {
  const response = await api.get(`/result-corrections/matches/${Number(matchId)}`);
  return response.data;
};

export const getCorrectionQueue = async (filters = {}) => {
  const params = {};
  if (filters.tournamentId) params.tournament_id = Number(filters.tournamentId);
  if (filters.sportId) params.sport_id = Number(filters.sportId);
  if (filters.eventId) params.tournament_sport_event_id = Number(filters.eventId);
  if (filters.status) params.status = filters.status;
  const response = await api.get("/result-corrections/queue", { params });
  return response.data;
};

export const createCorrectionRequest = async (matchId, payload) => {
  const response = await api.post(`/result-corrections/matches/${Number(matchId)}`, payload);
  return response.data;
};

export const previewCorrection = async (correctionId) => {
  const response = await api.post(`/result-corrections/${Number(correctionId)}/preview`);
  return response.data;
};

export const submitCorrection = async (correctionId, rowVersion) => {
  const response = await api.post(`/result-corrections/${Number(correctionId)}/submit`, { row_version: Number(rowVersion) });
  return response.data;
};

export const approveCorrection = async (correctionId, rowVersion, reviewNote = "") => {
  const response = await api.post(`/result-corrections/${Number(correctionId)}/approve`, {
    row_version: Number(rowVersion),
    review_note: reviewNote || null,
  });
  return response.data;
};

export const rejectCorrection = async (correctionId, rowVersion, reviewNote) => {
  const response = await api.post(`/result-corrections/${Number(correctionId)}/reject`, {
    row_version: Number(rowVersion),
    review_note: reviewNote,
  });
  return response.data;
};

export const applyCorrection = async (correction) => {
  const response = await api.post(`/result-corrections/${Number(correction.id)}/apply`, {
    row_version: Number(correction.row_version),
    source_match_state_version: Number(correction.source_match_state_version),
    idempotency_key: globalThis.crypto?.randomUUID?.() || `correction-${correction.id}-${Date.now()}`,
  });
  return response.data;
};

