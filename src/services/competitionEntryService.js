import api from "../api/axios";

export const listEntries = async (filters = {}) => {
  const params = {};
  const tournamentId = filters.tournamentId ?? filters.tournament_id;
  const sportId = filters.sportId ?? filters.sport_id;
  const departmentId = filters.departmentId ?? filters.department_id;
  const tournamentSportEventId =
    filters.tournamentSportEventId ?? filters.tournament_sport_event_id;
  const status = filters.status;
  const participantShape = filters.participantShape ?? filters.participant_shape;

  if (tournamentId) params.tournament_id = Number(tournamentId);
  if (sportId) params.sport_id = Number(sportId);
  if (departmentId) params.department_id = Number(departmentId);
  if (tournamentSportEventId) {
    params.tournament_sport_event_id = Number(tournamentSportEventId);
  }
  if (status) params.status = String(status).trim().toUpperCase();
  if (participantShape) {
    params.participant_shape = String(participantShape).trim().toUpperCase();
  }
  const res = await api.get("/competition-entries", { params });
  return res.data;
};

export const getEntry = async (entryId) => {
  const res = await api.get(`/competition-entries/${entryId}`);
  return res.data;
};

export const createEntry = async (payload) => {
  const res = await api.post("/competition-entries", payload);
  return res.data;
};

export const updateEntry = async (entryId, payload) => {
  const res = await api.patch(`/competition-entries/${entryId}`, payload);
  return res.data;
};

export const updateEntryIdentity = async (entryId, payload) => {
  const res = await api.patch(`/competition-entries/${entryId}/identity`, payload);
  return res.data;
};

export const submitEntry = async (entryId) => {
  const res = await api.post(`/competition-entries/${entryId}/submit`);
  return res.data;
};

export const uploadEntryLogo = async (entryId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return (await api.post(`/competition-entries/${entryId}/logo`, formData)).data;
};

export const removeEntryLogo = async (entryId) => (await api.delete(`/competition-entries/${entryId}/logo`)).data;

export const approveEntry = async (entryId, payload = {}) => {
  const res = await api.post(`/competition-entries/${entryId}/approve`, payload);
  return res.data;
};

export const rejectEntry = async (entryId, payload = {}) => {
  const res = await api.post(`/competition-entries/${entryId}/reject`, payload);
  return res.data;
};

export const requestEntryChanges = async (entryId, payload = {}) => {
  const res = await api.post(`/competition-entries/${entryId}/request-changes`, payload);
  return res.data;
};

export const getSportEntryReadiness = async (
  tournamentId,
  sportId,
  tournamentSportEventId = null
) => {
  const params = {
    tournament_id: tournamentId,
    sport_id: sportId,
  };
  if (tournamentSportEventId) {
    params.tournament_sport_event_id = Number(tournamentSportEventId);
  }
  const res = await api.get("/competition-entries/readiness", {
    params,
  });
  return res.data;
};

export const getTournamentEntryReadiness = async (tournamentId) => {
  const res = await api.get(`/competition-entries/readiness/tournament/${tournamentId}`);
  return res.data;
};
