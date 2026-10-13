// ─── Sport-Specific Statistics Schemas & Engine ────────────────────────────────

export const SPORT_SCHEMAS = {
  basketball: {
    sportKey: "basketball",
    sportLabel: "Basketball",
    periodLabel: "Quarter",
    metrics: [
      { key: "pts", label: "Points", shortLabel: "PTS", type: "score" },
      { key: "rebounds", label: "Rebounds", shortLabel: "REB", tone: "sky" },
      { key: "assists", label: "Assists", shortLabel: "AST", tone: "emerald" },
      { key: "steals", label: "Steals", shortLabel: "STL", tone: "amber" },
      { key: "blocks", label: "Blocks", shortLabel: "BLK", tone: "purple" },
      { key: "turnovers", label: "Turnovers", shortLabel: "TO", tone: "warn" },
      { key: "fouls", label: "Fouls", shortLabel: "PF", tone: "danger" },
      { key: "timeouts", label: "Timeouts", shortLabel: "TOs", tone: "neutral" },
    ],
    boxScoreColumns: [
      { key: "pts", label: "PTS" },
      { key: "reb", label: "REB" },
      { key: "ast", label: "AST" },
      { key: "stl", label: "STL" },
      { key: "blk", label: "BLK" },
      { key: "to", label: "TO" },
      { key: "fls", label: "PF" },
    ],
    leaderCategories: [
      { key: "pts", label: "Scoring Leaders", unit: "pts", color: "text-cyan-700 dark:text-cyan-300" },
      { key: "reb", label: "Rebound Leaders", unit: "reb", color: "text-sky-700 dark:text-sky-300" },
      { key: "ast", label: "Assist Leaders", unit: "ast", color: "text-emerald-700 dark:text-emerald-300" },
      { key: "def", label: "Defense (STL+BLK)", unit: "stops", color: "text-amber-700 dark:text-amber-300" },
    ],
  },

  badminton: {
    sportKey: "badminton",
    sportLabel: "Badminton",
    periodLabel: "Set",
    metrics: [
      { key: "pts", label: "Total Points", shortLabel: "PTS", type: "score" },
      { key: "smashWins", label: "Smash Winners", shortLabel: "SMASH", tone: "success" },
      { key: "serviceAces", label: "Service Aces", shortLabel: "ACE", tone: "success" },
      { key: "rallyWins", label: "Rallies Won", shortLabel: "RALLY", tone: "neutral" },
      { key: "serviceFaults", label: "Service Faults", shortLabel: "SF", tone: "warn" },
      { key: "footFaults", label: "Foot Faults", shortLabel: "FF", tone: "warn" },
      { key: "intervals", label: "Intervals", shortLabel: "INT", tone: "neutral" },
    ],
    boxScoreColumns: [
      { key: "pts", label: "PTS" },
      { key: "smashWins", label: "SMASH" },
      { key: "serviceAces", label: "ACE" },
      { key: "rallyWins", label: "RALLY" },
      { key: "serviceFaults", label: "SF" },
      { key: "footFaults", label: "FF" },
    ],
    leaderCategories: [
      { key: "smashWins", label: "Smash Leaders", unit: "smashes", color: "text-emerald-700 dark:text-emerald-300" },
      { key: "serviceAces", label: "Service Ace Leaders", unit: "aces", color: "text-cyan-700 dark:text-cyan-300" },
      { key: "rallyWins", label: "Rally Leaders", unit: "rallies", color: "text-violet-700 dark:text-violet-300" },
    ],
  },

  takraw: {
    sportKey: "takraw",
    sportLabel: "Sepak Takraw",
    periodLabel: "Set",
    metrics: [
      { key: "pts", label: "Total Points", shortLabel: "PTS", type: "score" },
      { key: "rollSpikes", label: "Roll Spikes", shortLabel: "SPIKE", tone: "success" },
      { key: "serviceAces", label: "Service Aces", shortLabel: "ACE", tone: "success" },
      { key: "rallyWins", label: "Rallies Won", shortLabel: "RALLY", tone: "neutral" },
      { key: "footFaults", label: "Foot Faults", shortLabel: "FF", tone: "warn" },
      { key: "netFaults", label: "Net Faults", shortLabel: "NF", tone: "warn" },
    ],
    boxScoreColumns: [
      { key: "pts", label: "PTS" },
      { key: "rollSpikes", label: "SPIKE" },
      { key: "serviceAces", label: "ACE" },
      { key: "rallyWins", label: "RALLY" },
      { key: "footFaults", label: "FF" },
      { key: "netFaults", label: "NF" },
    ],
    leaderCategories: [
      { key: "rollSpikes", label: "Spike Leaders (Roll Spikes)", unit: "spikes", color: "text-emerald-700 dark:text-emerald-300" },
      { key: "serviceAces", label: "Tekong Ace Leaders", unit: "aces", color: "text-cyan-700 dark:text-cyan-300" },
      { key: "rallyWins", label: "Rally Leaders", unit: "rallies", color: "text-violet-700 dark:text-violet-300" },
    ],
  },

  volleyball: {
    sportKey: "volleyball",
    sportLabel: "Volleyball",
    periodLabel: "Set",
    metrics: [
      { key: "pts", label: "Total Points", shortLabel: "PTS", type: "score" },
      { key: "kills", label: "Attack Kills", shortLabel: "KILL", tone: "success" },
      { key: "blockPoints", label: "Block Points", shortLabel: "BLK", tone: "success" },
      { key: "serviceAces", label: "Service Aces", shortLabel: "ACE", tone: "success" },
      { key: "rallyWins", label: "Rallies Won", shortLabel: "RALLY", tone: "neutral" },
      { key: "netFaults", label: "Net Faults", shortLabel: "NF", tone: "warn" },
      { key: "rotationFaults", label: "Rotation Faults", shortLabel: "ROT", tone: "warn" },
      { key: "timeouts", label: "Timeouts", shortLabel: "TOs", tone: "neutral" },
    ],
    boxScoreColumns: [
      { key: "pts", label: "PTS" },
      { key: "kills", label: "KILL" },
      { key: "blockPoints", label: "BLK" },
      { key: "serviceAces", label: "ACE" },
      { key: "rallyWins", label: "RALLY" },
      { key: "netFaults", label: "NF" },
    ],
    leaderCategories: [
      { key: "kills", label: "Attack Leaders (Kills)", unit: "kills", color: "text-rose-700 dark:text-rose-300" },
      { key: "blockPoints", label: "Block Point Leaders", unit: "blocks", color: "text-purple-700 dark:text-purple-300" },
      { key: "serviceAces", label: "Service Ace Leaders", unit: "aces", color: "text-cyan-700 dark:text-cyan-300" },
    ],
  },

  tennis: {
    sportKey: "tennis",
    sportLabel: "Tennis",
    periodLabel: "Set",
    metrics: [
      { key: "gamesWon", label: "Games Won", shortLabel: "GAMES", type: "score" },
      { key: "serviceAces", label: "Service Aces", shortLabel: "ACE", tone: "success" },
      { key: "breakPoints", label: "Break Points Converted", shortLabel: "BP", tone: "success" },
      { key: "doubleFaults", label: "Double Faults", shortLabel: "DF", tone: "warn" },
      { key: "faults", label: "Service Faults", shortLabel: "FLT", tone: "warn" },
    ],
    boxScoreColumns: [
      { key: "gamesWon", label: "GAMES" },
      { key: "serviceAces", label: "ACE" },
      { key: "breakPoints", label: "BP" },
      { key: "doubleFaults", label: "DF" },
      { key: "faults", label: "FLT" },
    ],
    leaderCategories: [
      { key: "serviceAces", label: "Service Ace Leaders", unit: "aces", color: "text-cyan-700 dark:text-cyan-300" },
      { key: "breakPoints", label: "Break Point Leaders", unit: "breaks", color: "text-emerald-700 dark:text-emerald-300" },
      { key: "gamesWon", label: "Games Won Leaders", unit: "games", color: "text-amber-700 dark:text-amber-300" },
    ],
  },

  table_tennis: {
    sportKey: "table_tennis",
    sportLabel: "Table Tennis",
    periodLabel: "Set",
    metrics: [
      { key: "pts", label: "Total Points", shortLabel: "PTS", type: "score" },
      { key: "serviceAces", label: "Service Aces", shortLabel: "ACE", tone: "success" },
      { key: "rallyWins", label: "Rallies Won", shortLabel: "RALLY", tone: "neutral" },
      { key: "netTouchFaults", label: "Net Touch", shortLabel: "NET", tone: "warn" },
      { key: "faults", label: "Faults", shortLabel: "FLT", tone: "warn" },
      { key: "timeouts", label: "Timeouts", shortLabel: "TOs", tone: "neutral" },
    ],
    boxScoreColumns: [
      { key: "pts", label: "PTS" },
      { key: "serviceAces", label: "ACE" },
      { key: "rallyWins", label: "RALLY" },
      { key: "netTouchFaults", label: "NET" },
      { key: "faults", label: "FLT" },
    ],
    leaderCategories: [
      { key: "serviceAces", label: "Service Ace Leaders", unit: "aces", color: "text-cyan-700 dark:text-cyan-300" },
      { key: "rallyWins", label: "Rally Contribution Leaders", unit: "rallies", color: "text-emerald-700 dark:text-emerald-300" },
    ],
  },
};

