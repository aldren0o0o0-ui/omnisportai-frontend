/**
 * Utility functions for Sport-Aware Entry & Player Performance Drawer
 */

export const SPORT_CATEGORIES = {
  BASKETBALL: "BASKETBALL",
  VOLLEYBALL: "VOLLEYBALL",
  BEACH_VOLLEYBALL: "VOLLEYBALL",
  FOOTBALL: "FOOTBALL",
  FUTSAL: "FOOTBALL",
  HANDBALL: "HANDBALL",
  BADMINTON: "RACKET",
  TABLE_TENNIS: "RACKET",
  TENNIS: "RACKET",
  SEPAK_TAKRAW: "SEPAK_TAKRAW",
  ARCHERY: "TARGET",
  ATHLETICS: "RACE",
  SWIMMING: "RACE",
  CHESS: "BOARD",
};

export const detectSportCategory = (sportName = "") => {
  const norm = String(sportName || "").trim().toUpperCase().replace(/\s+/g, "_");
  for (const [key, category] of Object.entries(SPORT_CATEGORIES)) {
    if (norm.includes(key)) return category;
  }
  return "GENERIC";
};

/**
 * Returns the primary metric definition for a sport category
 */
export const getPrimaryMetricConfig = (sportCategory, metricOptions = []) => {
  // If backend provided metric options, check for primary ranking metric
  const availableCodes = new Set(metricOptions.map((o) => o.code));

  switch (sportCategory) {
    case "BASKETBALL":
      return {
        key: availableCodes.has("POINTS_TOTAL") ? "POINTS_TOTAL" : "POINTS_SCORED",
        label: "Points",
        shortLabel: "PTS",
        unit: "",
        secondary: ["ASSISTS", "REBOUNDS", "STEALS", "BLOCKS"],
      };
    case "VOLLEYBALL":
      return {
        key: availableCodes.has("KILLS") ? "KILLS" : "RALLY_POINTS",
        label: availableCodes.has("KILLS") ? "Kills" : "Points",
        shortLabel: availableCodes.has("KILLS") ? "Kills" : "PTS",
        unit: "",
        secondary: ["BLOCKS", "SERVICE_ACES", "DIGS", "ERRORS"],
      };
    case "FOOTBALL":
    case "HANDBALL":
      return {
        key: "GOALS",
        label: "Goals",
        shortLabel: "GLS",
        unit: "",
        secondary: ["ASSISTS", "YELLOW_CARDS", "RED_CARDS", "MATCHES_PLAYED"],
      };
    case "RACKET":
      return {
        key: availableCodes.has("SETS_WON") ? "SETS_WON" : "WINS",
        label: availableCodes.has("SETS_WON") ? "Sets Won" : "Wins",
        shortLabel: availableCodes.has("SETS_WON") ? "Sets" : "W",
        unit: "",
        secondary: ["GAMES_WON", "ACES", "MATCHES_PLAYED"],
      };
    case "TARGET":
      return {
        key: availableCodes.has("TOTAL_SCORE") ? "TOTAL_SCORE" : "POINTS_SCORED",
        label: "Total Score",
        shortLabel: "Score",
        unit: "pts",
        secondary: ["AVERAGE_SCORE", "HITS", "MATCHES_PLAYED"],
      };
    case "RACE":
      return {
        key: "RANK",
        label: "Best Rank",
        shortLabel: "Rank",
        unit: "",
        isRank: true,
        secondary: ["OFFICIAL_TIME", "MATCHES_PLAYED"],
      };
    case "SEPAK_TAKRAW":
      return {
        key: availableCodes.has("SPIKES") ? "SPIKES" : "RALLY_POINTS",
        label: availableCodes.has("SPIKES") ? "Spikes" : "Points",
        shortLabel: availableCodes.has("SPIKES") ? "Spikes" : "PTS",
        unit: "",
        secondary: ["BLOCKS", "SERVICE_ACES", "ERRORS"],
      };
    default:
      return {
        key: availableCodes.has("POINTS_TOTAL") ? "POINTS_TOTAL" : "WINS",
        label: availableCodes.has("POINTS_TOTAL") ? "Points" : "Wins",
        shortLabel: availableCodes.has("POINTS_TOTAL") ? "PTS" : "W",
        unit: "",
        secondary: ["MATCHES_PLAYED", "COMPETITION_POINTS"],
      };
  }
};

/**
 * Format metric value with short badge label
 */
