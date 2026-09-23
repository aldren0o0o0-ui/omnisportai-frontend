import api from "../api/axios";

export const getCompetitionDirectory = async ({
  workspaceId,
  tournamentId,
  departmentId = null,
  sportId = null,
  participantShape = "",
  search = "",
  page = 1,
  pageSize = 20,
  includeMembers = false,
}) => {
  const normalizedWorkspaceId = Number(workspaceId);
  const normalizedTournamentId = Number(tournamentId);
  if (!Number.isFinite(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
    throw new Error("A valid selected Intramural workspace is required.");
  }
  if (!Number.isFinite(normalizedTournamentId) || normalizedTournamentId <= 0) {
    throw new Error("A valid selected tournament is required.");
  }
  const params = {
    workspace_id: normalizedWorkspaceId,
    tournament_id: normalizedTournamentId,
    page: Number(page),
    page_size: Number(pageSize),
    include_members: Boolean(includeMembers),
  };
  if (departmentId) params.department_id = Number(departmentId);
  if (sportId) params.sport_id = Number(sportId);
  if (participantShape) params.participant_shape = participantShape;
  if (search.trim()) params.search = search.trim();
  const response = await api.get("/competition-directory", { params });
  return response.data;
};
