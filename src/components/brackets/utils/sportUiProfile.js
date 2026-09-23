const SPORT_MODE = {
  HEAD_TO_HEAD: "HEAD_TO_HEAD",
  MULTI_PARTICIPANT_RESULT: "MULTI_PARTICIPANT_RESULT",
  COMBAT: "COMBAT",
  SET_BASED: "SET_BASED",
  BOARD_GAME: "BOARD_GAME",
};

const PARTICIPANT_MODEL = {
  TEAM: "TEAM",
  PLAYER: "PLAYER",
  ATHLETE: "ATHLETE",
  LANE: "LANE",
  HEAT: "HEAT",
  BOARD: "BOARD",
};

const STATE_LABEL = {
  POSSESSION: "Possession",
  SERVER: "Server",
  BATTING: "Batting",
  ROUND: "Round",
  NONE: "None",
};

export const SCORING_PROFILE_FAMILY = Object.freeze({
  TIMED_TEAM: "TIMED_TEAM",
  SET_RALLY: "SET_RALLY",
  GAME_SET_MATCH: "GAME_SET_MATCH",
  RESULT: "RESULT",
  TIMED_RACE: "TIMED_RACE",
  JUDGE_SCORECARD: "JUDGE_SCORECARD",
  COUNT_OR_TARGET: "COUNT_OR_TARGET",
  INNING: "INNING",
  LEGACY: "LEGACY",
});

const PROFILE_FAMILY_BY_ENGINE = Object.freeze({
  TIMED_TEAM: SCORING_PROFILE_FAMILY.TIMED_TEAM,
  SETS: SCORING_PROFILE_FAMILY.SET_RALLY,
  GAME_SET_MATCH: SCORING_PROFILE_FAMILY.GAME_SET_MATCH,
  WIN_LOSS: SCORING_PROFILE_FAMILY.RESULT,
  TIMED_RACE: SCORING_PROFILE_FAMILY.TIMED_RACE,
  PLACEMENT: SCORING_PROFILE_FAMILY.TIMED_RACE,
  JUDGE_SCORECARD: SCORING_PROFILE_FAMILY.JUDGE_SCORECARD,
  COUNT_OR_TARGET: SCORING_PROFILE_FAMILY.COUNT_OR_TARGET,
  INNING: SCORING_PROFILE_FAMILY.INNING,
});

const normalizeEngineType = (value) => String(value || "").trim().toUpperCase();

export const resolveCanonicalEngineType = ({ eventConfig, ruleSnapshot, liveState } = {}) =>
  normalizeEngineType(
    eventConfig?.runtime_governance?.engine_type
    || eventConfig?.runtime_model?.engine_type
    || eventConfig?.match_logic?.engine_type
    || ruleSnapshot?.engine_type
    || liveState?.rule_snapshot?.engine_type
  );

export const resolveScoringProfileFamily = ({
  engineType,
  eventConfig,
  ruleSnapshot,
  liveState,
} = {}) => {
  const canonicalEngineType = normalizeEngineType(
    engineType || resolveCanonicalEngineType({ eventConfig, ruleSnapshot, liveState })
  );
  return {
    engineType: canonicalEngineType,
    profileFamily: PROFILE_FAMILY_BY_ENGINE[canonicalEngineType] || "",
    source: PROFILE_FAMILY_BY_ENGINE[canonicalEngineType] ? "CANONICAL_ENGINE" : "LEGACY_FALLBACK",
  };
};

