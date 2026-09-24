import api from "../api/axios";

export const getTournaments = async (options = {}) => {
  const params = {};
  if (options.includeArchived) params.include_archived = true;
  if (options.allWorkspaces) params.all_workspaces = true;
  // When provided, scope to a specific intramural (workspace). Omitted → the
  // backend defaults to the currently ACTIVE workspace (unchanged behavior).
  if (options.workspaceId != null && options.workspaceId !== "") {
    params.workspace_id = options.workspaceId;
  }

  const res = await api.get("/tournaments", { params });
  return res.data;
};

export const createTournament = async (data) => {

  const res = await api.post("/tournaments/", data);

  return res.data;

};

export const updateTournament = async (tournamentId, payload) => {
  const res = await api.put(`/tournaments/${tournamentId}`, payload);
  return res.data;
};

export const previewTournamentDateShift = async (tournamentId, { startDate, endDate }) => {
  const res = await api.put(`/tournaments/${tournamentId}`, {
    preview_only: true,
    start_date: startDate,
    end_date: endDate,
  });
  return res.data;
};

export const getTournamentRegistrationTargetSummary = async (tournamentId) => {
  const res = await api.get(`/tournaments/${tournamentId}/registration-target-summary`);
  return res.data;
};

export const refreshTournamentRegistrationTargets = async (tournamentId) => {
  const res = await api.post(`/tournaments/${tournamentId}/refresh-registration-targets`);
  return res.data;
};

export const getTournamentVenues = async (tournamentId) => {
  const res = await api.get(`/tournaments/${tournamentId}/venues`);
  return res.data;
};

export const replaceTournamentVenues = async (tournamentId, venueIds) => {
  const res = await api.put(`/tournaments/${tournamentId}/venues`, {
    venue_ids: Array.isArray(venueIds) ? venueIds : [],
  });
  return res.data;
};

export const getTournamentVenueAvailabilityPreview = async (tournamentId, venueIds = null) => {
  const params = {};
  if (Array.isArray(venueIds) && venueIds.length > 0) {
    params.venue_ids = venueIds;
  }
  const res = await api.get(`/tournaments/${tournamentId}/venue-availability-preview`, { params });
  return res.data;
};

export const archiveTournament = async (tournamentId) => {
  const res = await api.patch(`/tournaments/${tournamentId}/archive`);
  return res.data;
};

export const restoreTournament = async (tournamentId) => {
  const res = await api.patch(`/tournaments/${tournamentId}/restore`);
  return res.data;
};

export const startTournament = async (tournamentId) => {
  const res = await api.patch(`/tournaments/${tournamentId}/start`);
  return res.data;
};

export const deleteTournament = async (tournamentId, options = {}) => {
  const params = {};
  if (options.dryRun) params.dry_run = true;
  if (options.force) params.force = true;

  const res = await api.delete(`/tournaments/${tournamentId}`, { params });
  return res.data;
};

export const permanentlyDeleteTournament = async (
  tournamentId,
  { confirmationText, deleteOrphanTeams = false } = {}
) => {
  const res = await api.post(`/tournaments/${tournamentId}/permanent-delete`, {
    confirmation_text: confirmationText,
    delete_orphan_teams: Boolean(deleteOrphanTeams),
  });
  return res.data;
};

export const getTournamentProgramBlocks = async (tournamentId) => {
  const res = await api.get(`/tournaments/${tournamentId}/program-blocks`);
  return res.data;
};

export const createTournamentProgramBlock = async (tournamentId, payload) => {
  const res = await api.post(`/tournaments/${tournamentId}/program-blocks`, payload);
  return res.data;
};

export const updateTournamentProgramBlock = async (tournamentId, blockId, payload) => {
  const res = await api.patch(`/tournaments/${tournamentId}/program-blocks/${blockId}`, payload);
  return res.data;
};

export const deleteTournamentProgramBlock = async (tournamentId, blockId) => {
  const res = await api.delete(`/tournaments/${tournamentId}/program-blocks/${blockId}`);
  return res.data;
};

// --- Tournament-specific coach assignments ---

export const getDepartmentCoachAssignments = async (tournamentId) => {
  const res = await api.get(`/tournaments/${tournamentId}/department-coach-assignments`);
  return res.data;
};

export const assignDepartmentCoach = async (tournamentId, targetType, targetId, coachId, extraPayload = {}) => {
  const res = await api.patch(
    `/tournaments/${tournamentId}/department-coach-assignments/${targetType}/${targetId}`,
    { coach_id: coachId ?? null, ...extraPayload }
  );
  return res.data;
};

export const getEligibleCoaches = async (tournamentId, { departmentId = null, sportId = null } = {}) => {
  const params = {};
  if (departmentId) params.department_id = Number(departmentId);
  if (sportId) params.sport_id = Number(sportId);
  const res = await api.get(`/tournaments/${tournamentId}/eligible-coaches`, { params });
  return res.data;
};

export const getMyTournamentAccess = async (tournamentId) => {
  if (tournamentId === null || tournamentId === undefined || tournamentId === "") {
    return {
      tournament_id: null,
      effective_mode: "",
      global_roles: [],
      tournament_roles: [],
      role_contexts: [],
      permissions: [],
      viewer_permissions: [],
    };
  }
  const res = await api.get(`/tournaments/${tournamentId}/my-access`);
  return res.data;
};

export const listAssistantCoaches = async (tournamentId, filters = {}) => {
  const params = {};
  if (filters.department_id ?? filters.departmentId) {
    params.department_id = Number(filters.department_id ?? filters.departmentId);
  }
  if (filters.sport_id ?? filters.sportId) {
    params.sport_id = Number(filters.sport_id ?? filters.sportId);
  }
  const tournamentSportEventId =
    filters.tournament_sport_event_id ?? filters.tournamentSportEventId;
  if (tournamentSportEventId !== null && tournamentSportEventId !== undefined && tournamentSportEventId !== "") {
    params.tournament_sport_event_id = Number(tournamentSportEventId);
  }
  if (filters.target_type ?? filters.targetType) {
    params.target_type = String(filters.target_type ?? filters.targetType);
  }
  if (filters.target_id ?? filters.targetId) {
    params.target_id = Number(filters.target_id ?? filters.targetId);
  }
  const res = await api.get(`/tournaments/${tournamentId}/assistant-coaches`, { params });
  return res.data;
};

export const createAssistantCoach = async (tournamentId, payload) => {
  const res = await api.post(`/tournaments/${tournamentId}/assistant-coaches`, payload);
  return res.data;
};

export const updateAssistantCoach = async (tournamentId, assignmentId, payload) => {
  const res = await api.patch(
    `/tournaments/${tournamentId}/assistant-coaches/${assignmentId}`,
    payload
  );
  return res.data;
};

export const removeAssistantCoach = async (tournamentId, assignmentId) => {
  const res = await api.delete(`/tournaments/${tournamentId}/assistant-coaches/${assignmentId}`);
  return res.data;
};
