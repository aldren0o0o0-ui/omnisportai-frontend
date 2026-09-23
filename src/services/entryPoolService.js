import api from "../api/axios";

export const getVisibleEntryPools = async (tournamentId = null) => {
  const params = {};
  if (tournamentId) params.tournament_id = Number(tournamentId);
  const res = await api.get("/entry-pools/visible", { params });
  return res.data;
};

export const getCoachEntryPools = async (tournamentId = null) => {
  const params = {};
  if (tournamentId) params.tournament_id = Number(tournamentId);
  const res = await api.get("/entry-pools/coach", { params });
  return res.data;
};

export const applyToEntryPool = async (poolId, payload = {}) => {
  const res = await api.post(`/entry-pools/${poolId}/apply`, payload);
  return res.data;
};

export const getEntryPoolApplications = async (poolId) => {
  const res = await api.get(`/entry-pools/${poolId}/applications`);
  return res.data;
};

export const updateEntryPoolApplicationDecision = async (applicationId, payload) => {
  const res = await api.patch(`/entry-pools/applications/${applicationId}/decision`, payload);
  return res.data;
};

export const confirmEntryPoolApplicationAsPlayer = async (applicationId) => {
  const res = await api.post(`/entry-pools/applications/${applicationId}/confirm-player`);
  return res.data;
};

export const attachEntryPoolMedicalCertificate = async (applicationId, fileUrl) => {
  const res = await api.patch(`/entry-pools/applications/${applicationId}/medical-certificate`, {
    file_url: fileUrl,
  });
  return res.data;
};

export const reviewEntryPoolMedicalCertificate = async (applicationId, payload) => {
  const res = await api.patch(`/entry-pools/applications/${applicationId}/medical-certificate/review`, payload);
  return res.data;
};

export const cancelEntryPoolApplication = async (applicationId) => {
  const res = await api.post(`/entry-pools/applications/${applicationId}/cancel`);
  return res.data;
};

export const updateEntryPoolState = async (poolId, payload) => {
  const res = await api.patch(`/entry-pools/${poolId}/state`, payload);
  return res.data;
};

export const finalizeEntryPoolSelection = async (poolId, payload) => {
  const res = await api.post(`/entry-pools/${poolId}/finalize-selection`, payload);
  return res.data;
};

export const finalizeEntryPoolCandidates = async (poolId, selectedApplicationIds) => {
  const res = await api.post(`/entry-pools/${Number(poolId)}/finalize-candidates`, {
    selected_application_ids: selectedApplicationIds.map(Number),
  });
  return res.data;
};

export const getEntryPoolTryoutSchedule = async (poolId) => {
  const res = await api.get(`/entry-pools/${poolId}/tryout-schedule`);
  return res.data;
};

export const publishEntryPoolTryoutSchedule = async (poolId, payload) => {
  const res = await api.post(`/entry-pools/${poolId}/tryout-schedule`, payload);
  return res.data;
};
