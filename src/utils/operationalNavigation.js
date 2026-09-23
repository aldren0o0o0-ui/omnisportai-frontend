const MODE_PREFIX = Object.freeze({
  sports_coordinator: "/coordinator",
  department_manager: "/department",
  sports_facilitator: "/sport-facilitator",
  coach: "/coach",
  assistant_coach: "/coach",
  player: "/viewer",
  viewer: "/viewer",
});

const ACTION_SUFFIX = Object.freeze({
  dashboard: "dashboard",
  intramurals: "intramurals",
  brackets: "brackets",
  sports: "sports",
  schedules: "schedules",
  standings: "standings",
  notifications: "notifications",
});

const normalizeMode = (accessOrMode) => String(
  typeof accessOrMode === "object"
    ? accessOrMode?.effective_mode ?? accessOrMode?.effectiveMode
    : accessOrMode
  || ""
).trim().toLowerCase();

const appendContext = (path, context = {}) => {
  if (!path) return null;
  const params = new URLSearchParams();
  ["workspace_id", "tournament_id", "sport_id", "department_id", "section"].forEach((key) => {
    const value = context[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  });
  if (context.return_to) params.set("return_to", String(context.return_to));
  const query = params.toString();
  return query ? `${path}${path.includes("?") ? "&" : "?"}${query}` : path;
};

/**
 * Resolve an operational destination from the backend-selected Tournament mode.
 * Restricted actions return null instead of crossing into another role's route.
 */
export const resolveOperationalDestination = (action, accessOrMode, context = {}) => {
  const mode = normalizeMode(accessOrMode);
  const prefix = MODE_PREFIX[mode];
  if (!prefix) return null;

  if (action === "venues") {
    if (mode !== "sports_coordinator") return null;
    const tournamentId = Number(context.tournament_id);
    if (Number.isInteger(tournamentId) && tournamentId > 0) {
      return `/coordinator/intramurals/${tournamentId}/settings/venues`;
    }
    return appendContext("/coordinator/venues", context);
  }
  if (action === "program_blocks" || action === "timeline") {
    if (mode !== "sports_coordinator") return null;
    return appendContext("/coordinator/tournaments", context);
  }
  if (action === "registration") {
    if (mode === "sports_coordinator") return appendContext("/coordinator/teams", context);
    if (mode === "department_manager") return appendContext("/department/teams", context);
    if (mode === "coach" || mode === "assistant_coach") {
      return appendContext("/coach/team-registration", context);
    }
    return null;
  }
  if (action === "coach_assignments") {
    if (!new Set(["sports_coordinator", "department_manager"]).has(mode)) return null;
    return appendContext("/department/coach-assignments", context);
  }
  if (action === "facilitator_assignments") {
    if (mode !== "sports_coordinator") return null;
    return appendContext("/coordinator/intramurals", { ...context, section: "assignments" });
  }
  if (action === "applications") {
    if (mode === "sports_facilitator") {
      return appendContext(`${prefix}/teams-and-players?status=PENDING_REVIEW`, context);
    }
    if (mode === "coach" || mode === "assistant_coach") return appendContext(`${prefix}/player-applications`, context);
    return null;
  }
  if (action === "roster") {
    if (mode === "coach" || mode === "assistant_coach") return appendContext(`${prefix}/team-registration`, context);
    if (mode === "department_manager") return appendContext(`${prefix}/teams`, context);
    return null;
  }

  const suffix = ACTION_SUFFIX[action];
  return suffix ? appendContext(`${prefix}/${suffix}`, context) : null;
};

export const operationalModePrefix = (accessOrMode) => MODE_PREFIX[normalizeMode(accessOrMode)] || null;
