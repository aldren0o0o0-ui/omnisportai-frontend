import api from "../api/axios";

export const submitApplication = async (payload) => {
  const res = await api.post("/team-applications", payload);
  return res.data;
};

export const uploadMedicalCertificate = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/team-applications/medical-certificate", formData);
  return res.data;
};

export const attachMedicalCertificate = async (applicationId, fileUrl) => {
  const res = await api.patch(`/team-applications/${applicationId}/medical-certificate`, {
    file_url: fileUrl,
  });
  return res.data;
};

export const confirmAcceptedApplicationAsPlayer = async (applicationId) => {
  const res = await api.post(`/team-applications/${applicationId}/confirm-player`);
  return res.data;
};

export const finalizeTeamRoster = async (teamId, tournamentId, selectedApplicationIds) => {
  const res = await api.post(
    `/teams/${Number(teamId)}/finalize-roster`,
    { selected_application_ids: selectedApplicationIds.map(Number) },
    { params: { tournament_id: Number(tournamentId) } }
  );
  return res.data;
};

export const reviewMedicalCertificate = async (applicationId, payload) => {
  const res = await api.patch(`/team-applications/${applicationId}/medical-certificate/review`, payload);
  return res.data;
};

export const getTeamTryoutSchedule = async (teamId, tournamentId = null) => {
  const res = await api.get(`/teams/${teamId}/tryout-schedule`, {
    params: { ...(tournamentId ? { tournament_id: Number(tournamentId) } : {}) },
  });
  return res.data;
};

export const publishTeamTryoutSchedule = async (teamId, payload) => {
  const res = await api.post(`/teams/${teamId}/tryout-schedule`, payload);
  return res.data;
};

export const setTryoutReminder = async ({ tryoutScheduleId }) => {
  const res = await api.post("/tryout-reminders", {
    tryout_schedule_id: Number(tryoutScheduleId),
  });
  return res.data;
};

export const getMyApplications = async () => {
  const res = await api.get("/team-applications/me");
  return res.data;
};

export const getCoachApplications = async (status = "ALL", tournamentId = null) => {
  const res = await api.get("/coach/team-applications", {
    params: {
      status,
      ...(tournamentId ? { tournament_id: Number(tournamentId) } : {}),
    },
  });
  return res.data;
};

export const getTeamApplications = async (teamId, status = null, tournamentId = null) => {
  const params = {};
  if (status) params.status = status;
  if (tournamentId) params.tournament_id = Number(tournamentId);
  const res = await api.get(`/teams/${teamId}/applications`, { params });
  return res.data;
};

export const getApplication = async (applicationId) => {
  const res = await api.get(`/team-applications/${applicationId}`);
  return res.data;
};

export const updateApplicationStatus = async (applicationId, payload) => {
  const res = await api.patch(`/team-applications/${applicationId}/status`, payload);
  return res.data;
};

export const cancelApplication = async (applicationId) => {
  const res = await api.post(`/team-applications/${applicationId}/cancel`);
  return res.data;
};

export const getDecisionLogs = async (applicationId) => {
  const res = await api.get(`/team-applications/${applicationId}/decision-logs`);
  return res.data;
};