const MODE_BY_SPORT = {
  basketball: SPORT_MODE.HEAD_TO_HEAD,
  volleyball: SPORT_MODE.SET_BASED,
  beach_volleyball_2v2: SPORT_MODE.SET_BASED,
  badminton: SPORT_MODE.SET_BASED,
  tennis_doubles: SPORT_MODE.SET_BASED,
  table_tennis_doubles: SPORT_MODE.SET_BASED,
  takraw: SPORT_MODE.SET_BASED,
  football_11v11: SPORT_MODE.HEAD_TO_HEAD,
  handball_7v7: SPORT_MODE.HEAD_TO_HEAD,
  baseball_9v9: SPORT_MODE.HEAD_TO_HEAD,
  boxing: SPORT_MODE.COMBAT,
  athletics_100m_sprint: SPORT_MODE.MULTI_PARTICIPANT_RESULT,
  swimming_100m_freestyle: SPORT_MODE.MULTI_PARTICIPANT_RESULT,
  archery_recurve_individual: SPORT_MODE.HEAD_TO_HEAD,
  chess: SPORT_MODE.BOARD_GAME,
};

const SERVICE_SPORT_KEYS = ["volleyball", "badminton", "tennis", "table_tennis", "takraw"];
const BATTING_SPORT_KEYS = ["baseball", "softball", "cricket"];
const COMBAT_SPORT_KEYS = ["boxing", "taekwondo", "karate", "judo", "wrestling"];
const POSSESSION_SPORT_KEYS = ["basketball", "football_11v11", "handball_7v7", "futsal"];

const LINEUP_TEAM_SIZE_BY_SPORT = {
  basketball: 5,
  volleyball: 6,
  takraw: 3,
  sepak_takraw: 3,
  football_11v11: 11,
  handball_7v7: 7,
  baseball_9v9: 9,
};

const SUBSTITUTION_SPORTS = new Set(["basketball", "volleyball", "takraw", "sepak_takraw", "football_11v11", "handball_7v7", "baseball_9v9"]);
const SHOT_CLOCK_SPORTS = new Set(["basketball"]);

const asPositiveInt = (value) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const normalizeSportKey = (value) => String(value || "").trim().toLowerCase();

const matchesAnyToken = (sportKey, tokens) => tokens.some((token) => sportKey.includes(token));

const inferModeFromMetadata = ({ sportKey, matchType, sportProfile, winConditions }) => {
  if (matchType === "RESULT" || sportProfile === "TURN_BASED") {
    if (sportKey.includes("chess")) return SPORT_MODE.BOARD_GAME;
    if (matchesAnyToken(sportKey, COMBAT_SPORT_KEYS)) return SPORT_MODE.COMBAT;
    if (winConditions.length > 0) return SPORT_MODE.MULTI_PARTICIPANT_RESULT;
  }
  if (matchType === "SETS" || sportProfile === "SET_MATCH") return SPORT_MODE.SET_BASED;
  if (matchType === "ROUND_BASED" && matchesAnyToken(sportKey, COMBAT_SPORT_KEYS)) return SPORT_MODE.COMBAT;
  if (matchType === "ROUND_BASED") return SPORT_MODE.HEAD_TO_HEAD;
  if (matchType === "TIME" || matchType === "SCORE") return SPORT_MODE.HEAD_TO_HEAD;
  return SPORT_MODE.HEAD_TO_HEAD;
};

const resolveScoringMode = ({ sportKey, matchType, sportProfile, winConditions }) => {
  const exact = MODE_BY_SPORT[sportKey];
  if (exact) return exact;

  if (matchesAnyToken(sportKey, ["athletics", "swimming", "freestyle", "sprint", "race"])) {
    return SPORT_MODE.MULTI_PARTICIPANT_RESULT;
  }
  if (matchesAnyToken(sportKey, COMBAT_SPORT_KEYS)) return SPORT_MODE.COMBAT;
  if (sportKey.includes("chess")) return SPORT_MODE.BOARD_GAME;
  return inferModeFromMetadata({ sportKey, matchType, sportProfile, winConditions });
};

