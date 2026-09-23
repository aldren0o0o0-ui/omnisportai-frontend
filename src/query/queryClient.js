import { QueryClient } from "@tanstack/react-query";

export const cacheTimes = Object.freeze({
  dashboard: 15_000,
  tournamentAccess: 30_000,
  operational: 30_000,
  reference: 5 * 60_000,
});

export const queryKeys = Object.freeze({
  tournamentAccesses: ["tournament-access"],
  tournamentAccess: (userId, tournamentId) => [
    "tournament-access",
    String(userId || "anonymous"),
    String(tournamentId || "none"),
  ],
  dashboards: ["dashboards"],
  dashboard: (workspaceId, tournamentId, minRestMinutes) => [
    "dashboards",
    Number(workspaceId || 0),
    String(tournamentId || "auto"),
    Number(minRestMinutes || 30),
  ],
  workspaces: (includeArchived = true) => ["workspaces", Boolean(includeArchived)],
  activeWorkspace: ["workspaces", "active"],
  workspace: (workspaceId) => ["workspaces", "detail", Number(workspaceId)],
  sports: (departmentId = null, includeArchived = false) => ["sports", Number(departmentId || 0), Boolean(includeArchived)],
  departments: (publicOnly = false) => ["departments", Boolean(publicOnly)],
  competitionParticipants: (tournamentId, filters = {}) => [
    "competition-participants",
    Number(tournamentId || 0),
    String(filters.scope || "all"),
    Number(filters.departmentId || 0),
    Number(filters.sportId || 0),
    Number(filters.eventId || 0),
    String(filters.participantShape || ""),
    String(filters.search || "").trim(),
    Number(filters.page || 1),
    Number(filters.pageSize || 50),
    Boolean(filters.includeMembers),
  ],
  venues: (includeInactive = true) => ["venues", Boolean(includeInactive)],
  scheduleEvents: (tournamentId) => ["schedules", Number(tournamentId), "events"],
  scheduleAnalytics: (tournamentId, minRestMinutes = 30) => ["schedules", Number(tournamentId), "analytics", Number(minRestMinutes)],
  programBlocks: (tournamentId) => ["schedules", Number(tournamentId), "program-blocks"],
  scheduleAvailability: (tournamentId, startDate = "", endDate = "", venueIds = []) => [
    "schedules",
    Number(tournamentId),
    "venue-availability",
    String(startDate || ""),
    String(endDate || ""),
    [...new Set((Array.isArray(venueIds) ? venueIds : []).map(Number).filter(Number.isFinite))]
      .sort((left, right) => left - right)
      .join(","),
  ],
  standingsLeaderboard: (params) => ["standings", "leaderboard", params],
  standingsDepartments: (tournamentId) => ["standings", "departments", Number(tournamentId || 0)],
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: cacheTimes.operational,
      gcTime: 15 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: { retry: 0 },
  },
});

export const invalidateQueries = (...queryKey) =>
  queryClient.invalidateQueries({ queryKey });