export const formatMetricBadge = (code, value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num)) return `${value} ${code}`;

  const labels = {
    POINTS_TOTAL: "PTS",
    POINTS_SCORED: "PTS",
    ASSISTS: "AST",
    REBOUNDS: "REB",
    STEALS: "STL",
    BLOCKS: "BLK",
    TURNOVERS: "TO",
    PERSONAL_FOULS: "PF",
    TECHNICAL_FOULS: "TECH",
    KILLS: "Kills",
    SERVICE_ACES: "Aces",
    SERVICE_FAULTS: "Faults",
    DIGS: "Digs",
    ERRORS: "Errors",
    GOALS: "Goals",
    YELLOW_CARDS: "Yellow",
    RED_CARDS: "Red",
    SETS_WON: "Sets",
    GAMES_WON: "Games",
    TOTAL_SCORE: "Score",
    AVERAGE_SCORE: "Avg",
    HITS: "Hits",
    MATCHES_PLAYED: "GP",
    WINS: "W",
    LOSSES: "L",
  };

  const label = labels[code] || code.replace(/_/g, " ").toLowerCase();
  return `${num} ${label}`;
};

/**
 * Check if the competition has entered a running or completed phase
 */
export const isCompetitionUnderway = (tournament, matches = []) => {
  const status = String(tournament?.lifecycle_status || tournament?.status || "").toUpperCase();
  if (["RUNNING", "LIVE", "ONGOING", "IN_PROGRESS", "COMPLETED", "FINISHED", "FINAL"].includes(status)) {
    return true;
  }
  return matches.some((m) => ["LIVE", "IN_PROGRESS", "COMPLETED", "FINAL", "FINISHED"].includes(String(m.status).toUpperCase()));
};

/**
 * Determine the Lifecycle Performance State:
 * State A: "NOT_STARTED" - No matches or records yet
 * State B: "STARTED_NO_STATS" - Competition is running/scheduled, but no player stats have been recorded yet
 * State C: "DATA_AVAILABLE" - Real match records or player performance data exist
 */
export const resolveDrawerPerformanceState = ({
  tournament,
  matches = [],
  playerAnalyticsRows = [],
  teamStandingRow = null,
}) => {
  const hasCompletedMatches = matches.some((m) =>
    ["COMPLETED", "FINISHED", "FINAL"].includes(String(m.status).toUpperCase())
  );
  const hasLiveMatches = matches.some((m) =>
    ["LIVE", "IN_PROGRESS"].includes(String(m.status).toUpperCase())
  );

  const hasPlayerStats = playerAnalyticsRows.some((p) => {
    const metrics = p.metrics || {};
    return Object.values(metrics).some((v) => Number(v) > 0);
  });

  const hasTeamStats = Boolean(
    teamStandingRow &&
    (Number(teamStandingRow.metrics?.MATCHES_PLAYED || 0) > 0 ||
      Number(teamStandingRow.metrics?.WINS || 0) > 0 ||
      Number(teamStandingRow.metrics?.LOSSES || 0) > 0)
  );

  if (hasPlayerStats || (hasCompletedMatches && hasTeamStats)) {
    return "DATA_AVAILABLE"; // State C
  }

  if (hasCompletedMatches || hasLiveMatches || isCompetitionUnderway(tournament, matches)) {
    return "STARTED_NO_STATS"; // State B
  }

  return "NOT_STARTED"; // State A
};

/**
 * Filter relevant matches for this entry/team from tournament schedule
 */
export const filterEntryMatches = (matches = [], { entryId, teamId, participantName }) => {
  if (!Array.isArray(matches) || matches.length === 0) return [];

  const targetEntryId = entryId ? Number(entryId) : null;
  const targetTeamId = teamId ? Number(teamId) : null;
  const targetName = participantName ? String(participantName).trim().toLowerCase() : "";

  return matches.filter((match) => {
    const e1 = Number(match.entry1_id || match.entry_1_id);
    const e2 = Number(match.entry2_id || match.entry_2_id);
    const t1 = Number(match.team1_id || match.team_1_id);
    const t2 = Number(match.team2_id || match.team_2_id);
    const n1 = String(match.team1_name || match.entry1_name || "").toLowerCase();
    const n2 = String(match.team2_name || match.entry2_name || "").toLowerCase();

    if (targetEntryId && (e1 === targetEntryId || e2 === targetEntryId)) return true;
    if (targetTeamId && (t1 === targetTeamId || t2 === targetTeamId)) return true;
    if (targetName && (n1.includes(targetName) || n2.includes(targetName))) return true;

    return false;
  });
};

/**
 * Format a single match for history presentation
 */
