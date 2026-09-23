export const TOURNAMENT_ACCESS_MODE_PRIORITY = [
  "sports_coordinator",
  "sports_facilitator",
  "department_manager",
  "coach",
  "assistant_coach",
  "player",
  "viewer",
];

export const TOURNAMENT_ACCESS_REFRESH_EVENT = "omnisport:tournament-access-refresh";

export const requestTournamentAccessRefresh = (detail = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOURNAMENT_ACCESS_REFRESH_EVENT, { detail }));
};

export const VIEWER_FALLBACK_PERMISSIONS = [
  "view_tournament",
  "view_public_schedule",
  "view_public_brackets",
  "view_public_standings",
  "view_public_announcements",
];

const DEFAULT_EVENT_NAMES = new Set(["default", "default event"]);

const normalizeText = (value) => String(value ?? "").trim();

const resolveModeValue = (valueOrAccess) => {
  if (valueOrAccess && typeof valueOrAccess === "object") {
    return normalizeText(
      valueOrAccess?.effectiveMode ?? valueOrAccess?.effective_mode
    ).toLowerCase();
  }
  return normalizeText(valueOrAccess).toLowerCase();
};

export const normalizeTournamentId = (value) => normalizeText(value);

export const isMeaningfulEventName = (eventName, sportName = "") => {
  const normalizedEventName = normalizeText(eventName);
  if (!normalizedEventName) return false;
  const foldedEventName = normalizedEventName.toLowerCase();
  if (DEFAULT_EVENT_NAMES.has(foldedEventName)) return false;
  const normalizedSportName = normalizeText(sportName).toLowerCase();
  if (normalizedSportName) {
    if (normalizedSportName === foldedEventName) return false;
    if (normalizedSportName.includes(foldedEventName)) return false;
  }
  return true;
};

export const getCompetitionTypeLabel = (value) => {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "SOLO" || normalized === "INDIVIDUAL") return "Individual";
  if (normalized === "DUO" || normalized === "PAIR") return "Pair";
  if (normalized === "TEAM") return "Team";
  return "";
};

export const buildSportEventLabel = (sportName, eventName) => {
  const normalizedSportName = normalizeText(sportName);
  const normalizedEventName = normalizeText(eventName);
  if (!normalizedSportName) {
    return normalizedEventName || "Tournament";
  }
  if (!normalizedEventName || !isMeaningfulEventName(normalizedEventName, normalizedSportName)) {
    return normalizedSportName;
  }
  const foldedSport = normalizedSportName.toLowerCase();
  const foldedEvent = normalizedEventName.toLowerCase();
  if (foldedEvent.startsWith(foldedSport)) {
    return normalizedEventName;
  }
  if (foldedSport.includes(foldedEvent)) {
    return normalizedSportName;
  }
  return `${normalizedSportName} ${normalizedEventName}`.trim();
};

export const createTournamentAccessFallback = ({
  tournamentId = "",
  effectiveMode = "",
} = {}) => ({
  tournament_id: tournamentId ? Number(tournamentId) : null,
  effective_mode: effectiveMode,
  global_roles: [],
  eligibility_roles: [],
  operational_roles: [],
  legacy_roles: [],
  tournament_roles: [],
  role_contexts: [],
  permissions: effectiveMode === "viewer" ? [...VIEWER_FALLBACK_PERMISSIONS] : [],
  viewer_permissions: [...VIEWER_FALLBACK_PERMISSIONS],
});

const normalizeContext = (context = {}) => {
  const sportName = normalizeText(context?.sport_name);
  const eventName = isMeaningfulEventName(context?.event_name, sportName)
    ? normalizeText(context?.event_name)
    : "";
  const eventKey = eventName ? normalizeText(context?.event_key) : "";
  const participantShape = normalizeText(context?.participant_shape).toUpperCase();
  const competitionTypeLabel =
    normalizeText(context?.competition_type_label) || getCompetitionTypeLabel(participantShape);
  const sportLabel =
    normalizeText(context?.sport_label) || buildSportEventLabel(sportName, eventName);

  return {
    ...context,
    role: normalizeText(context?.role),
    department_id: context?.department_id ?? null,
    department_name: normalizeText(context?.department_name),
    sport_id: context?.sport_id ?? null,
    sport_name: sportName,
    tournament_sport_event_id: context?.tournament_sport_event_id ?? null,
    event_name: eventName || null,
    event_key: eventKey || null,
    participant_shape: participantShape || null,
    competition_type_label: competitionTypeLabel || null,
    sport_label: sportLabel,
    permissions: Array.isArray(context?.permissions) ? context.permissions.filter(Boolean) : [],
  };
};

