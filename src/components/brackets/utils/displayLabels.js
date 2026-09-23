const TEAM_WORDS = new Set([
  "team",
  "basketball",
  "volleyball",
  "badminton",
  "football",
  "soccer",
  "softball",
  "baseball",
  "tennis",
  "athletics",
  "boxing",
  "club",
  "squad",
  "college",
  "university"
]);

const ACTION_CODE_LABELS = {
  CLOCK_START: "Start",
  CLOCK_STOP: "Stop",
  CLOCK_RESET: "Reset",
  QUARTER_ADVANCE: "Next Quarter",
  PERIOD_ADVANCE: "Next Period",
  ROUND_ADVANCE: "Next Round",
  SET_ADVANCE: "Next Set",
  ONE_PT_MADE: "1 PT",
  FREE_THROW: "1 PT",
  TWO_PT_MADE: "2 PT",
  THREE_PT_MADE: "3 PT",
  TECHNICAL_FOUL: "Tech Foul",
  POSSESSION_SET: "Possession",
  SERVER_SET: "Server",
  SERVICE_SET: "Service",
  CHANGE_SERVER: "Server Change",
  SERVICE_CHANGE: "Service Change",
  BATTING_SET: "Batting",
  FIELDING_SET: "Fielding",
  TIMEOUT: "Timeout",
  FOUL: "Foul",
  TURNOVER: "Turnover",
  REBOUND: "Rebound",
  ASSIST: "Assist",
  STEAL: "Steal",
  BLOCK: "Block",
  GOAL: "Goal",
  RUN_SCORED: "Run",
  YELLOW_CARD: "Yellow",
  RED_CARD: "Red",
  KNOCKDOWN: "Knockdown",
  WARNING: "Warning",
  DEDUCTION: "Deduction",
};

const SPORT_DEFAULT_SUGGESTED_EVENT_TYPES = {
  basketball: ["FREE_THROW", "ONE_PT_MADE", "TWO_PT_MADE", "THREE_PT_MADE", "FOUL", "TIMEOUT"],
  volleyball: ["POINT", "RALLY_WIN", "SERVICE_ACE", "BLOCK", "FAULT", "TIMEOUT"],
  badminton: ["POINT", "RALLY_WIN", "FAULT", "LET", "CHANGE_SERVER", "SERVICE_SET"],
  tennis: ["POINT", "ACE", "FAULT", "DOUBLE_FAULT", "LET", "TIMEOUT"],
  boxing: ["JUDGE_SCORE", "KNOCKDOWN", "WARNING", "DEDUCTION", "ROUND_ADVANCE", "MATCH_END"],
  soccer: ["GOAL", "ASSIST", "FOUL", "YELLOW_CARD", "RED_CARD", "SUBSTITUTION"],
  football: ["GOAL", "ASSIST", "FOUL", "YELLOW_CARD", "RED_CARD", "SUBSTITUTION"],
  futsal: ["GOAL", "FOUL", "TIMEOUT", "YELLOW_CARD", "RED_CARD", "SUBSTITUTION"],
  baseball: ["RUN_SCORED", "HIT", "OUT", "WALK", "ERROR", "INNING_ADVANCE"],
  softball: ["RUN_SCORED", "HIT", "OUT", "WALK", "ERROR", "INNING_ADVANCE"],
};

const VALID_ACTION_GROUPS = new Set([
  "scoring",
  "stats",
  "clock",
  "phase",
  "violations",
  "match",
  "possession",
  "substitutions",
  "other",
]);

const NEUTRAL_STATE_EVENT_PATTERNS = [
  "TIMEOUT",
  "CLOCK_",
  "SUB",
  "MATCH_START",
  "MATCH_END",
  "ROUND_ADVANCE",
  "SET_ADVANCE",
  "PERIOD_ADVANCE",
  "QUARTER_ADVANCE",
  "ADMIN",
  "DEBUG",
];

const DEFAULT_EVENT_NAMES = new Set(["default", "default event"]);