export const SPORT_KEY_NORMALIZER = {
  basketball: "basketball",
  badminton: "badminton",
  volleyball: "volleyball",
  beach_volleyball_2v2: "volleyball",
  beach_volleyball: "volleyball",
  takraw: "takraw",
  sepak_takraw: "takraw",
  "sepak takraw": "takraw",
  tennis: "tennis",
  tennis_doubles: "tennis",
  "tennis doubles": "tennis",
  table_tennis: "table_tennis",
  table_tennis_doubles: "table_tennis",
  "table tennis": "table_tennis",
  "table tennis doubles": "table_tennis",
};

export function normalizeSport(sportKey) {
  const raw = String(sportKey || "").trim().toLowerCase();
  return SPORT_KEY_NORMALIZER[raw] || "badminton";
}

export function getSportSchema(sportKey) {
  const norm = normalizeSport(sportKey);
  return SPORT_SCHEMAS[norm] || SPORT_SCHEMAS.badminton;
}

export function labelToEventType(label = "") {
  const l = String(label || "").trim().toLowerCase();
  if (!l) return "";
  if (l === "+2" || l.includes("2pt") || l.includes("2-point") || l.includes("field goal 2")) return "TWO_PT_MADE";
  if (l === "+3" || l.includes("3pt") || l.includes("3-point") || l.includes("field goal 3")) return "THREE_PT_MADE";
  if (l.includes("free throw")) return "FREE_THROW_MADE";
  if (l.includes("smash")) return "SMASH_WIN";
  if (l.includes("roll spike") || l.includes("spike")) return "ROLL_SPIKE";
  if (l.includes("kill") || l.includes("attack")) return "KILL";
  if (l.includes("block point") || l.includes("block pt")) return "BLOCK_POINT";
  if (l.includes("ace")) return "SERVICE_ACE";
  if (l.includes("rally")) return "RALLY_WIN";
  if (l.includes("service fault") || l.includes("serve fault")) return "SERVICE_FAULT";
  if (l.includes("foot fault")) return "FOOT_FAULT";
  if (l.includes("net touch")) return "NET_TOUCH_FAULT";
  if (l.includes("net fault")) return "NET_FAULT";
  if (l.includes("double fault")) return "DOUBLE_FAULT";
  if (l.includes("game win") || l.includes("game won")) return "GAME_WIN";
  if (l.includes("break point")) return "BREAK_POINT_CONVERTED";
  if (l.includes("assist")) return "ASSIST";
  if (l.includes("off") && l.includes("rebound")) return "OFFENSIVE_REBOUND";
  if (l.includes("def") && l.includes("rebound")) return "DEFENSIVE_REBOUND";
  if (l.includes("rebound")) return "REBOUND";
  if (l.includes("steal")) return "STEAL";
  if (l.includes("block")) return "BLOCK";
  if (l.includes("turnover")) return "TURNOVER";
  if (l.includes("foul")) return "FOUL";
  if (l.includes("timeout")) return "TIMEOUT";
  return "";
}