export const normalizeTournamentAccessPayload = (payload, tournamentId = "") => {
  const fallback = createTournamentAccessFallback({
    tournamentId,
    effectiveMode: tournamentId ? "viewer" : "",
  });
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const roleContextsSource = Array.isArray(payload?.role_contexts)
    ? payload.role_contexts
    : Array.isArray(payload?.tournament_roles)
      ? payload.tournament_roles
      : [];
  const roleContexts = roleContextsSource.map(normalizeContext);
  const viewerPermissions = Array.isArray(payload?.viewer_permissions) && payload.viewer_permissions.length > 0
    ? payload.viewer_permissions.filter(Boolean)
    : [...VIEWER_FALLBACK_PERMISSIONS];
  const permissions = Array.isArray(payload?.permissions) && payload.permissions.length > 0
    ? payload.permissions.filter(Boolean)
    : [...viewerPermissions];

  return {
    tournament_id:
      payload?.tournament_id !== null && payload?.tournament_id !== undefined && payload?.tournament_id !== ""
        ? Number(payload.tournament_id)
        : tournamentId
          ? Number(tournamentId)
          : null,
    effective_mode: normalizeText(payload?.effective_mode),
    global_roles: Array.isArray(payload?.global_roles) ? payload.global_roles.filter(Boolean) : [],
    eligibility_roles: Array.isArray(payload?.eligibility_roles)
      ? payload.eligibility_roles.filter(Boolean)
      : Array.isArray(payload?.global_roles)
        ? payload.global_roles.filter(Boolean)
        : [],
    operational_roles: Array.isArray(payload?.operational_roles)
      ? payload.operational_roles.map(normalizeContext)
      : roleContexts,
    legacy_roles: Array.isArray(payload?.legacy_roles)
      ? payload.legacy_roles.map(normalizeContext)
      : [],
    tournament_roles: Array.isArray(payload?.tournament_roles)
      ? payload.tournament_roles.map(normalizeContext)
      : roleContexts,
    role_contexts: roleContexts,
    permissions,
    viewer_permissions: viewerPermissions,
  };
};

export const getPrimaryRoleContext = (access) => {
  const effectiveMode = normalizeText(access?.effective_mode);
  const roleContexts = Array.isArray(access?.role_contexts) ? access.role_contexts : [];
  const sameModeContext = roleContexts.find((context) => normalizeText(context?.role) === effectiveMode);
  return sameModeContext || roleContexts[0] || null;
};

export const getTournamentAssignmentLabel = (access, { maxItems = 1 } = {}) => {
  const effectiveMode = resolveModeValue(access);
  const contexts = (Array.isArray(access?.role_contexts) ? access.role_contexts : [])
    .filter((context) => !effectiveMode || resolveModeValue(context?.role) === effectiveMode);
  const labels = [...new Set(contexts.map((context) => {
    const sportLabel = normalizeText(context?.sport_label);
    const departmentLabel = normalizeText(context?.department_code || context?.department_name);
    return sportLabel || departmentLabel;
  }).filter(Boolean))];
  if (!labels.length) return "";
  const visibleCount = Math.max(1, Number(maxItems) || 1);
  const visible = labels.slice(0, visibleCount);
  const remaining = labels.length - visible.length;
  return remaining > 0 ? `${visible.join(" · ")} +${remaining}` : visible.join(" · ");
};

export const getSelectedIntramuralRoleLabels = (access, tournamentName = "") => ({
  role: getTournamentAccessModeLabel(access),
  intramural: normalizeText(tournamentName) || "Selected intramural",
  assignment: getTournamentAssignmentLabel(access),
});

export const getTournamentRoleLabels = (access) => {
  const modes = [
    resolveModeValue(access),
    ...(Array.isArray(access?.eligibility_roles) ? access.eligibility_roles : []),
    ...(Array.isArray(access?.global_roles) ? access.global_roles : []),
    ...(Array.isArray(access?.role_contexts) ? access.role_contexts.map((context) => context?.role) : []),
  ];
  return [...new Set(modes.map(getModeDisplayLabel).filter(Boolean))];
};