const STATE_OVERRIDE_EVENT_CODES = {
  possession: new Set([
    "POSSESSION_SET",
    "SET_POSSESSION",
    "POSSESSION_CHANGE",
    "CHANGE_POSSESSION",
  ]),
  service: new Set([
    "SERVER_SET",
    "SET_SERVER",
    "SERVICE_SET",
    "SET_SERVICE",
    "SERVER_CHANGE",
    "CHANGE_SERVER",
    "SERVICE_CHANGE",
    "CHANGE_SERVICE",
  ]),
  server: new Set([
    "SERVER_SET",
    "SET_SERVER",
    "SERVICE_SET",
    "SET_SERVICE",
    "SERVER_CHANGE",
    "CHANGE_SERVER",
    "SERVICE_CHANGE",
    "CHANGE_SERVICE",
  ]),
  batting: new Set([
    "BATTING_SET",
    "SET_BATTING",
    "FIELDING_SET",
    "SET_FIELDING",
    "CHANGE_BATTING",
    "CHANGE_FIELDING",
  ]),
};

const resolveStateOverrideMode = (stateType = "") => {
  const normalized = String(stateType || "").trim().toLowerCase();
  if (normalized === "service") return "server";
  return normalized;
};

export const isStateOverrideEventCode = (eventCode = "", stateType = "") => {
  const code = String(eventCode || "").trim().toUpperCase();
  if (!code) return false;
  const mode = resolveStateOverrideMode(stateType);
  if (mode) {
    const modeCodes = STATE_OVERRIDE_EVENT_CODES[mode];
    return Boolean(modeCodes?.has(code));
  }
  return Object.values(STATE_OVERRIDE_EVENT_CODES).some((codes) => codes.has(code));
};

export const getControlEventCode = (control = {}) =>
  String(
    control?.event_type
    || control?.eventType
    || control?.type
    || control?.code
    || control?.id
    || ""
  )
    .trim()
    .toUpperCase();

export const isStateOverrideControl = (control = {}, stateType = "") => {
  const code = getControlEventCode(control);
  if (!code) return false;

  const category = String(control?.category || "").trim().toLowerCase();
  if (category === "state") return true;

  if (control?.is_state_override === true || control?.isStateOverride === true) {
    return true;
  }

  return isStateOverrideEventCode(code, stateType);
};

export const normalizeActionGroup = (value = "") => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (["score", "scores", "scoring", "points", "offense", "attack"].includes(raw)) return "scoring";
  if (["stat", "stats", "statistics", "player_stats", "player-stat", "playerstats"].includes(raw)) return "stats";
  if (["clock", "timer", "time"].includes(raw)) return "clock";
  if (["phase", "period", "quarter", "round", "set", "inning"].includes(raw)) return "phase";
  if (["foul", "fouls", "violation", "violations", "penalty", "penalties", "fault", "faults"].includes(raw)) return "violations";
  if (["state", "possession", "server", "service", "batting", "fielding"].includes(raw)) return "possession";
  if (["substitution", "substitutions", "lineup", "players", "roster"].includes(raw)) return "substitutions";
  if (["match", "game", "admin"].includes(raw)) return "match";
  if (["other", "misc", "miscellaneous"].includes(raw)) return "other";
  return raw;
};