const resolveParticipantModel = ({ scoringMode, sportKey }) => {
  if (scoringMode === SPORT_MODE.BOARD_GAME) return PARTICIPANT_MODEL.BOARD;
  if (scoringMode === SPORT_MODE.COMBAT || sportKey.includes("archery")) return PARTICIPANT_MODEL.ATHLETE;
  if (scoringMode === SPORT_MODE.MULTI_PARTICIPANT_RESULT) {
    if (matchesAnyToken(sportKey, ["swimming", "athletics", "race", "sprint", "freestyle"])) return PARTICIPANT_MODEL.LANE;
    return PARTICIPANT_MODEL.HEAT;
  }
  return PARTICIPANT_MODEL.TEAM;
};

const resolveStateLabel = ({ scoringMode, sportKey, matchType, displayEnabled, hasStateMetadata }) => {
  if (scoringMode === SPORT_MODE.BOARD_GAME || scoringMode === SPORT_MODE.MULTI_PARTICIPANT_RESULT) return STATE_LABEL.NONE;
  if (scoringMode === SPORT_MODE.COMBAT || matchType === "ROUND_BASED") return STATE_LABEL.ROUND;
  if (hasStateMetadata) {
    if (displayEnabled.server) return STATE_LABEL.SERVER;
    if (displayEnabled.batting) return STATE_LABEL.BATTING;
    if (displayEnabled.possession) return STATE_LABEL.POSSESSION;
    if (displayEnabled.round) return STATE_LABEL.ROUND;
    return STATE_LABEL.NONE;
  }
  if (displayEnabled.server || matchesAnyToken(sportKey, SERVICE_SPORT_KEYS)) return STATE_LABEL.SERVER;
  if (displayEnabled.batting || matchesAnyToken(sportKey, BATTING_SPORT_KEYS)) return STATE_LABEL.BATTING;
  if (displayEnabled.possession || matchesAnyToken(sportKey, POSSESSION_SPORT_KEYS)) return STATE_LABEL.POSSESSION;
  return STATE_LABEL.NONE;
};

const resolveLineupAndSubstitution = ({ scoringMode, sportKey }) => {
  if (scoringMode === SPORT_MODE.MULTI_PARTICIPANT_RESULT || scoringMode === SPORT_MODE.BOARD_GAME || scoringMode === SPORT_MODE.COMBAT) {
    return {
      supportsLineup: false,
      supportsBench: false,
      supportsSubstitution: false,
      activePlayersPerSide: 0,
      lineupLabel: "Participants",
    };
  }

  const activePlayersPerSide = LINEUP_TEAM_SIZE_BY_SPORT[sportKey] || 0;
  const supportsLineup = activePlayersPerSide > 0;
  const supportsSubstitution = SUBSTITUTION_SPORTS.has(sportKey);
  return {
    supportsLineup,
    supportsBench: supportsLineup,
    supportsSubstitution,
    activePlayersPerSide,
    lineupLabel: activePlayersPerSide > 0 ? "Active Lineup" : "Participants",
  };
};

