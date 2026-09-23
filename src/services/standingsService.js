import api from "../api/axios";
import { queryClient, queryKeys } from "../query/queryClient";

const STANDINGS_STALE_MS = 10_000;

const withOptional = (params, key, value) => {
  if (value !== null && value !== undefined && value !== "" && Number(value) > 0) {
    params[key] = Number(value);
  }
};

export const getStandingsOverview = async ({ tournamentId = null } = {}) => {
  const params = {};
  withOptional(params, "tournament_id", tournamentId);
  const res = await api.get("/standings/overview", { params });
  return res.data;
};

export const getChampionshipStandings = async ({ tournamentId, signal = undefined } = {}) => {
  const params = {};
  withOptional(params, "tournament_id", tournamentId);
  const res = await api.get("/standings/championship", { params, signal });
  return res.data;
};

export const getSportStandings = async ({ sportId, tournamentId = null } = {}) => {
  const params = {};
  withOptional(params, "tournament_id", tournamentId);
  const res = await api.get(`/standings/sports/${sportId}`, { params });
  return res.data;
};

export const getDepartmentStandings = async ({ tournamentId = null, sportId = null, limit = 100, signal = undefined } = {}) => {
  const params = { limit: Number(limit) || 100 };
  withOptional(params, "tournament_id", tournamentId);
  withOptional(params, "sport_id", sportId);
  const res = await api.get("/standings/departments", { params, signal });
  return res.data;
};

export const getTeamStandings = async ({
  tournamentId = null,
  sportId = null,
  departmentId = null,
  limit = 100,
} = {}) => {
  const params = { limit: Number(limit) || 100 };
  withOptional(params, "tournament_id", tournamentId);
  withOptional(params, "sport_id", sportId);
  withOptional(params, "department_id", departmentId);
  const res = await api.get("/standings/teams", { params });
  return res.data;
};

export const getPlayerStandings = async ({
  tournamentId = null,
  sportId = null,
  teamId = null,
  departmentId = null,
  limit = 100,
} = {}) => {
  const params = { limit: Number(limit) || 100 };
  withOptional(params, "tournament_id", tournamentId);
  withOptional(params, "sport_id", sportId);
  withOptional(params, "team_id", teamId);
  withOptional(params, "department_id", departmentId);
  const res = await api.get("/standings/players", { params });
  return res.data;
};

export const getAnalyticsOptions = async ({ tournamentId = null } = {}) => {
  const params = {};
  withOptional(params, "tournament_id", tournamentId);
  const res = await api.get("/standings/analytics/options", { params });
  return res.data;
};

export const getAnalyticsLeaderboard = async ({
  tournamentId,
  sportId,
  eventId = null,
  participantType = null,
  participantId = null,
  participantKind = null,
  metric = null,
  signal = undefined,
  fresh = false,
} = {}) => {
  const params = { sport_id: Number(sportId) };
  withOptional(params, "tournament_id", tournamentId);
  withOptional(params, "tournament_sport_event_id", eventId);
  if (participantType) params.participant_type = participantType;
  withOptional(params, "participant_id", participantId);
  if (participantKind) params.participant_kind = participantKind;
  if (metric) params.metric = metric;
  return queryClient.fetchQuery({
    queryKey: queryKeys.standingsLeaderboard(params),
    staleTime: fresh ? 0 : STANDINGS_STALE_MS,
    queryFn: async ({ signal: querySignal }) => (await api.get("/standings/analytics/leaderboard", { params, signal: signal || querySignal })).data,
  });
};

export const getAnalyticsDepartmentStandings = async ({ tournamentId, signal = undefined, fresh = false } = {}) => {
  const params = {};
  withOptional(params, "tournament_id", tournamentId);
  return queryClient.fetchQuery({
    queryKey: queryKeys.standingsDepartments(tournamentId),
    staleTime: fresh ? 0 : STANDINGS_STALE_MS,
    queryFn: async ({ signal: querySignal }) => (await api.get("/standings/analytics/departments", { params, signal: signal || querySignal })).data,
  });
};

export const verifyAnalytics = async ({ tournamentId, sportId, eventId = null } = {}) => {
  const params = { sport_id: Number(sportId) };
  withOptional(params, "tournament_id", tournamentId);
  withOptional(params, "tournament_sport_event_id", eventId);
  const res = await api.post("/standings/analytics/verify", null, { params });
  return res.data;
};

export const recalculateAnalytics = async ({ tournamentId, sportId, eventId = null, participantType = null } = {}) => {
  const params = { sport_id: Number(sportId) };
  withOptional(params, "tournament_id", tournamentId);
  withOptional(params, "tournament_sport_event_id", eventId);
  const res = await api.post("/standings/analytics/recalculate", { participant_type: participantType }, { params });
  return res.data;
};
