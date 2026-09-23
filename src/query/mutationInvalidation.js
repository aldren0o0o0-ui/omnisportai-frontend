import { queryClient } from "./queryClient.js";

const READ_METHODS = new Set(["get", "head", "options"]);

const TOURNAMENT_ACCESS_MUTATION_PATTERNS = [
  "/admin/role-assignments",
  "/admin/sport-facilitator",
  "/assign-coach",
  "/department-coach-assignments",
  "/assistant-coaches",
  "/facilitators",
  "/memberships",
  "/finalize-roster",
  "/finalize-candidates",
  "/role-assignments",
];

export const affectsTournamentAccess = (config = {}) => {
  const method = String(config?.method || "get").toLowerCase();
  if (READ_METHODS.has(method)) return false;
  const url = String(config?.url || "").toLowerCase();
  if (TOURNAMENT_ACCESS_MUTATION_PATTERNS.some((pattern) => url.includes(pattern))) {
    return true;
  }
  return url.includes("/admin/users/") && url.includes("/status");
};

export const affectsScheduleData = (config = {}) => {
  const method = String(config?.method || "get").toLowerCase();
  if (READ_METHODS.has(method)) return false;
  const url = String(config?.url || "").toLowerCase();
  return url.includes("/schedule")
    || url.includes("program-block")
    || url.includes("/availability")
    || url.includes("/venues");
};

export const affectsCompetitionReads = (config = {}) => {
  const method = String(config?.method || "get").toLowerCase();
  if (READ_METHODS.has(method)) return false;
  const url = String(config?.url || "").toLowerCase();
  return [
    "/competition-entries",
    "/team-applications",
    "/team-registrations",
    "/entry-pools",
    "/assign-coach",
    "/department-coach-assignments",
    "/assistant-coaches",
  ].some(pattern => url.includes(pattern));
};

export const competitionMutationTournamentId = (config = {}) => {
  const url = String(config?.url || "");
  const pathMatch = url.match(/\/tournaments\/(\d+)/i);
  const fromPath = Number(pathMatch?.[1] || 0);
  if (fromPath > 0) return fromPath;
  const fromParams = Number(config?.params?.tournament_id || config?.params?.tournamentId || 0);
  if (fromParams > 0) return fromParams;
  const data = typeof config?.data === "string"
    ? (() => { try { return JSON.parse(config.data); } catch { return {}; } })()
    : config?.data;
  const fromPayload = Number(data?.tournament_id || data?.tournamentId || 0);
  return fromPayload > 0 ? fromPayload : null;
};

export const invalidateAfterMutation = (config = {}) => {
  const method = String(config?.method || "get").toLowerCase();
  if (READ_METHODS.has(method)) return;

  const url = String(config?.url || "").toLowerCase();
  // Dashboard summaries can contain assignments, entries, brackets, schedules,
  // results, and standings. Any successful mutation makes those snapshots stale.
  void queryClient.invalidateQueries({ queryKey: ["dashboards"] });

  if (affectsTournamentAccess(config)) {
    void queryClient.invalidateQueries({ queryKey: ["tournament-access"] });
  }

  if (url.includes("/sports")) void queryClient.invalidateQueries({ queryKey: ["sports"] });
  if (url.includes("/departments")) void queryClient.invalidateQueries({ queryKey: ["departments"] });
  if (url.includes("/venues")) void queryClient.invalidateQueries({ queryKey: ["venues"] });
  if (url.includes("/workspaces")) void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  if (affectsScheduleData(config)) {
    void queryClient.invalidateQueries({ queryKey: ["schedules"] });
  }
  if (affectsCompetitionReads(config)) {
    const tournamentId = competitionMutationTournamentId(config);
    void queryClient.invalidateQueries({
      predicate: query => query.queryKey?.[0] === "competition-directory"
        && (tournamentId === null || Number(query.queryKey?.[2] || 0) === tournamentId),
    });
    void queryClient.invalidateQueries({
      predicate: query => query.queryKey?.[0] === "competition-participants"
        && (tournamentId === null || Number(query.queryKey?.[1] || 0) === tournamentId),
    });
  }
  if (url.includes("/matches") || url.includes("/match-events") || url.includes("/results") || url.includes("/standings")) {
    void queryClient.invalidateQueries({ queryKey: ["standings"] });
  }
};
