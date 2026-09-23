import { normalizeSportKey } from "../../../components/brackets/utils/sportUiProfile.js";

const availability = (unified = true, specialized = false) => Object.freeze({ unified, specialized });
const metric = (key, label, fullLabel, sourceKeys, options = {}) => Object.freeze({
  key,
  label,
  fullLabel,
  scope: options.scope || "player",
  unit: options.unit || "count",
  sourceKeys: Object.freeze(sourceKeys),
  analyticsKeys: Object.freeze(options.analyticsKeys || []),
  priority: options.priority || "primary",
  provenance: options.provenance || "direct",
  runtimeAvailability: options.runtimeAvailability || availability(),
  sortDirection: options.sortDirection || "desc",
});

const unavailableOnSpecialized = availability(true, false);
const authoritativeResult = availability(true, true);

const m = {
  points: metric("points", "PTS", "Points", ["POINTS"], { unit: "points" }),
  assists: metric("assists", "AST", "Assists", ["ASSIST", "ASSISTS"]),
  rebounds: metric("rebounds", "REB", "Rebounds", ["REBOUND", "REBOUNDS"]),
  steals: metric("steals", "STL", "Steals", ["STEAL", "STEALS"]),
  blocks: metric("blocks", "BLK", "Blocks", ["BLOCK", "BLOCKS"]),
  turnovers: metric("turnovers", "TO", "Turnovers", ["TURNOVER", "TURNOVERS"], { sortDirection: "asc" }),
  freeThrowsMade: metric("freeThrowsMade", "FT", "Free Throws Made", ["FREE_THROW", "FREE_THROW_MADE"], { priority: "secondary" }),
  twoPointMade: metric("twoPointMade", "2PM", "Two-point Makes", ["TWO_PT_MADE", "TWO_POINT_MADE", "FIELD_GOAL_2_MADE"], { priority: "secondary" }),
  threePointMade: metric("threePointMade", "3PM", "Three-point Makes", ["THREE_PT_MADE", "THREE_POINT_MADE", "FIELD_GOAL_3_MADE"], { priority: "secondary" }),
  fouls: metric("fouls", "PF", "Fouls", ["FOUL", "PERSONAL_FOUL", "PERSONAL_FOULS"], { priority: "secondary", sortDirection: "asc" }),
  technicalFouls: metric("technicalFouls", "TECH", "Technical Fouls", ["TECHNICAL_FOUL", "TECHNICAL_FOULS"], { priority: "secondary", sortDirection: "asc" }),
  rallyWins: metric("rallyWins", "RALLY", "Rally Contributions", ["RALLY_WIN", "RALLY_WON"], { priority: "secondary" }),
  serviceAces: metric("serviceAces", "ACE", "Service Aces", ["SERVICE_ACE", "SERVICE_ACES", "ACE", "ACES"]),
  kills: metric("kills", "KILL", "Kills", ["KILL", "KILLS"]),
  blockPoints: metric("blockPoints", "BLK", "Block Points", ["BLOCK_POINT", "BLOCK_POINTS"]),
  serviceFaults: metric("serviceFaults", "SF", "Service Faults", ["SERVE_FAULT", "SERVICE_FAULT", "SERVICE_FAULTS"], { priority: "secondary", sortDirection: "asc" }),
  netFaults: metric("netFaults", "NF", "Net Faults", ["NET_FAULT", "NET_TOUCH_FAULT", "NET_FAULTS"], { priority: "secondary", sortDirection: "asc" }),
  footFaults: metric("footFaults", "FF", "Foot Faults", ["FOOT_FAULT", "FOOT_FAULTS"], { priority: "secondary", sortDirection: "asc" }),
  smashWins: metric("smashWins", "SMASH", "Smash Wins", ["SMASH_WIN", "SMASH_WINS"]),
  rollSpikes: metric("rollSpikes", "SPIKE", "Roll Spikes", ["ROLL_SPIKE", "ROLL_SPIKES"]),
  faults: metric("faults", "FAULT", "Faults", ["FAULT", "FAULTS"], { priority: "secondary", sortDirection: "asc" }),
  breakPointsConverted: metric("breakPointsConverted", "BP", "Break Points Converted", ["BREAK_POINT_CONVERTED", "BREAK_POINTS_CONVERTED"]),
  doubleFaults: metric("doubleFaults", "DF", "Double Faults", ["DOUBLE_FAULT", "DOUBLE_FAULTS"], { priority: "secondary", sortDirection: "asc" }),
  goals: metric("goals", "G", "Goals", ["GOAL", "GOALS"]),
  yellowCards: metric("yellowCards", "YC", "Yellow Cards", ["YELLOW_CARD", "YELLOW_CARDS"], { sortDirection: "asc" }),
  redCards: metric("redCards", "RC", "Red Cards", ["RED_CARD", "RED_CARDS"], { sortDirection: "asc" }),
  penaltyGoals: metric("penaltyGoals", "PEN", "Penalty Goals", ["PENALTY_GOAL", "PENALTY_SCORED", "PENALTIES_SCORED"], { priority: "secondary" }),
  ownGoals: metric("ownGoals", "OG", "Own Goals", ["OWN_GOAL", "OWN_GOALS"], { priority: "secondary", sortDirection: "asc" }),
  suspensions: metric("suspensions", "2MIN", "Two-minute Suspensions", ["TWO_MIN_SUSPENSION", "TWO_MINUTE_SUSPENSION", "SUSPENSIONS"], { sortDirection: "asc" }),
  sevenMeterGoals: metric("sevenMeterGoals", "7M", "Seven-metre Goals", ["SEVEN_METER_GOAL", "SEVEN_METER_SCORED", "SEVEN_METRE_SCORED"], { priority: "secondary" }),
  fastBreakGoals: metric("fastBreakGoals", "FB", "Fast-break Goals", ["FAST_BREAK_GOAL", "FAST_BREAK_GOALS"], { priority: "secondary" }),
  runs: metric("runs", "R", "Runs", ["RUN_SCORED", "RUNS", "RUNS_SCORED"], { runtimeAvailability: unavailableOnSpecialized }),
  hits: metric("hits", "H", "Hits", ["HIT", "HITS"], { runtimeAvailability: unavailableOnSpecialized }),
  rbi: metric("rbi", "RBI", "Runs Batted In", ["RBI", "RUNS_BATTED_IN"], { runtimeAvailability: unavailableOnSpecialized }),
  walks: metric("walks", "BB", "Walks", ["WALK", "WALKS"], { runtimeAvailability: unavailableOnSpecialized }),
  strikeouts: metric("strikeouts", "SO", "Strikeouts", ["STRIKEOUT", "STRIKEOUTS"], { runtimeAvailability: unavailableOnSpecialized, sortDirection: "asc" }),
  errors: metric("errors", "E", "Errors", ["ERROR", "ERROR_RECORDED", "ERRORS"], { runtimeAvailability: unavailableOnSpecialized, sortDirection: "asc" }),
  knockdowns: metric("knockdowns", "KD", "Knockdowns", ["KNOCKDOWN", "KNOCKDOWNS"], { priority: "secondary", runtimeAvailability: unavailableOnSpecialized }),
  warnings: metric("warnings", "WARN", "Warnings", ["WARNING", "WARNINGS"], { priority: "secondary", runtimeAvailability: unavailableOnSpecialized, sortDirection: "asc" }),
  punches: metric("punches", "PUNCH", "Punches", ["PUNCH", "PUNCHES"], { priority: "secondary", runtimeAvailability: unavailableOnSpecialized }),
  result: metric("result", "RESULT", "Result", ["RESULT", "RESULT_REASON", "result", "result_reason"], { unit: "text", runtimeAvailability: authoritativeResult, sortDirection: "none" }),
  illegalMoves: metric("illegalMoves", "ILLEGAL", "Illegal Moves", ["ILLEGAL_MOVE", "ILLEGAL_MOVES"], { priority: "secondary", runtimeAvailability: unavailableOnSpecialized, sortDirection: "asc" }),
  touchMoveWarnings: metric("touchMoveWarnings", "WARN", "Touch-move Warnings", ["TOUCH_MOVE_WARNING", "TOUCH_MOVE_WARNINGS"], { priority: "secondary", runtimeAvailability: unavailableOnSpecialized, sortDirection: "asc" }),
  score: metric("score", "SCORE", "Score", ["SCORE", "score", "SCORE_TOTAL"], { unit: "points", runtimeAvailability: authoritativeResult }),
  arrow10s: metric("arrow10s", "10s", "10s", ["ARROW_10"], { priority: "secondary", runtimeAvailability: unavailableOnSpecialized }),
  arrow9s: metric("arrow9s", "9s", "9s", ["ARROW_9"], { priority: "secondary", runtimeAvailability: unavailableOnSpecialized }),
  misses: metric("misses", "MISS", "Misses", ["MISS", "MISSES"], { priority: "secondary", runtimeAvailability: unavailableOnSpecialized, sortDirection: "asc" }),
  rank: metric("rank", "RANK", "Rank", ["PLACEMENT", "RANK", "placement", "rank"], { unit: "rank", runtimeAvailability: authoritativeResult, sortDirection: "asc" }),
  officialTime: metric("officialTime", "TIME", "Official Time", ["FINISH_TIME", "TIME", "finish_time", "time"], { unit: "seconds", runtimeAvailability: authoritativeResult, sortDirection: "asc" }),
  resultStatus: metric("resultStatus", "STATUS", "Status", ["RESULT_STATUS", "STATUS", "result_status", "status"], { unit: "status", runtimeAvailability: authoritativeResult, sortDirection: "none" }),
  falseStarts: metric("falseStarts", "FS", "False Starts", ["FALSE_START", "FALSE_STARTS"], { priority: "secondary", runtimeAvailability: unavailableOnSpecialized, sortDirection: "asc" }),
  laneViolations: metric("laneViolations", "LANE", "Lane Violations", ["LANE_VIOLATION", "LANE_VIOLATIONS"], { priority: "secondary", runtimeAvailability: unavailableOnSpecialized, sortDirection: "asc" }),
  turnViolations: metric("turnViolations", "TURN", "Turn Violations", ["TURN_VIOLATION", "TURN_VIOLATIONS"], { priority: "secondary", runtimeAvailability: unavailableOnSpecialized, sortDirection: "asc" }),
};