const inferFallbackCategoryByEventType = (eventType = "", sportKey = "") => {
  const normalizedEventType = String(eventType || "").trim().toUpperCase();
  const key = String(sportKey || "").toLowerCase();
  if (!normalizedEventType) return "other";

  if (isStateOverrideEventCode(normalizedEventType)) {
    return "possession";
  }

  if (
    normalizedEventType.includes("CLOCK_")
    || normalizedEventType.includes("TIMER_")
    || normalizedEventType.includes("SHOT_CLOCK")
    || normalizedEventType.includes("PLAY_CLOCK")
  ) {
    return "clock";
  }

  if (
    normalizedEventType.includes("QUARTER")
    || normalizedEventType.includes("PERIOD")
    || normalizedEventType.includes("ROUND")
    || normalizedEventType.includes("SET")
    || normalizedEventType.includes("HALF")
    || normalizedEventType.includes("INNING")
    || normalizedEventType.includes("NEXT_")
    || normalizedEventType.includes("_ADVANCE")
    || normalizedEventType.includes("ADVANCE_")
    || normalizedEventType.includes("INTERVAL")
  ) {
    return "phase";
  }

  if (
    normalizedEventType.includes("FOUL")
    || normalizedEventType.includes("TECHNICAL")
    || normalizedEventType.includes("FLAGRANT")
    || normalizedEventType.includes("VIOLATION")
    || normalizedEventType.includes("FAULT")
    || normalizedEventType.includes("CARD")
    || normalizedEventType.includes("PENALTY")
    || normalizedEventType.includes("DEDUCTION")
  ) {
    return "violations";
  }

  if (normalizedEventType.includes("SUBSTITUTION") || normalizedEventType.includes("SUB_") || normalizedEventType.includes("_SUB")) {
    const basketballLike = key.includes("basketball") || key.includes("futsal");
    return basketballLike ? "match" : "substitutions";
  }

  if (
    normalizedEventType.includes("TIMEOUT")
    || normalizedEventType.includes("MATCH_START")
    || normalizedEventType.includes("MATCH_END")
    || normalizedEventType.includes("MATCH_")
    || normalizedEventType.includes("GAME_START")
    || normalizedEventType.includes("GAME_END")
    || normalizedEventType.includes("CORNER")
    || normalizedEventType.includes("RESIGNATION")
    || normalizedEventType.includes("CHECKMATE")
    || normalizedEventType.includes("STALEMATE")
    || normalizedEventType.includes("DRAW")
    || normalizedEventType.includes("TIME_FORFEIT")
    || normalizedEventType.includes("KO")
    || normalizedEventType.includes("TKO")
    || normalizedEventType.includes("DISQUALIFICATION_WIN")
    || normalizedEventType.includes("DQ_WIN")
    || normalizedEventType.includes("TIE_BREAK_WIN")
    || normalizedEventType.includes("MATCH_WIN")
  ) {
    return "match";
  }

  if (
    normalizedEventType.includes("FREE_THROW")
    || normalizedEventType.includes("ONE_PT")
    || normalizedEventType.includes("TWO_PT")
    || normalizedEventType.includes("THREE_PT")
    || normalizedEventType.includes("FIELD_GOAL")
    || normalizedEventType.includes("POINT")
    || normalizedEventType.includes("GOAL")
    || normalizedEventType.includes("RUN_SCORED")
    || normalizedEventType.includes("ACE")
    || normalizedEventType.includes("PUNCH")
    || normalizedEventType.includes("HIT")
    || normalizedEventType.includes("RBI")
    || normalizedEventType.includes("WALK")
    || normalizedEventType.includes("FINISH")
    || normalizedEventType.includes("TOUCH_FIRST")
    || normalizedEventType.includes("SCORE")
  ) {
    return "scoring";
  }

  const basketballLike = key.includes("basketball") || key.includes("futsal");
  if (
    normalizedEventType.includes("ASSIST")
    || normalizedEventType.includes("REBOUND")
    || normalizedEventType.includes("STEAL")
    || normalizedEventType.includes("BLOCK")
    || normalizedEventType.includes("TURNOVER")
    || normalizedEventType.includes("STRIKEOUT")
    || normalizedEventType.includes("OUT_RECORDED")
    || normalizedEventType.includes("KNOCKDOWN")
    || (basketballLike && (normalizedEventType.includes("DEFLECTION") || normalizedEventType.includes("INTERCEPTION")))
  ) {
    return "stats";
  }

  return "other";
};

const sortControlsByPriority = (rows = []) =>
  [...rows].sort((a, b) => {
    const aPriority = Number(a?.priority);
    const bPriority = Number(b?.priority);
    const safeA = Number.isFinite(aPriority) ? aPriority : 9999;
    const safeB = Number.isFinite(bPriority) ? bPriority : 9999;
    return safeA - safeB;
  });