/**
 * Builds team and player stats for ANY supported sport based on timeline events and backend player_stats.
 */
export function buildMultiSportStats(
  sportKey,
  events = [],
  teamIds = [],
  participants = [],
  playerStats = null,
  teamStats = null
) {
  const schema = getSportSchema(sportKey);
  const normKey = schema.sportKey;

  const effectiveTeamIds = Array.isArray(teamIds) && teamIds.filter(Boolean).length >= 2
    ? teamIds.map(String)
    : (participants || []).map((p) => String(p?.scoring_target_id || p?.id || "")).filter(Boolean);

  const baseStats = (teamId) => {
    const s = {
      teamId: String(teamId),
      pts: 0,
      playerMetrics: {}, // playerId -> { [metricKey]: number }
      playerName: {},
    };
    for (const m of schema.metrics) {
      s[m.key] = 0;
    }
    // Specific basketball extras for backwards compatibility
    if (normKey === "basketball") {
      s.ft = 0;
      s.twoP = 0;
      s.threeP = 0;
      s.offRebounds = 0;
      s.defRebounds = 0;
    }
    return s;
  };

  const stats = {};
  for (const tid of effectiveTeamIds) {
    if (tid && !stats[String(tid)]) stats[String(tid)] = baseStats(tid);
  }

  // Cross-alias all ID variants for each participant (scoring_target_id, id, team_id)
  for (const p of participants || []) {
    const idVariants = [
      p?.scoring_target_id,
      p?.id,
      p?.team_id,
      p?.teamId,
    ].filter((v) => v != null && v !== "").map(String);

    if (idVariants.length === 0) continue;

    // Find if any variant already has a baseStats bucket in stats
    let existingBucket = null;
    for (const id of idVariants) {
      if (stats[id]) {
        existingBucket = stats[id];
        break;
      }
    }

    if (!existingBucket) {
      existingBucket = baseStats(idVariants[0]);
    }

    // Point ALL variants to this same bucket!
    for (const id of idVariants) {
      stats[id] = existingBucket;
    }
  }

  // Pre-seed known roster players
  const playerToTeamMap = {};
  for (const p of participants || []) {
    const tid = String(p?.scoring_target_id || p?.id || "");
    const allMembers = [
      ...(Array.isArray(p?.members) ? p.members : []),
      ...(Array.isArray(p?.benchMembers) ? p.benchMembers : []),
      ...(Array.isArray(p?.roster) ? p.roster : []),
    ];
    for (const m of allMembers) {
      const pid = String(m?.playerId || m?.player_id || m?.id || "");
      if (!pid) continue;
      if (tid) playerToTeamMap[pid] = tid;
      if (tid && stats[tid]) {
        const name = m?.displayName || m?.display_name || m?.name || `Player ${pid}`;
        stats[tid].playerName[pid] = name;
        if (!stats[tid].playerMetrics[pid]) {
          stats[tid].playerMetrics[pid] = {};
          for (const col of schema.boxScoreColumns) {
            stats[tid].playerMetrics[pid][col.key] = 0;
          }
        }
      }
    }
  }

  // Process timeline events
  for (const ev of events || []) {
    const rawType = String(
      ev.event_type || ev.raw_event_type || labelToEventType(ev.label) || ""
    ).toUpperCase();
    const pid = String(ev.player_id || ev.actor_id || ev.player?.id || "");
    let tid = String(ev.team_id || "");
    if (!tid && pid && playerToTeamMap[pid]) {
      tid = playerToTeamMap[pid];
    }
    if (!tid && ev.participant_side) {
      const sideIdx = Number(ev.participant_side) - 1;
      if (effectiveTeamIds[sideIdx]) tid = String(effectiveTeamIds[sideIdx]);
    }
    if (!tid || !stats[tid]) continue;
    const s = stats[tid];

    if (pid && !s.playerName[pid]) {
      s.playerName[pid] = ev.player_name || ev.player?.display_name || `Player ${pid}`;
    }
    if (pid && !s.playerMetrics[pid]) {
      s.playerMetrics[pid] = {};
      for (const col of schema.boxScoreColumns) {
        s.playerMetrics[pid][col.key] = 0;
      }
    }

    const pMetrics = pid ? s.playerMetrics[pid] : null;

    // ── SPORT-SPECIFIC EVENT PARSING ──
    if (normKey === "badminton") {
      if (rawType === "SMASH_WIN") {
        s.pts += 1;
        s.smashWins += 1;
        if (pMetrics) { pMetrics.pts = (pMetrics.pts || 0) + 1; pMetrics.smashWins = (pMetrics.smashWins || 0) + 1; }
      } else if (rawType === "SERVICE_ACE") {
        s.pts += 1;
        s.serviceAces += 1;
        if (pMetrics) { pMetrics.pts = (pMetrics.pts || 0) + 1; pMetrics.serviceAces = (pMetrics.serviceAces || 0) + 1; }
      } else if (rawType === "RALLY_WIN") {
        s.pts += 1;
        s.rallyWins += 1;
        if (pMetrics) { pMetrics.pts = (pMetrics.pts || 0) + 1; pMetrics.rallyWins = (pMetrics.rallyWins || 0) + 1; }
      } else if (rawType === "SERVE_FAULT" || rawType === "SERVICE_FAULT") {
        s.serviceFaults += 1;
        if (pMetrics) { pMetrics.serviceFaults = (pMetrics.serviceFaults || 0) + 1; }
      } else if (rawType === "FOOT_FAULT") {
        s.footFaults += 1;
        if (pMetrics) { pMetrics.footFaults = (pMetrics.footFaults || 0) + 1; }
      } else if (rawType === "INTERVAL") {
        s.intervals += 1;
      }
    } else if (normKey === "takraw") {
      if (rawType === "ROLL_SPIKE") {
        s.pts += 1;
        s.rollSpikes += 1;
        if (pMetrics) { pMetrics.pts = (pMetrics.pts || 0) + 1; pMetrics.rollSpikes = (pMetrics.rollSpikes || 0) + 1; }
      } else if (rawType === "SERVICE_ACE") {
        s.pts += 1;
        s.serviceAces += 1;
        if (pMetrics) { pMetrics.pts = (pMetrics.pts || 0) + 1; pMetrics.serviceAces = (pMetrics.serviceAces || 0) + 1; }
      } else if (rawType === "RALLY_WIN") {
        s.pts += 1;
        s.rallyWins += 1;
        if (pMetrics) { pMetrics.pts = (pMetrics.pts || 0) + 1; pMetrics.rallyWins = (pMetrics.rallyWins || 0) + 1; }
      } else if (rawType === "FOOT_FAULT") {
        s.footFaults += 1;
        if (pMetrics) { pMetrics.footFaults = (pMetrics.footFaults || 0) + 1; }
      } else if (rawType === "NET_FAULT" || rawType === "NET_TOUCH_FAULT") {
        s.netFaults += 1;
        if (pMetrics) { pMetrics.netFaults = (pMetrics.netFaults || 0) + 1; }
      }
    } else if (normKey === "volleyball") {
      if (rawType === "KILL") {
        s.pts += 1;
        s.kills += 1;
        if (pMetrics) { pMetrics.pts = (pMetrics.pts || 0) + 1; pMetrics.kills = (pMetrics.kills || 0) + 1; }
      } else if (rawType === "BLOCK_POINT") {
        s.pts += 1;
        s.blockPoints += 1;
        if (pMetrics) { pMetrics.pts = (pMetrics.pts || 0) + 1; pMetrics.blockPoints = (pMetrics.blockPoints || 0) + 1; }
      } else if (rawType === "SERVICE_ACE") {
        s.pts += 1;
        s.serviceAces += 1;
        if (pMetrics) { pMetrics.pts = (pMetrics.pts || 0) + 1; pMetrics.serviceAces = (pMetrics.serviceAces || 0) + 1; }
      } else if (rawType === "RALLY_WIN") {
        s.pts += 1;
        s.rallyWins += 1;
        if (pMetrics) { pMetrics.pts = (pMetrics.pts || 0) + 1; pMetrics.rallyWins = (pMetrics.rallyWins || 0) + 1; }
      } else if (rawType === "NET_FAULT" || rawType === "NET_TOUCH_FAULT") {
        s.netFaults += 1;
        if (pMetrics) { pMetrics.netFaults = (pMetrics.netFaults || 0) + 1; }
      } else if (rawType === "ROTATION_FAULT") {
        s.rotationFaults += 1;
      } else if (rawType === "TIMEOUT") {
        s.timeouts += 1;
      }
    } else if (normKey === "tennis") {
      if (rawType === "GAME_WIN") {
        s.gamesWon += 1;
        if (pMetrics) { pMetrics.gamesWon = (pMetrics.gamesWon || 0) + 1; }
      } else if (rawType === "ACE" || rawType === "SERVICE_ACE") {
        s.serviceAces += 1;
        if (pMetrics) { pMetrics.serviceAces = (pMetrics.serviceAces || 0) + 1; }
      } else if (rawType === "BREAK_POINT_CONVERTED") {
        s.breakPoints += 1;
        if (pMetrics) { pMetrics.breakPoints = (pMetrics.breakPoints || 0) + 1; }
      } else if (rawType === "DOUBLE_FAULT") {
        s.doubleFaults += 1;
        if (pMetrics) { pMetrics.doubleFaults = (pMetrics.doubleFaults || 0) + 1; }
      } else if (rawType === "FAULT") {
        s.faults += 1;
        if (pMetrics) { pMetrics.faults = (pMetrics.faults || 0) + 1; }
      }
    } else if (normKey === "table_tennis") {
      if (rawType === "RALLY_WIN") {
        s.pts += 1;
        s.rallyWins += 1;
        if (pMetrics) { pMetrics.pts = (pMetrics.pts || 0) + 1; pMetrics.rallyWins = (pMetrics.rallyWins || 0) + 1; }
      } else if (rawType === "SERVICE_ACE") {
        s.pts += 1;
        s.serviceAces += 1;
        if (pMetrics) { pMetrics.pts = (pMetrics.pts || 0) + 1; pMetrics.serviceAces = (pMetrics.serviceAces || 0) + 1; }
      } else if (rawType === "NET_TOUCH_FAULT") {
        s.netTouchFaults += 1;
        if (pMetrics) { pMetrics.netTouchFaults = (pMetrics.netTouchFaults || 0) + 1; }
      } else if (rawType === "FAULT") {
        s.faults += 1;
        if (pMetrics) { pMetrics.faults = (pMetrics.faults || 0) + 1; }
      } else if (rawType === "TIMEOUT") {
        s.timeouts += 1;
      }
    } else if (normKey === "basketball") {
      if (/(FREE_THROW|FREE_THROW_MADE|ONE_POINT_MADE)/.test(rawType)) {
        s.pts += 1; s.ft += 1;
        if (pMetrics) { pMetrics.pts = (pMetrics.pts || 0) + 1; }
      } else if (/(TWO_PT_MADE|TWO_POINT_MADE|FIELD_GOAL_2_MADE)/.test(rawType)) {
        s.pts += 2; s.twoP += 1;
        if (pMetrics) { pMetrics.pts = (pMetrics.pts || 0) + 2; }
      } else if (/(THREE_PT_MADE|THREE_POINT_MADE|FIELD_GOAL_3_MADE)/.test(rawType)) {
        s.pts += 3; s.threeP += 1;
        if (pMetrics) { pMetrics.pts = (pMetrics.pts || 0) + 3; }
      } else if (/(REBOUND|OFFENSIVE_REBOUND|DEFENSIVE_REBOUND)/.test(rawType)) {
        s.rebounds += 1;
        if (rawType === "OFFENSIVE_REBOUND") s.offRebounds += 1;
        if (rawType === "DEFENSIVE_REBOUND") s.defRebounds += 1;
        if (pMetrics) { pMetrics.reb = (pMetrics.reb || 0) + 1; }
      } else if (rawType === "ASSIST") {
        s.assists += 1;
        if (pMetrics) { pMetrics.ast = (pMetrics.ast || 0) + 1; }
      } else if (rawType === "STEAL") {
        s.steals += 1;
        if (pMetrics) { pMetrics.stl = (pMetrics.stl || 0) + 1; }
      } else if (rawType === "BLOCK") {
        s.blocks += 1;
        if (pMetrics) { pMetrics.blk = (pMetrics.blk || 0) + 1; }
      } else if (rawType === "TURNOVER") {
        s.turnovers += 1;
        if (pMetrics) { pMetrics.to = (pMetrics.to || 0) + 1; }
      } else if (/FOUL/.test(rawType)) {
        s.fouls += 1;
        if (pMetrics) { pMetrics.fls = (pMetrics.fls || 0) + 1; }
      } else if (/TIMEOUT/.test(rawType)) {
        s.timeouts += 1;
      }
    }
  }

  // Merge backend playerStats if available
  if (playerStats && typeof playerStats === "object") {
    for (const [rawPid, rawObj] of Object.entries(playerStats)) {
      const pid = String(rawPid);
      const tid = playerToTeamMap[pid] || Object.keys(stats)[0];
      if (!tid || !stats[tid] || !rawObj || typeof rawObj !== "object") continue;
      const s = stats[tid];
      if (!s.playerMetrics[pid]) {
        s.playerMetrics[pid] = {};
        for (const col of schema.boxScoreColumns) {
          s.playerMetrics[pid][col.key] = 0;
        }
      }
      const pm = s.playerMetrics[pid];

      for (const [k, v] of Object.entries(rawObj)) {
        const num = Number(v || 0);
        const cleanK = String(k).toLowerCase().replace(/_/g, "");
        for (const col of schema.boxScoreColumns) {
          const cleanCol = col.key.toLowerCase().replace(/_/g, "");
          if (
            cleanK === cleanCol ||
            cleanK.includes(cleanCol) ||
            cleanCol.includes(cleanK) ||
            (cleanCol === "pts" && (cleanK === "points" || cleanK === "totalpoints")) ||
            (cleanCol === "reb" && cleanK.includes("rebound")) ||
            (cleanCol === "ast" && cleanK.includes("assist")) ||
            (cleanCol === "stl" && cleanK.includes("steal")) ||
            (cleanCol === "blk" && cleanK.includes("block")) ||
            (cleanCol === "to" && cleanK.includes("turnover")) ||
            (cleanCol === "fls" && cleanK.includes("foul"))
          ) {
            pm[col.key] = Math.max(pm[col.key] || 0, num);
          }
        }
      }
    }
  }

  // Merge backend teamStats if available
  if (teamStats && typeof teamStats === "object") {
    for (const [rawTid, rawObj] of Object.entries(teamStats)) {
      const s = stats[String(rawTid)];
      if (!s || !rawObj || typeof rawObj !== "object") continue;
      for (const [k, v] of Object.entries(rawObj)) {
        const num = Number(v || 0);
        const cleanK = String(k).toLowerCase().replace(/_/g, "");
        if (normKey === "basketball") {
          if (cleanK === "scoretotal" || cleanK === "points" || cleanK === "pts") s.pts = Math.max(s.pts || 0, num);
          if (cleanK.includes("rebound")) s.rebounds = Math.max(s.rebounds || 0, num);
          if (cleanK.includes("assist")) s.assists = Math.max(s.assists || 0, num);
          if (cleanK.includes("steal")) s.steals = Math.max(s.steals || 0, num);
          if (cleanK.includes("block") && !cleanK.includes("clock")) s.blocks = Math.max(s.blocks || 0, num);
          if (cleanK.includes("turnover")) s.turnovers = Math.max(s.turnovers || 0, num);
          if (cleanK.includes("foul")) s.fouls = Math.max(s.fouls || 0, num);
          if (cleanK.includes("timeout")) s.timeouts = Math.max(s.timeouts || 0, num);
          if (cleanK.includes("twopt")) s.twoP = Math.max(s.twoP || 0, num);
          if (cleanK.includes("threept")) s.threeP = Math.max(s.threeP || 0, num);
          if (cleanK.includes("freethrow")) s.ft = Math.max(s.ft || 0, num);
        } else {
          for (const m of schema.metrics) {
            const cleanM = m.key.toLowerCase().replace(/_/g, "");
            if (cleanK === cleanM || cleanK.includes(cleanM) || cleanM.includes(cleanK)) {
              s[m.key] = Math.max(s[m.key] || 0, num);
            }
          }
        }
      }
    }
  }

  // Ensure team-level aggregates reflect at least the sum of their individual players' stats
  for (const s of Object.values(stats)) {
    if (!s || !s.playerMetrics) continue;
    const players = Object.values(s.playerMetrics);
    if (players.length > 0) {
      if (normKey === "basketball") {
        s.pts = Math.max(s.pts || 0, players.reduce((sum, pm) => sum + Number(pm.pts || 0), 0));
        s.rebounds = Math.max(s.rebounds || 0, players.reduce((sum, pm) => sum + Number(pm.reb || 0), 0));
        s.assists = Math.max(s.assists || 0, players.reduce((sum, pm) => sum + Number(pm.ast || 0), 0));
        s.steals = Math.max(s.steals || 0, players.reduce((sum, pm) => sum + Number(pm.stl || 0), 0));
        s.blocks = Math.max(s.blocks || 0, players.reduce((sum, pm) => sum + Number(pm.blk || 0), 0));
        s.turnovers = Math.max(s.turnovers || 0, players.reduce((sum, pm) => sum + Number(pm.to || 0), 0));
        s.fouls = Math.max(s.fouls || 0, players.reduce((sum, pm) => sum + Number(pm.fls || 0), 0));
      } else {
        for (const col of schema.boxScoreColumns) {
          if (s[col.key] != null) {
            s[col.key] = Math.max(s[col.key] || 0, players.reduce((sum, pm) => sum + Number(pm[col.key] || 0), 0));
          }
        }
      }
    }
  }

  return { schema, stats };
}

// Re-export buildTeamStats for basketball compatibility
export { buildTeamStats } from "./basketballStatsEngine.js";