export const getSportUiProfile = (sportKeyInput, ruleSnapshot = null, eventConfig = null, liveState = null) => {
  const sportKey = normalizeSportKey(
    sportKeyInput
    || eventConfig?.sport_definition?.sport
    || eventConfig?.sport_id
    || ruleSnapshot?.sport
  );
  const matchType = String(eventConfig?.match_type || "").trim().toUpperCase().replace(" ", "_");
  const sportProfile = String(eventConfig?.sport_profile || "").trim().toUpperCase();
  const displayEnabledRaw = eventConfig?.display?.enabled && typeof eventConfig.display.enabled === "object"
    ? eventConfig.display.enabled
    : {};
  const displayWidgets = new Set([
    ...(Array.isArray(eventConfig?.display?.widgets) ? eventConfig.display.widgets : []),
    ...(Array.isArray(eventConfig?.ui_spec?.display?.widgets) ? eventConfig.ui_spec.display.widgets : []),
  ].map((widget) => String(widget || "").trim().toLowerCase()).filter(Boolean));
  const displayEnabled = {
    server: Boolean((displayEnabledRaw.server ?? displayEnabledRaw.service) ?? (displayWidgets.has("server") || displayWidgets.has("service"))),
    batting: Boolean(displayEnabledRaw.batting ?? displayWidgets.has("batting")),
    possession: Boolean(displayEnabledRaw.possession ?? displayWidgets.has("possession")),
    round: Boolean(displayEnabledRaw.round ?? displayWidgets.has("round")),
    clock: Boolean(displayEnabledRaw.clock ?? displayWidgets.has("clock")),
  };
  const hasStateMetadata =
    ["server", "service", "batting", "possession", "round"].some(
      (key) => Object.prototype.hasOwnProperty.call(displayEnabledRaw, key)
    )
    || displayWidgets.has("server")
    || displayWidgets.has("service")
    || displayWidgets.has("batting")
    || displayWidgets.has("possession")
    || displayWidgets.has("round");
  const winConditions = Array.isArray(eventConfig?.win_conditions)
    ? eventConfig.win_conditions.map((row) => String(row || "").trim()).filter(Boolean)
    : [];

  const canonicalProfile = resolveScoringProfileFamily({ eventConfig, ruleSnapshot, liveState });
  const compatibilityProfileFamily = !canonicalProfile.profileFamily && sportKey.includes("basketball")
    ? SCORING_PROFILE_FAMILY.TIMED_TEAM
    : "";
  const resolvedProfileFamily = canonicalProfile.profileFamily || compatibilityProfileFamily;
  const scoringMode = ({
    TIMED_TEAM: SPORT_MODE.HEAD_TO_HEAD,
    SET_RALLY: SPORT_MODE.SET_BASED,
    GAME_SET_MATCH: SPORT_MODE.SET_BASED,
    RESULT: SPORT_MODE.BOARD_GAME,
    TIMED_RACE: SPORT_MODE.MULTI_PARTICIPANT_RESULT,
    JUDGE_SCORECARD: SPORT_MODE.COMBAT,
    COUNT_OR_TARGET: SPORT_MODE.MULTI_PARTICIPANT_RESULT,
    INNING: SPORT_MODE.HEAD_TO_HEAD,
  })[resolvedProfileFamily]
    // Compatibility only: old unlocked snapshots may not carry runtime engine metadata.
    || resolveScoringMode({ sportKey, matchType, sportProfile, winConditions });
  const participantModel = resolveParticipantModel({ scoringMode, sportKey });
  const lineup = resolveLineupAndSubstitution({ scoringMode, sportKey });

  const participantProfile = eventConfig?.participant_profile && typeof eventConfig.participant_profile === "object"
    ? eventConfig.participant_profile
    : {};
  const maxSides =
    asPositiveInt(eventConfig?.sport_definition?.number_of_sides)
    || asPositiveInt(participantProfile.number_of_sides)
    || asPositiveInt(eventConfig?.rules?.number_of_sides)
    || null;

  const usesGameClock =
    displayEnabled.clock
    || matchType === "TIME"
    || matchType === "ROUND_BASED"
    || scoringMode === SPORT_MODE.COMBAT;

  return {
    engineType: canonicalProfile.engineType,
    profileFamily: resolvedProfileFamily || SCORING_PROFILE_FAMILY.LEGACY,
    profileSource: compatibilityProfileFamily ? "SPORT_COMPATIBILITY" : canonicalProfile.source,
    scoringMode,
    participantModel,
    supportsLineup: lineup.supportsLineup,
    supportsBench: lineup.supportsBench,
    supportsSubstitution: lineup.supportsSubstitution,
    stateLabel: resolveStateLabel({ scoringMode, sportKey, matchType, displayEnabled, hasStateMetadata }),
    usesGameClock,
    usesShotClock: SHOT_CLOCK_SPORTS.has(sportKey),
    usesService: matchesAnyToken(sportKey, SERVICE_SPORT_KEYS),
    maxSides,
    activePlayersPerSide: lineup.activePlayersPerSide,
    lineupLabel: lineup.lineupLabel,
  };
};
