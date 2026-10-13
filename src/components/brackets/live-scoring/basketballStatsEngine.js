// ─── Constants ────────────────────────────────────────────────────────────────

export const SCORE_EVENTS = new Set([
  "FREE_THROW_MADE", "FREE_THROW", "ONE_POINT_MADE",
  "FIELD_GOAL_2_MADE", "TWO_POINT_MADE", "TWO_PT_MADE",
  "FIELD_GOAL_3_MADE", "THREE_POINT_MADE", "THREE_PT_MADE",
]);

export const POINT_VALUE = {
  FREE_THROW_MADE: 1, FREE_THROW: 1, ONE_POINT_MADE: 1,
  FIELD_GOAL_2_MADE: 2, TWO_POINT_MADE: 2, TWO_PT_MADE: 2,
  FIELD_GOAL_3_MADE: 3, THREE_POINT_MADE: 3, THREE_PT_MADE: 3,
};

export const FOUL_EVENTS = /(FOUL|PERSONAL_FOUL|TECHNICAL_FOUL|FLAGRANT_FOUL)/;
export const TIMEOUT_EVENTS = /TIMEOUT/;

export function deriveEventType(type) {
  return String(type || "").toUpperCase();
}

/**
 * Build per-team and per-player basketball stats from timeline events and/or backend player_stats.
 */