export const truncateMiddle = (value, maxLength = 24) => {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  const lead = Math.max(4, Math.floor((maxLength - 3) / 2));
  const tail = Math.max(3, maxLength - 3 - lead);
  return `${text.slice(0, lead)}...${text.slice(-tail)}`;
};

export const initialsFromName = (value) => {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
};

const looksLikeEventCode = (value) => /^[A-Z0-9_]+$/.test(String(value || "").trim());

const fromEventCode = (code) => {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return "";
  if (ACTION_CODE_LABELS[normalized]) return ACTION_CODE_LABELS[normalized];
  return normalized
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getShortTeamName = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const acronymToken = raw.split(/\s+/).find((token) => /^[A-Z]{3,6}$/.test(token));
  if (acronymToken) return acronymToken;
  const cleaned = raw
    .split(/\s+/)
    .filter((word) => !TEAM_WORDS.has(word.toLowerCase()))
    .join(" ")
    .trim();
  if (cleaned) {
    const firstToken = cleaned.split(/\s+/)[0];
    if (firstToken.length <= 8) return firstToken;
    return truncateMiddle(firstToken, 8);
  }
  return truncateMiddle(raw, 10);
};

export const getShortPlayerName = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const playerNumberMatch = raw.match(/player\s*#?\s*(\d+)/i);
  if (playerNumberMatch) return `P${playerNumberMatch[1]}`;
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length === 1) return truncateMiddle(words[0], 12);
  const likelyNumber = words[words.length - 1];
  if (/^\d+$/.test(likelyNumber)) return `P${likelyNumber}`;
  return `${words[0]} ${words[words.length - 1][0]}.`;
};

export const getPlayerListChipLabel = (player = {}) => {
  const fullName = String(player?.name || "").trim();
  const lastNameCandidate = String(player?.lastName || "").trim();
  const jerseyRaw = player?.jerseyNumber ?? player?.jersey_no ?? player?.jerseyNo ?? player?.shirt_number ?? player?.number;
  const jerseyNumber = String(jerseyRaw ?? "").trim();

  let lastName = lastNameCandidate;
  if (!lastName && fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length > 0) lastName = parts[parts.length - 1];
  }

  if (lastName && jerseyNumber) return `${lastName} #${jerseyNumber}`;
  if (lastName) return lastName;
  if (jerseyNumber) return `#${jerseyNumber}`;
  return getShortPlayerName(fullName || "Unknown player");
};

export const getActionDisplayLabel = (action = {}) => {
  const code = String(action.event_type || action.type || "").trim().toUpperCase();
  const displayLabel = String(action.displayLabel || action.display_label || "").trim();
  if (displayLabel) return truncateMiddle(displayLabel, 16);
  if (ACTION_CODE_LABELS[code]) return ACTION_CODE_LABELS[code];

  const incomingLabel = String(action.label || "").trim();
  if (incomingLabel && !looksLikeEventCode(incomingLabel)) return truncateMiddle(incomingLabel, 16);
  if (code) return truncateMiddle(fromEventCode(code), 16);
  return "Action";
};

export const getActionTooltip = (action = {}) => {
  const code = String(action.event_type || "").trim().toUpperCase();
  const display = getActionDisplayLabel(action);
  if (!code) return display;
  const fullLabel = fromEventCode(code);
  if (display === fullLabel) return `${display} - ${code}`;
  return `${fullLabel} - ${code}`;
};

export const getEventDisplayLabel = (eventType) => fromEventCode(eventType) || "Event";

const normalizeEventText = (value) => String(value || "").trim();

export const getMeaningfulEventCategory = (context = {}) => {
  const sportName = normalizeEventText(context?.sport_name || context?.sportName || context?.sport);
  const eventName = normalizeEventText(context?.event_name || context?.eventName);
  const eventKey = normalizeEventText(context?.event_key || context?.eventKey).toLowerCase();
  if (!eventName) return "";
  const normalizedEventName = eventName.toLowerCase();
  if (DEFAULT_EVENT_NAMES.has(normalizedEventName)) return "";
  if (eventKey === "default") return "";
  if (sportName && normalizedEventName === sportName.toLowerCase()) return "";
  return eventName;
};

