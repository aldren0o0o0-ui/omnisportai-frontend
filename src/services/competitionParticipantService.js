import api from "../api/axios";
import { cacheTimes, queryClient, queryKeys } from "../query/queryClient";

export const getCompetitionParticipants = async ({
  workspaceId,
  tournamentId,
  scope = "all",
  departmentId = null,
  sportId = null,
  eventId = null,
  participantShape = "",
  search = "",
  page = 1,
  pageSize = 50,
  includeMembers = false,
}) => queryClient.fetchQuery({
  queryKey: queryKeys.competitionParticipants(tournamentId, {
    scope,
    departmentId,
    sportId,
    eventId,
    participantShape,
    search,
    page,
    pageSize,
    includeMembers,
  }),
  staleTime: Math.min(cacheTimes.operational, 20_000),
  queryFn: async () => {
    const response = await api.get(`/tournaments/${tournamentId}/competition-participants`, {
      params: {
        workspace_id: workspaceId,
        scope,
        department_id: departmentId || undefined,
        sport_id: sportId || undefined,
        event_id: eventId || undefined,
        participant_shape: participantShape || undefined,
        search: search || undefined,
        page,
        page_size: pageSize,
        include_members: includeMembers,
      },
    });
    return response.data;
  },
});

export const getManagedCompetitionParticipants = async ({
  workspaceId,
  tournamentId,
  includeMembers = false,
}) => {
  const payload = await getCompetitionParticipants({
    workspaceId,
    tournamentId,
    scope: "managed",
    page: 1,
    pageSize: 500,
    includeMembers,
  });
  return Array.isArray(payload?.items) ? payload.items : [];
};