const profile = (family, primary, secondary = [], sortKey = null) => Object.freeze({
  family,
  primaryMetrics: Object.freeze(primary),
  secondaryMetrics: Object.freeze(secondary),
  sortKey: sortKey || primary[0] || null,
  metrics: Object.freeze(Object.fromEntries([...primary, ...secondary].map((key) => [key, m[key]]))),
});

export const SPORT_STATISTICS_PROFILES = Object.freeze({
  basketball: profile("team_scoring", ["points", "assists", "rebounds", "steals", "blocks", "turnovers"], ["freeThrowsMade", "twoPointMade", "threePointMade", "fouls", "technicalFouls"], "points"),
  volleyball: profile("rally_set", ["serviceAces", "kills", "blockPoints"], ["rallyWins", "netFaults"], "serviceAces"),
  badminton: profile("rally_set", ["smashWins", "serviceAces"], ["rallyWins", "serviceFaults", "footFaults"], "smashWins"),
  beach_volleyball_2v2: profile("rally_set", ["serviceAces", "kills", "blockPoints"], ["rallyWins", "serviceFaults", "netFaults"], "serviceAces"),
  takraw: profile("rally_set", ["serviceAces", "rollSpikes"], ["rallyWins", "netFaults", "footFaults"], "serviceAces"),
  tennis_doubles: profile("rally_set", ["serviceAces", "breakPointsConverted"], ["doubleFaults", "faults"], "serviceAces"),
  table_tennis_doubles: profile("rally_set", ["serviceAces", "rallyWins"], ["faults", "netFaults"], "serviceAces"),
  football_11v11: profile("team_scoring", ["goals", "yellowCards", "redCards", "fouls"], ["penaltyGoals", "ownGoals"], "goals"),
  handball_7v7: profile("team_scoring", ["goals", "yellowCards", "suspensions", "redCards", "turnovers"], ["sevenMeterGoals", "fastBreakGoals", "fouls"], "goals"),
  baseball_9v9: profile("inning", ["hits", "runs", "rbi", "walks", "strikeouts", "errors"], [], "hits"),
  boxing: profile("combat", ["result"], ["knockdowns", "warnings", "punches"], null),
  chess: profile("board_result", ["result"], ["illegalMoves", "touchMoveWarnings"], null),
  archery_recurve_individual: profile("precision", ["score"], ["arrow10s", "arrow9s", "misses"], "score"),
  athletics_100m_sprint: profile("timed_result", ["rank", "officialTime", "resultStatus"], ["falseStarts", "laneViolations"], "rank"),
  swimming_100m_freestyle: profile("timed_result", ["rank", "officialTime", "resultStatus"], ["falseStarts", "turnViolations"], "rank"),
});