export const buildSportEventLabel = (context = {}) => {
  const displayName = normalizeEventText(context?.sport_display_name || context?.sportDisplayName);
  if (displayName && !/\b(undefined|null)\b/i.test(displayName)) return displayName;

  const sportName = normalizeEventText(context?.sport_name || context?.sportName || context?.sport);
  const eventName = getMeaningfulEventCategory(context);
  if (sportName && eventName) return `${sportName} ${eventName}`;
  return sportName || eventName || "Match";
};

export const getCompetitionTypeLabel = (context = {}) => {
  const explicitLabel = normalizeEventText(
    typeof context === "string"
      ? ""
      : context?.competition_type_label || context?.competitionTypeLabel
  );
  if (explicitLabel) return explicitLabel;

  const participantShape = normalizeEventText(
    typeof context === "string"
      ? context
      : context?.participant_shape || context?.participantShape
  ).toUpperCase();
  if (participantShape === "SOLO") return "Individual";
  if (participantShape === "DUO") return "Pair";
  if (participantShape === "TEAM") return "Team";
  return "";
};

export const getActionCategory = (action = {}, sportKey = "", backendConfig = null) => {
  const eventType = String(action?.event_type || action?.type || "").trim().toUpperCase();
  const fallbackCategory = inferFallbackCategoryByEventType(eventType, sportKey);

  const explicitGroup = normalizeActionGroup(action?.group || action?.category || action?.tab || action?.section || "");
  if (explicitGroup && VALID_ACTION_GROUPS.has(explicitGroup)) {
    if (explicitGroup !== "other" || fallbackCategory === "other") return explicitGroup;
  }

  if (!eventType) return "other";
  const eventConfig = Array.isArray(backendConfig?.event_types)
    ? backendConfig.event_types.find((row) => String(row?.name || "").trim().toUpperCase() === eventType)
    : null;
  const explicitEventGroup = normalizeActionGroup(
    eventConfig?.group || eventConfig?.category || eventConfig?.tab || eventConfig?.section || ""
  );
  if (explicitEventGroup && VALID_ACTION_GROUPS.has(explicitEventGroup)) {
    if (explicitEventGroup !== "other" || fallbackCategory === "other") return explicitEventGroup;
  }

  return fallbackCategory;
};

export const getSportStateLabel = (sportKey, mode = "possession") => {
  const key = String(sportKey || "").toLowerCase();
  if (mode === "server") {
    if (key.includes("tennis") || key.includes("badminton")) return "Service";
    return "Server";
  }
  if (mode === "batting") {
    if (key.includes("baseball") || key.includes("softball")) return "Batting";
    return "Side";
  }
  if (mode === "fielding") return "Fielding";
  if (mode === "athlete") return key.includes("boxing") ? "Athlete" : "Competitor";
  if (mode === "lane") return "Lane";
  return "Possession";
};

export const getLineupRequirementLabel = ({ activePlayersPerSide = 0, lineupLabel = "Active Lineup" } = {}) => {
  const count = Number(activePlayersPerSide || 0);
  if (!count) return lineupLabel;
  return `${lineupLabel} (${count})`;
};