export const formatMatchHistoryItem = (match, { entryId, teamId, participantName }) => {
  const targetEntryId = entryId ? Number(entryId) : null;
  const targetTeamId = teamId ? Number(teamId) : null;
  const targetName = participantName ? String(participantName).trim().toLowerCase() : "";

  const e1 = Number(match.entry1_id || match.entry_1_id);
  const t1 = Number(match.team1_id || match.team_1_id);
  const n1 = String(match.team1_name || match.entry1_name || "").toLowerCase();

  const isFirst = (targetEntryId && e1 === targetEntryId) ||
    (targetTeamId && t1 === targetTeamId) ||
    (targetName && n1.includes(targetName));

  const myName = isFirst ? (match.team1_name || match.entry1_name || "My Entry") : (match.team2_name || match.entry2_name || "My Entry");
  const oppName = isFirst ? (match.team2_name || match.entry2_name || "Opponent") : (match.team1_name || match.entry1_name || "Opponent");
  const oppDepartment = isFirst ? (match.department2_code || match.department2_name) : (match.department1_code || match.department1_name);

  const myScore = isFirst ? (match.score_team1 ?? match.score_entry1) : (match.score_team2 ?? match.score_entry2);
  const oppScore = isFirst ? (match.score_team2 ?? match.score_entry2) : (match.score_team1 ?? match.score_entry1);

  const winnerId = match.winner_team_id || match.winner_entry_id;
  const isCompleted = ["COMPLETED", "FINISHED", "FINAL"].includes(String(match.status).toUpperCase());

  let outcome = "PENDING";
  if (isCompleted) {
    if (myScore !== null && oppScore !== null) {
      if (Number(myScore) > Number(oppScore)) outcome = "WIN";
      else if (Number(myScore) < Number(oppScore)) outcome = "LOSS";
      else outcome = "DRAW";
    } else if (winnerId) {
      const myId = isFirst ? (t1 || e1) : (Number(match.team2_id || match.entry2_id));
      outcome = Number(winnerId) === Number(myId) ? "WIN" : "LOSS";
    }
  }

  const dateVal = match.match_date || match.scheduled_time || match.start_time;
  const formattedDate = dateVal ? new Date(dateVal).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

  return {
    id: match.id || match.match_id,
    opponentName: oppName,
    opponentDepartment: oppDepartment,
    outcome,
    myScore: myScore !== null && myScore !== undefined ? String(myScore) : "-",
    oppScore: oppScore !== null && oppScore !== undefined ? String(oppScore) : "-",
    scoreDisplay: myScore !== null && oppScore !== null ? `${myScore} – ${oppScore}` : null,
    date: formattedDate,
    stage: match.round_label || match.stage || match.bracket_name || "",
    status: match.status,
  };
};

/**
 * Filter disciplinary events adapted by sport
 */
export const extractDisciplineRecords = (sportCategory, playerAnalyticsRows = []) => {
  const isBasketball = sportCategory === "BASKETBALL";
  const isFootball = sportCategory === "FOOTBALL";
  const isVolleyball = sportCategory === "VOLLEYBALL";
  const isRacket = sportCategory === "RACKET";

  let personalFouls = 0;
  let technicalFouls = 0;
  let yellowCards = 0;
  let redCards = 0;
  let serviceFaults = 0;
  let doubleFaults = 0;
  let suspensions = 0;

  for (const player of playerAnalyticsRows) {
    const m = player.metrics || {};
    personalFouls += Number(m.PERSONAL_FOULS || m.FOULS || 0);
    technicalFouls += Number(m.TECHNICAL_FOULS || 0);
    yellowCards += Number(m.YELLOW_CARDS || 0);
    redCards += Number(m.RED_CARDS || 0);
    serviceFaults += Number(m.SERVICE_FAULTS || 0);
    doubleFaults += Number(m.DOUBLE_FAULTS || 0);
    suspensions += Number(m.SUSPENSIONS || 0);
  }

  const counters = [];
  if (isBasketball) {
    counters.push({ label: "Personal Fouls", value: personalFouls });
    counters.push({ label: "Technical Fouls", value: technicalFouls });
  } else if (isFootball) {
    counters.push({ label: "Yellow Cards", value: yellowCards });
    counters.push({ label: "Red Cards", value: redCards });
    if (suspensions > 0) counters.push({ label: "Suspensions", value: suspensions });
  } else if (isVolleyball || isRacket) {
    counters.push({ label: "Service Faults", value: serviceFaults });
    if (doubleFaults > 0) counters.push({ label: "Double Faults", value: doubleFaults });
  } else {
    // Generic
    if (personalFouls > 0) counters.push({ label: "Fouls", value: personalFouls });
    if (yellowCards > 0) counters.push({ label: "Cautions", value: yellowCards });
  }

  const totalViolations = personalFouls + technicalFouls + yellowCards + redCards + serviceFaults + doubleFaults + suspensions;

  return {
    counters,
    totalViolations,
    hasDisciplineData: counters.length > 0 && totalViolations > 0,
  };
};