const SPORT_KEY_ALIASES = Object.freeze({
  beach_volleyball: "beach_volleyball_2v2",
  sepak_takraw: "takraw",
  table_tennis: "table_tennis_doubles",
  football: "football_11v11",
  handball: "handball_7v7",
  baseball: "baseball_9v9",
  archery: "archery_recurve_individual",
  athletics: "athletics_100m_sprint",
  swimming: "swimming_100m_freestyle",
  tennis: "tennis_doubles",
});

export const getSportStatisticsProfile = (sportKey) => {
  const normalized = normalizeSportKey(sportKey).replace(/[\s-]+/g, "_");
  return SPORT_STATISTICS_PROFILES[normalized]
    || SPORT_STATISTICS_PROFILES[SPORT_KEY_ALIASES[normalized]]
    || null;
};

export const getConfiguredStatisticsSportKeys = () => Object.keys(SPORT_STATISTICS_PROFILES);

export const resolveActionAttributionPolicy = ({ control, eventDefinition } = {}) => {
  if (control?.requires_player === true || eventDefinition?.has_player === true) return "REQUIRED_EXISTING_ONLY";
  const hasTeamOrSide = control?.requires_team === true
    || eventDefinition?.has_team === true
    || Boolean(control?.team_scope || eventDefinition?.team_scope);
  const type = String(control?.event_type || eventDefinition?.name || "").trim().toUpperCase();
  const nonPlayerControl = /(?:CLOCK|TIMEOUT|INTERVAL|PERIOD|QUARTER|ROUND_ADVANCE|SET_ADVANCE|HALF_ADVANCE|INNING_ADVANCE|POSSESSION|SERVER|SERVICE_SET|CHANGE_SERVER)/.test(type);
  if (nonPlayerControl) return "NONE";
  return hasTeamOrSide ? "OPTIONAL" : "NONE";
};

export const classifyEventAttribution = ({ event, policy } = {}) => {
  if (policy === "NONE") return "not_required";
  const playerId = Number(event?.player_id ?? event?.actor_id);
  return Number.isInteger(playerId) && playerId > 0 ? "attributed" : "unattributed";
};