export const getSuggestedActionsForSport = ({
  sportKey,
  controls = [],
  backendRecommendedEventTypes = [],
  pinnedEventTypes = [],
  recentlyUsedEventTypes = [],
  activeGroupControls = [],
  limit = 6
} = {}) => {
  const normalizedSportKey = String(sportKey || "").toLowerCase();
  const resolvedDefaults = Object.entries(SPORT_DEFAULT_SUGGESTED_EVENT_TYPES).find(([key]) => normalizedSportKey.includes(key))?.[1] || [];
  const controlRows = Array.isArray(controls) ? controls.filter((row) => row && typeof row === "object") : [];
  const enabledControls = controlRows.filter((row) => row?.enabled !== false);
  const byEventType = new Map(
    enabledControls.map((control) => [String(control?.event_type || "").toUpperCase(), control]).filter(([eventType]) => eventType)
  );

  const preferredEventTypes = [
    ...(Array.isArray(pinnedEventTypes) ? pinnedEventTypes : []),
    ...(Array.isArray(backendRecommendedEventTypes) ? backendRecommendedEventTypes : []),
    ...resolvedDefaults,
    ...(Array.isArray(recentlyUsedEventTypes) ? recentlyUsedEventTypes : []),
  ].map((eventType) => String(eventType || "").toUpperCase()).filter(Boolean);

  const selected = [];
  const selectedIds = new Set();
  preferredEventTypes.forEach((eventType) => {
    if (selected.length >= limit) return;
    const row = byEventType.get(eventType);
    if (!row) return;
    const id = String(row?.id || "");
    if (!id || selectedIds.has(id)) return;
    selected.push(row);
    selectedIds.add(id);
  });

  const activeControls = sortControlsByPriority(Array.isArray(activeGroupControls) ? activeGroupControls : []);
  activeControls.forEach((control) => {
    if (selected.length >= limit) return;
    const id = String(control?.id || "");
    if (!id || selectedIds.has(id) || control?.enabled === false) return;
    selected.push(control);
    selectedIds.add(id);
  });

  sortControlsByPriority(enabledControls).forEach((control) => {
    if (selected.length >= limit) return;
    const id = String(control?.id || "");
    if (!id || selectedIds.has(id)) return;
    selected.push(control);
    selectedIds.add(id);
  });

  return selected.slice(0, Math.max(1, Number(limit) || 6));
};

export const getStateEffectForAction = ({
  sportStateMode,
  sportKey,
  eventType,
  actingTeamId,
  opponentTeamId
} = {}) => {
  const normalizedSportKey = String(sportKey || "").toLowerCase();
  const inferredMode = normalizedSportKey.includes("volleyball")
    || normalizedSportKey.includes("badminton")
    || normalizedSportKey.includes("tennis")
    ? "server"
    : normalizedSportKey.includes("baseball") || normalizedSportKey.includes("softball")
      ? "batting"
      : normalizedSportKey.includes("boxing") || normalizedSportKey.includes("combat")
        ? "athlete"
        : "possession";
  const normalizedMode = String(sportStateMode || inferredMode || "none").toLowerCase();
  const normalizedEventType = String(eventType || "").toUpperCase();
  const teamId = Number(actingTeamId || 0);
  const opponentId = Number(opponentTeamId || 0);
  const isNeutral = NEUTRAL_STATE_EVENT_PATTERNS.some((pattern) => normalizedEventType.includes(pattern));
  if (!normalizedEventType || normalizedMode === "none" || normalizedMode === "athlete") return { mode: "none", nextTeamId: null };
  if (isNeutral) return { mode: "none", nextTeamId: null };

  if (normalizedMode === "possession") {
    const autoOpponentEvents = new Set(["TWO_PT_MADE", "THREE_PT_MADE", "FIELD_GOAL_MADE", "TURNOVER"]);
    const autoTeamEvents = new Set(["STEAL", "DEFENSIVE_REBOUND"]);
    const suggestEvents = new Set(["FREE_THROW", "FOUL", "TECHNICAL_FOUL", "VIOLATION", "OUT_OF_BOUNDS", "JUMP_BALL", "REBOUND"]);
    if (autoOpponentEvents.has(normalizedEventType) && opponentId > 0) return { mode: "auto", nextTeamId: opponentId };
    if (autoTeamEvents.has(normalizedEventType) && teamId > 0) return { mode: "auto", nextTeamId: teamId };
    if (suggestEvents.has(normalizedEventType)) {
      const preferredTeamId = normalizedEventType === "REBOUND" ? null : (opponentId > 0 ? opponentId : null);
      return { mode: "suggest", nextTeamId: preferredTeamId };
    }
    return { mode: "none", nextTeamId: null };
  }

  if (normalizedMode === "server") {
    if (normalizedEventType.includes("FAULT") && opponentId > 0) return { mode: "suggest", nextTeamId: opponentId };
    if (
      normalizedEventType.includes("RALLY_WIN")
      || normalizedEventType.includes("POINT")
      || normalizedEventType.includes("ACE")
    ) {
      return teamId > 0 ? { mode: "suggest", nextTeamId: teamId } : { mode: "suggest", nextTeamId: null };
    }
    return { mode: "none", nextTeamId: null };
  }

  if (normalizedMode === "batting") {
    if (normalizedEventType.includes("SIDE_CHANGE") || normalizedEventType.includes("INNING_ADVANCE")) {
      return opponentId > 0 ? { mode: "auto", nextTeamId: opponentId } : { mode: "suggest", nextTeamId: null };
    }
    if (normalizedEventType.includes("OUT")) return opponentId > 0 ? { mode: "suggest", nextTeamId: opponentId } : { mode: "suggest", nextTeamId: null };
    return { mode: "none", nextTeamId: null };
  }

  return { mode: "none", nextTeamId: null };
};

