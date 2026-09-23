import api from "../api/axios";

export const getTeams = async (
  departmentId = null,
  tournamentId = null,
  { includeArchived = false, archiveState = "active" } = {}
) => {
  const params = {};
  if (departmentId) params.department_id = departmentId;
  if (tournamentId) params.tournament_id = Number(tournamentId);
  if (includeArchived) params.include_archived = true;
  if (archiveState) params.archive_state = archiveState;
  const res = await api.get("/teams", { params });
  return res.data;
};

export const createTeam = async (payload) => {
  const res = await api.post("/teams", payload);
  return res.data;
};

export const submitCoachTeam = async (payload) => {
  const res = await api.post("/teams/coach-submit", payload);
  return res.data;
};

export const submitTournamentTeamRegistration = async (tournamentId, payload) => {
  const res = await api.post(`/tournaments/${tournamentId}/team-registrations`, payload);
  return res.data;
};

export const getTournamentTeamRegistrations = async (
  tournamentId,
  { status = "ALL", sportId = null, departmentId = null, search = "", page = 1, limit = 20 } = {}
) => {
  const params = { status, page, limit };
  if (sportId) params.sport_id = Number(sportId);
  if (departmentId) params.department_id = Number(departmentId);
  if (search && String(search).trim()) params.search = String(search).trim();
  const res = await api.get(`/tournaments/${tournamentId}/team-registrations`, { params });
  return res.data;
};

export const getTournamentTeamRegistrationDetail = async (tournamentId, registrationId) => {
  const res = await api.get(`/tournaments/${tournamentId}/team-registrations/${registrationId}`);
  return res.data;
};

export const getTeamRegistrationReadiness = async (tournamentId, teamId) => {
  const res = await api.get(`/tournaments/${tournamentId}/team-registrations/readiness`, {
    params: { team_id: Number(teamId) },
  });
  return res.data;
};

export const reviewTournamentTeamRegistration = async (tournamentId, registrationId, payload) => {
  const res = await api.patch(
    `/tournaments/${tournamentId}/team-registrations/${registrationId}/review`,
    payload
  );
  return res.data;
};

export const resubmitTournamentTeamRegistration = async (tournamentId, registrationId, payload) => {
  const res = await api.patch(
    `/tournaments/${tournamentId}/team-registrations/${registrationId}/resubmit`,
    payload
  );
  return res.data;
};

export const updateTournamentTeamRegistrationSlot = async (tournamentId, registrationId, payload) => {
  const res = await api.patch(
    `/tournaments/${tournamentId}/team-registrations/${registrationId}/slot-settings`,
    payload
  );
  return res.data;
};

export const getMyTeamSubmissions = async () => {
  const res = await api.get("/teams/my-submissions");
  return res.data;
};

export const updateTeam = async (teamId, payload) => {
  const res = await api.put(`/teams/${teamId}`, payload);
  return res.data;
};

export const assignTeamCoach = async (teamId, coachId) => {
  const res = await api.patch(`/teams/${teamId}/assign-coach`, { coach_id: coachId });
  return res.data;
};

export const getTeamStaff = async (teamId) => {
  const res = await api.get(`/teams/${teamId}/staff`);
  return res.data;
};

export const getTeamPlayers = async (teamId) => {
  const res = await api.get(`/teams/${teamId}/players`);
  return res.data;
};

export const getTeamRoster = async (teamId, tournamentId = null) => {
  const params = {};
  if (tournamentId) params.tournament_id = Number(tournamentId);
  const res = await api.get(`/teams/${teamId}/roster`, { params });
  return res.data;
};

export const addTeamStaff = async (teamId, payload) => {
  const res = await api.post(`/teams/${teamId}/staff`, payload);
  return res.data;
};

export const deleteTeam = async (teamId) => {
  const res = await api.delete(`/teams/${teamId}`);
  return res.data;
};

export const getTeamDeleteImpact = async (teamId) => {
  const res = await api.get(`/teams/${teamId}/delete-impact`);
  return res.data;
};

export const archiveTeam = async (teamId, reason = "") => {
  const params = {};
  if (reason && String(reason).trim()) params.reason = String(reason).trim();
  const res = await api.patch(`/teams/${teamId}/archive`, null, { params });
  return res.data;
};

export const restoreTeam = async (teamId) => {
  const res = await api.patch(`/teams/${teamId}/restore`);
  return res.data;
};

export const getViewerApplicationTeams = async (tournamentId = null) => {
  const params = {};
  if (tournamentId) params.tournament_id = Number(tournamentId);
  const res = await api.get("/teams/viewer/application-teams", { params });
  return res.data;
};

export const applyToTeam = async (teamId, tournamentId = null) => {
  const payload = tournamentId ? { tournament_id: Number(tournamentId) } : {};
  const res = await api.post(`/teams/${teamId}/applications`, payload);
  return res.data;
};

export const getMyTeamApplications = async () => {
  const res = await api.get("/teams/my-applications");
  return res.data;
};

export const getCoachPlayerApplications = async (status = "PENDING") => {
  const res = await api.get("/teams/coach/player-applications", {
    params: { status }
  });
  return res.data;
};

export const updatePlayerApplicationStatus = async (applicationId, status) => {
  const res = await api.patch(`/teams/player-applications/${applicationId}/status`, { status });
  return res.data;
};

export const uploadTeamLogo = async (teamId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/teams/${teamId}/logo`, formData);
  return res.data;
};

export const removeTeamLogo = async (teamId) => {
  const res = await api.delete(`/teams/${teamId}/logo`);
  return res.data;
};