export const formatRoleContextLabel = (context, { includeRole = true } = {}) => {
  if (!context || typeof context !== "object") return "";
  const parts = [];
  if (includeRole) {
    const roleLabel = getModeDisplayLabel(context.role);
    if (roleLabel) parts.push(roleLabel);
  }
  const sportLabel = normalizeText(context?.sport_label);
  if (sportLabel) parts.push(sportLabel);
  const competitionTypeLabel =
    normalizeText(context?.competition_type_label) || getCompetitionTypeLabel(context?.participant_shape);
  if (competitionTypeLabel) parts.push(competitionTypeLabel);
  if (!sportLabel && !competitionTypeLabel && normalizeText(context?.department_name)) {
    parts.push(normalizeText(context.department_name));
  }
  return parts.join(" · ");
};

export const getModeDisplayLabel = (mode) => {
  const normalized = resolveModeValue(mode);
  if (normalized === "sports_coordinator") return "Coordinator";
  if (normalized === "sports_facilitator") return "Sports Facilitator";
  if (normalized === "department_manager") return "Department Manager";
  if (normalized === "coach") return "Coach";
  if (normalized === "assistant_coach") return "Assistant Coach";
  if (normalized === "player") return "Player";
  if (normalized === "viewer") return "Viewer";
  return "";
};

export const canManageCoachPages = (effectiveMode) =>
  ["coach"].includes(resolveModeValue(effectiveMode));

export const canViewCoachOversightPages = (effectiveMode) =>
  ["sports_coordinator", "sports_facilitator", "department_manager"].includes(
    resolveModeValue(effectiveMode)
  );

export const isReadOnlyAssistantMode = (effectiveMode) =>
  resolveModeValue(effectiveMode) === "assistant_coach";

export const isCoachCapableMode = (effectiveMode) =>
  canManageCoachPages(effectiveMode);

export const isAssistantCoachMode = (effectiveMode) =>
  isReadOnlyAssistantMode(effectiveMode);

export const isViewerLikeMode = (effectiveMode) =>
  ["viewer", "player"].includes(resolveModeValue(effectiveMode));

export const shouldShowCoachTools = (
  accessOrMode,
  { hasSelectedTournament = null, error = "" } = {}
) => {
  const hasSelection =
    typeof hasSelectedTournament === "boolean"
      ? hasSelectedTournament
      : Boolean(accessOrMode?.hasSelectedTournament);
  const accessError =
    typeof error === "string" && error
      ? error
      : normalizeText(accessOrMode?.error || "");

  if (!hasSelection) return false;
  if (accessError) return false;
  return isCoachCapableMode(accessOrMode);
};

export const getTournamentAccessModeLabel = (accessOrMode) =>
  getModeDisplayLabel(accessOrMode) || "Viewer";

export const getCoachFallbackTitle = (accessOrMode, { error = "" } = {}) => {
  const accessError =
    typeof error === "string" && error
      ? error
      : normalizeText(accessOrMode?.error || "");
  if (accessError) return "Viewer-safe mode";
  return `Viewing as ${getTournamentAccessModeLabel(accessOrMode)}`;
};

export const getCoachFallbackMessage = (
  accessOrMode,
  {
    unavailableLabel = "Coach tools",
    error = "",
  } = {}
) => {
  const accessError =
    typeof error === "string" && error
      ? error
      : normalizeText(accessOrMode?.error || "");

  if (accessError) {
    return "Unable to verify your tournament access. Showing viewer-safe information only.";
  }

  if (resolveModeValue(accessOrMode) === "player") {
    return `You are registered as a player in this tournament. ${unavailableLabel} are not available here.`;
  }

  if (resolveModeValue(accessOrMode) === "department_manager") {
    return "You are viewing this tournament as Department Manager. Use department-scoped pages for coach assignments, team setup, and department oversight.";
  }

  if (resolveModeValue(accessOrMode) === "sports_facilitator") {
    return "You are viewing this tournament as Sports Facilitator. Use facilitator-scoped pages for assigned sports and operations.";
  }

  if (resolveModeValue(accessOrMode) === "sports_coordinator") {
    return "You are viewing this tournament as Coordinator. Use coordinator pages for tournament-wide management tasks.";
  }

  return `You are not assigned as coach in this tournament. ${unavailableLabel} are hidden, but public tournament information remains available.`;
};