export const getPossessionEffectForAction = (params = {}) => getStateEffectForAction(params);

export const getContextPlayersForState = ({
  participantState,
  rosterByTeamId,
  teamId,
  includeBench = false
} = {}) => {
  const resolvedTeamId = Number(teamId || 0);
  if (!resolvedTeamId) return { activePlayers: [], benchPlayers: [] };

  const sides = participantState?.sides && typeof participantState.sides === "object" ? participantState.sides : {};
  const side = Object.values(sides).find((row) => Number(row?.team_id) === resolvedTeamId) || null;
  const activePlayers = Array.isArray(side?.active_players)
    ? side.active_players.map((player) => ({
      id: Number(player?.id),
      name: String(player?.name || "Unknown player"),
      lastName: String(player?.last_name || "").trim(),
      jerseyNumber: player?.jersey_number ?? player?.jersey_no ?? player?.jerseyNo ?? player?.shirt_number ?? player?.number ?? "",
    }))
    : [];
  const benchPlayersFromState = Array.isArray(side?.bench_players)
    ? side.bench_players.map((player) => ({
      id: Number(player?.id),
      name: String(player?.name || "Unknown player"),
      lastName: String(player?.last_name || "").trim(),
      jerseyNumber: player?.jersey_number ?? player?.jersey_no ?? player?.jerseyNo ?? player?.shirt_number ?? player?.number ?? "",
    }))
    : [];
  const roster = Array.isArray(rosterByTeamId?.[resolvedTeamId]) ? rosterByTeamId[resolvedTeamId] : [];
  const fallbackActive = roster.map((player) => ({
    id: Number(player?.id),
    name: String(player?.full_name || [player?.first_name, player?.last_name].filter(Boolean).join(" ").trim() || "Unknown player"),
    lastName: String(player?.last_name || "").trim(),
    jerseyNumber: player?.jersey_number ?? player?.jersey_no ?? player?.jerseyNo ?? player?.shirt_number ?? player?.number ?? "",
  }));
  const resolvedActivePlayers = activePlayers.length > 0 ? activePlayers : fallbackActive;
  const activeIds = new Set(resolvedActivePlayers.map((row) => Number(row.id)));
  const fallbackBench = roster
    .filter((player) => !activeIds.has(Number(player?.id)))
    .map((player) => ({
      id: Number(player?.id),
      name: String(player?.full_name || [player?.first_name, player?.last_name].filter(Boolean).join(" ").trim() || "Unknown player"),
      lastName: String(player?.last_name || "").trim(),
      jerseyNumber: player?.jersey_number ?? player?.jersey_no ?? player?.jerseyNo ?? player?.shirt_number ?? player?.number ?? "",
    }));
  const benchPlayers = benchPlayersFromState.length > 0 ? benchPlayersFromState : fallbackBench;

  return {
    activePlayers: resolvedActivePlayers,
    benchPlayers: includeBench ? benchPlayers : []
  };
};

export const truncateText = (value, maxLength = 24) => truncateMiddle(value, maxLength);
