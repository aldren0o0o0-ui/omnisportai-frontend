import api from "../api/axios";
import { buildScheduleValidationParams, normalizeScheduleVenueIds } from "../components/schedule/scheduleWorkflow";
import { queryClient, queryKeys } from "../query/queryClient";

const SCHEDULE_STALE_MS = 10_000;
const invalidateScheduleCache = (tournamentId) => queryClient.invalidateQueries({ queryKey: ["schedules", Number(tournamentId)] });

const LEGACY_SCHEDULING_ENABLED =
  String(import.meta.env.VITE_ENABLE_LEGACY_SCHEDULING_ROUTES || "")
    .trim()
    .toLowerCase() === "true";

const toApiDateTime = (value) => {
  if (!(value instanceof Date)) return value;
  const pad = (num) => String(num).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate()
  )}T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(
    value.getSeconds()
  )}`;
};

export const generateSchedule = async ({
  tournamentId,
  sportId = null,
  tournamentSportEventId = null,
  workflowMode = "FINAL",
  dateRange,
  venueIds = null,
  slotMinutes = null,
  startHour = null,
  endHour = null,
  minRestMinutes = null,
  fairnessThreshold = null,
  maxMatchesPerDayPerTeam = null,
  aiMaxIterations = null,
  useAutonomousScheduler = true,
  initialWeights = null,
  schedulingMode = "BALANCED",
  preflightIntent = "incremental_add",
  allowPartialCommit = false,
  preflightFingerprint = null,
  useLegacy = false
}) => {
  const payload = {
    tournament_id: tournamentId,
    sport_id: sportId,
    tournament_sport_event_id: tournamentSportEventId,
    workflow_mode: workflowMode,
    start_date: dateRange?.start || null,
    end_date: dateRange?.end || null,
    venue_ids: normalizeScheduleVenueIds(venueIds),
    slot_minutes: slotMinutes,
    start_hour: startHour,
    end_hour: endHour,
    min_rest_minutes: minRestMinutes,
    fairness_threshold: fairnessThreshold,
    max_matches_per_day_per_team: maxMatchesPerDayPerTeam,
    ai_max_iterations: aiMaxIterations,
    use_autonomous_scheduler: Boolean(useAutonomousScheduler),
    initial_weights: initialWeights,
    scheduling_mode: schedulingMode,
    preflight_intent: preflightIntent,
    allow_partial_commit: Boolean(allowPartialCommit),
    preflight_fingerprint:
      typeof preflightFingerprint === "string" && preflightFingerprint.trim()
        ? preflightFingerprint.trim()
        : null
  };

  if (useLegacy) {
    if (!LEGACY_SCHEDULING_ENABLED) {
      throw new Error("Legacy scheduling route is disabled.");
    }
    const legacyRes = await api.post("/ai/generate-schedule", {
      tournament_id: tournamentId,
      start_date: dateRange?.start || null,
      end_date: dateRange?.end || null,
      venue_ids: Array.isArray(venueIds) ? venueIds : []
    });
    await invalidateScheduleCache(tournamentId);
    return legacyRes.data;
  }

  try {
    const res = await api.post("/schedule/generate", payload);
    await invalidateScheduleCache(tournamentId);
    return res.data;
  } catch (error) {
    const status = error?.response?.status;
    if (!LEGACY_SCHEDULING_ENABLED || (status !== 404 && status !== 405)) {
      throw error;
    }

    const legacyRes = await api.post("/ai/generate-schedule", {
      tournament_id: tournamentId,
      start_date: dateRange?.start || null,
      end_date: dateRange?.end || null,
      venue_ids: Array.isArray(venueIds) ? venueIds : []
    });
    await invalidateScheduleCache(tournamentId);
    return legacyRes.data;
  }
};

export const getAISchedulerConfig = async (tournamentId) => {
  const res = await api.get(`/schedule/ai-config/${tournamentId}`);
  return res.data;
};

export const updateAISchedulerConfig = async (tournamentId, weights) => {
  const payload = {
    venue_penalty: weights?.venue_penalty,
    time_penalty: weights?.time_penalty,
    importance_penalty: weights?.importance_penalty,
    balance_penalty: weights?.balance_penalty
  };

  const sanitized = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== null && value !== undefined)
  );

  const res = await api.put(`/schedule/ai-config/${tournamentId}`, sanitized);
  return res.data;
};

export const getScheduleEvents = async (tournamentId) => {
  return queryClient.fetchQuery({
    queryKey: queryKeys.scheduleEvents(tournamentId),
    staleTime: SCHEDULE_STALE_MS,
    queryFn: async ({ signal }) => (await api.get(`/schedule/${tournamentId}/events`, { signal })).data,
  });
};

export const getScheduleAnalytics = async (tournamentId, minRestMinutes = 30) => {
  return queryClient.fetchQuery({
    queryKey: queryKeys.scheduleAnalytics(tournamentId, minRestMinutes),
    staleTime: SCHEDULE_STALE_MS,
    queryFn: async ({ signal }) => (await api.get(`/schedule/${tournamentId}/analytics`, {
      params: { min_rest_minutes: minRestMinutes }, signal
    })).data,
  });
};

export const validateSchedule = async (
  tournamentId,
  {
    sportId = null,
    tournamentSportEventId = null,
  } = {}
) => {
  const res = await api.get(`/schedule/${tournamentId}/validate`, {
    params: buildScheduleValidationParams({
      sportId,
      tournamentSportEventId,
    }),
  });
  return res.data;
};

export const publishSchedule = async ({
  tournamentId,
  sportId = null,
  tournamentSportEventId = null,
}) => {
  const res = await api.post("/schedule/publish", {
    tournament_id: tournamentId,
    sport_id: sportId,
    tournament_sport_event_id: tournamentSportEventId,
  });
  await invalidateScheduleCache(tournamentId);
  return res.data;
};

export const rescheduleMatch = async (payload) => {
  const scheduledStart = toApiDateTime(
    payload.scheduled_start ?? payload.new_start ?? payload.start_time ?? payload.start
  );
  const scheduledEnd = toApiDateTime(
    payload.scheduled_end ?? payload.new_end ?? payload.end_time ?? payload.end
  );
  const venueId = payload.venue_id ?? payload.venue ?? null;
  const body = {
    match_id: payload.match_id,
    new_start: scheduledStart,
    new_end: scheduledEnd,
    scheduled_start: scheduledStart,
    scheduled_end: scheduledEnd,
    venue_id: venueId,
    venue: venueId,
    auto_fix: payload.auto_fix !== undefined ? Boolean(payload.auto_fix) : true
  };

  const res = await api.post("/schedule/reschedule-match", body);
  await queryClient.invalidateQueries({ queryKey: ["schedules"] });
  return res.data;
};

export const applyScheduleRecommendation = async (payload) => {
  const body = {
    match_id: payload?.match_id,
    option_type: payload?.option_type,
    label: payload?.label ?? null,
    confidence: payload?.confidence ?? null,
    mutations: Array.isArray(payload?.mutations) ? payload.mutations : [],
  };
  const res = await api.post("/schedule/apply-recommendation", body);
  await queryClient.invalidateQueries({ queryKey: ["schedules"] });
  return res.data;
};

export const getProgramBlocks = async (tournamentId) => {
  return queryClient.fetchQuery({
    queryKey: queryKeys.programBlocks(tournamentId),
    staleTime: SCHEDULE_STALE_MS,
    queryFn: async ({ signal }) => (await api.get(`/tournaments/${tournamentId}/program-blocks`, { signal })).data,
  });
};

export const runSchedulePreflight = async (tournamentId, payload = {}) => {
  const res = await api.post(`/tournaments/${tournamentId}/schedule/preflight`, payload);
  return res.data;
};

export const createProgramBlock = async (tournamentId, payload) => {
  const res = await api.post(`/tournaments/${tournamentId}/program-blocks`, payload);
  await invalidateScheduleCache(tournamentId);
  return res.data;
};

export const updateProgramBlock = async (tournamentId, blockId, payload) => {
  const res = await api.patch(`/tournaments/${tournamentId}/program-blocks/${blockId}`, payload);
  await invalidateScheduleCache(tournamentId);
  return res.data;
};

export const deleteProgramBlock = async (tournamentId, blockId) => {
  const res = await api.delete(`/tournaments/${tournamentId}/program-blocks/${blockId}`);
  await invalidateScheduleCache(tournamentId);
  return res.data;
};