export function buildTeamStats(events = [], teamIds = [], participants = [], playerStats = null) {
  const base = (teamId) => ({
    teamId: String(teamId),
    pts: 0,
    ft: 0,
    twoP: 0,
    threeP: 0,
    rebounds: 0,
    offRebounds: 0,
    defRebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    fouls: 0,
    timeouts: 0,
    playerPts: {},
    playerFt: {},
    playerTwoP: {},
    playerThreeP: {},
    playerRebounds: {},
    playerOffRebounds: {},
    playerDefRebounds: {},
    playerAssists: {},
    playerSteals: {},
    playerBlocks: {},
    playerTurnovers: {},
    playerFouls: {},
    playerName: {},
  });

  const stats = {};
  for (const id of teamIds) {
    if (id) stats[String(id)] = base(id);
  }

  // Pre-seed known roster players from participants
  const playerToTeamMap = {};
  for (const p of participants || []) {
    const tid = String(p?.id || "");
    const allMembers = [
      ...(Array.isArray(p?.members) ? p.members : []),
      ...(Array.isArray(p?.benchMembers) ? p.benchMembers : []),
    ];
    for (const m of allMembers) {
      const pid = String(m?.playerId || m?.id || "");
      if (!pid) continue;
      playerToTeamMap[pid] = tid;
      if (stats[tid]) {
        const name = m?.displayName || m?.name || `Player ${pid}`;
        stats[tid].playerName[pid] = name;
        stats[tid].playerPts[pid] = 0;
        stats[tid].playerFt[pid] = 0;
        stats[tid].playerTwoP[pid] = 0;
        stats[tid].playerThreeP[pid] = 0;
        stats[tid].playerRebounds[pid] = 0;
        stats[tid].playerOffRebounds[pid] = 0;
        stats[tid].playerDefRebounds[pid] = 0;
        stats[tid].playerAssists[pid] = 0;
        stats[tid].playerSteals[pid] = 0;
        stats[tid].playerBlocks[pid] = 0;
        stats[tid].playerTurnovers[pid] = 0;
        stats[tid].playerFouls[pid] = 0;
      }
    }
  }

  // Process timeline events
  for (const ev of events || []) {
    const type = deriveEventType(ev.event_type);
    let tid = String(ev.team_id || "");
    const pid = String(ev.player_id || ev.actor_id || "");
    if (!tid && pid && playerToTeamMap[pid]) {
      tid = playerToTeamMap[pid];
    }
    if (!tid || !stats[tid]) continue;
    const s = stats[tid];
    const pname = ev.player_name || s.playerName[pid] || (pid ? `Player ${pid}` : "Unknown");
    if (pid && !s.playerName[pid]) {
      s.playerName[pid] = pname;
    }

    // Points & scoring
    if (SCORE_EVENTS.has(type)) {
      const pts = POINT_VALUE[type] || 0;
      s.pts += pts;
      if (pts === 1) {
        s.ft += 1;
        if (pid) s.playerFt[pid] = (s.playerFt[pid] || 0) + 1;
      } else if (pts === 2) {
        s.twoP += 1;
        if (pid) s.playerTwoP[pid] = (s.playerTwoP[pid] || 0) + 1;
      } else if (pts === 3) {
        s.threeP += 1;
        if (pid) s.playerThreeP[pid] = (s.playerThreeP[pid] || 0) + 1;
      }
      if (pid) {
        s.playerPts[pid] = (s.playerPts[pid] || 0) + pts;
      }
    }

    // Rebounds
    if (type === "REBOUND" || type === "OFFENSIVE_REBOUND" || type === "DEFENSIVE_REBOUND") {
      s.rebounds += 1;
      if (type === "OFFENSIVE_REBOUND") {
        s.offRebounds += 1;
        if (pid) s.playerOffRebounds[pid] = (s.playerOffRebounds[pid] || 0) + 1;
      } else if (type === "DEFENSIVE_REBOUND") {
        s.defRebounds += 1;
        if (pid) s.playerDefRebounds[pid] = (s.playerDefRebounds[pid] || 0) + 1;
      }
      if (pid) {
        s.playerRebounds[pid] = (s.playerRebounds[pid] || 0) + 1;
      }
    }

    // Assists
    if (type === "ASSIST") {
      s.assists += 1;
      if (pid) {
        s.playerAssists[pid] = (s.playerAssists[pid] || 0) + 1;
      }
    }

    // Steals
    if (type === "STEAL") {
      s.steals += 1;
      if (pid) {
        s.playerSteals[pid] = (s.playerSteals[pid] || 0) + 1;
      }
    }

    // Blocks
    if (type === "BLOCK") {
      s.blocks += 1;
      if (pid) {
        s.playerBlocks[pid] = (s.playerBlocks[pid] || 0) + 1;
      }
    }

    // Turnovers
    if (type === "TURNOVER") {
      s.turnovers += 1;
      if (pid) {
        s.playerTurnovers[pid] = (s.playerTurnovers[pid] || 0) + 1;
      }
    }

    // Fouls
    if (FOUL_EVENTS.test(type)) {
      s.fouls += 1;
      if (pid) {
        s.playerFouls[pid] = (s.playerFouls[pid] || 0) + 1;
      }
    }

    // Timeouts
    if (TIMEOUT_EVENTS.test(type)) {
      s.timeouts += 1;
    }
  }

  // Merge with backend playerStats if provided
  if (playerStats && typeof playerStats === "object") {
    for (const [rawPid, rawObj] of Object.entries(playerStats)) {
      const pid = String(rawPid);
      const tid = playerToTeamMap[pid] || Object.keys(stats)[0];
      if (!tid || !stats[tid] || typeof rawObj !== "object" || !rawObj) continue;
      const s = stats[tid];
      const pPoints = Number(rawObj.POINTS || rawObj.points || 0);
      const pAssists = Number(rawObj.ASSIST || rawObj.ASSISTS || rawObj.assists || 0);
      const pRebounds = Number(rawObj.REBOUND || rawObj.REBOUNDS || rawObj.rebounds || 0);
      const pSteals = Number(rawObj.STEAL || rawObj.STEALS || rawObj.steals || 0);
      const pBlocks = Number(rawObj.BLOCK || rawObj.BLOCKS || rawObj.blocks || 0);
      const pTurnovers = Number(rawObj.TURNOVER || rawObj.TURNOVERS || rawObj.turnovers || 0);
      const pFouls = Number(rawObj.FOUL || rawObj.FOULS || rawObj.fouls || 0);

      if (pPoints > (s.playerPts[pid] || 0)) {
        s.pts += pPoints - (s.playerPts[pid] || 0);
        s.playerPts[pid] = pPoints;
      }
      if (pAssists > (s.playerAssists[pid] || 0)) {
        s.assists += pAssists - (s.playerAssists[pid] || 0);
        s.playerAssists[pid] = pAssists;
      }
      if (pRebounds > (s.playerRebounds[pid] || 0)) {
        s.rebounds += pRebounds - (s.playerRebounds[pid] || 0);
        s.playerRebounds[pid] = pRebounds;
      }
      if (pSteals > (s.playerSteals[pid] || 0)) {
        s.steals += pSteals - (s.playerSteals[pid] || 0);
        s.playerSteals[pid] = pSteals;
      }
      if (pBlocks > (s.playerBlocks[pid] || 0)) {
        s.blocks += pBlocks - (s.playerBlocks[pid] || 0);
        s.playerBlocks[pid] = pBlocks;
      }
      if (pTurnovers > (s.playerTurnovers[pid] || 0)) {
        s.turnovers += pTurnovers - (s.playerTurnovers[pid] || 0);
        s.playerTurnovers[pid] = pTurnovers;
      }
      if (pFouls > (s.playerFouls[pid] || 0)) {
        s.fouls += pFouls - (s.playerFouls[pid] || 0);
        s.playerFouls[pid] = pFouls;
      }
    }
  }

  return stats;
}
