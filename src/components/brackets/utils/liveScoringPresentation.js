const normalize = (value) => String(value || "").trim().toUpperCase();
const positiveInt = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
};

const valueForSide = (values, id) => {
  if (!values || id == null) return 0;
  return Number(values[String(id)] ?? values[id] ?? 0) || 0;
};

const SPORT_INTERFACES = {
  VOLLEYBALL: { layout: "SET_RALLY", stageLabel: "Set" },
  BEACH_VOLLEYBALL: { layout: "SET_RALLY", stageLabel: "Set" },
  BADMINTON: { layout: "SET_RALLY", stageLabel: "Game" },
  TABLE_TENNIS: { layout: "SET_RALLY", stageLabel: "Game" },
  SEPAK_TAKRAW: { layout: "SET_RALLY", stageLabel: "Set" },
  TAKRAW: { layout: "SET_RALLY", stageLabel: "Set" },
  BASKETBALL: { layout: "DIRECT_SCORE", stageLabel: "Period" },
  FOOTBALL: { layout: "DIRECT_SCORE", stageLabel: "Half" },
  HANDBALL: { layout: "DIRECT_SCORE", stageLabel: "Period" },
  TENNIS: { layout: "TENNIS", stageLabel: "Set" },
  BOXING: { layout: "BOXING", stageLabel: "Round" },
  ARCHERY: { layout: "ARCHERY", stageLabel: "End" },
  ATHLETICS: { layout: "RACE", stageLabel: "Heat" },
  SWIMMING: { layout: "RACE", stageLabel: "Heat" },
  BASEBALL: { layout: "BASEBALL", stageLabel: "Inning" },
  CHESS: { layout: "CHESS", stageLabel: "Game" },
};

const PRIMARY_ACTIONS = {
  VOLLEYBALL: new Set(["POINT_WON", "RALLY_WON", "RALLY_WIN", "POINT", "SERVICE_ACE", "KILL", "BLOCK_POINT"]),
  BEACH_VOLLEYBALL: new Set(["POINT_WON", "RALLY_WON", "RALLY_WIN", "POINT", "SERVICE_ACE", "KILL", "BLOCK_POINT"]),
  BADMINTON: new Set(["POINT_WON", "RALLY_WON", "RALLY_WIN"]),
  TABLE_TENNIS: new Set(["POINT_WON", "RALLY_WON"]),
  SEPAK_TAKRAW: new Set(["POINT_WON", "RALLY_WON", "RALLY_WIN", "POINT", "SERVICE_ACE", "ROLL_SPIKE"]),
  TAKRAW: new Set(["POINT_WON", "RALLY_WON", "RALLY_WIN", "POINT", "SERVICE_ACE", "ROLL_SPIKE"]),
  BASKETBALL: new Set(["FREE_THROW_MADE", "FREE_THROW_MISSED", "TWO_POINT_MADE", "THREE_POINT_MADE"]),
  FOOTBALL: new Set(["GOAL", "PENALTY_SCORED", "PENALTY_MISSED"]),
  HANDBALL: new Set(["GOAL", "SEVEN_METER_SCORED", "SEVEN_METER_MISSED"]),
  TENNIS: new Set(["POINT_WON", "TIEBREAK_POINT_WON", "MATCH_TIEBREAK_POINT_WON"]),
  BASEBALL: new Set(["BALL", "STRIKE", "FOUL_BALL", "OUT", "STRIKEOUT", "WALK", "HIT", "RUN_SCORED"]),
};

const COMPLETION_ACTIONS = new Set([
  "ABANDONMENT",
  "CHECKMATE",
  "DISQUALIFICATION",
  "DRAW_AGREED",
  "FORFEIT",
  "GAME_END",
  "KNOCKOUT",
  "MATCH_END",
  "NO_SHOW",
  "OFFICIAL_DECISION",
  "REFEREE_STOPPAGE",
  "RESIGNATION",
  "RESULT_CONFIRMED",
  "STALEMATE",
  "TECHNICAL_KNOCKOUT",
  "TECHNICAL_RESULT",
  "TIME_FORFEIT",
  "WALKOVER",
]);

const ACTION_PRESENTATION = {
  POINT_WON: ["Point", "Score"],
  RALLY_WON: ["Point", "Score"],
  RALLY_WIN: ["Point", "Score"],
  SERVICE_ACE: ["Service ace", "+1"],
  KILL: ["Kill", "+1"],
  BLOCK_POINT: ["Block point", "+1"],
  ROLL_SPIKE: ["Roll spike", "+1"],
  ROTATION_FAULT: ["Rotation fault", "Point to opponent"],
  NET_FAULT: ["Net fault", "Point to opponent"],
  FOOT_FAULT: ["Foot fault", "Point to opponent"],
  SERVER_SET: ["Server set", "Service indicator"],
  CHANGE_SERVER: ["Change server", "Service indicator"],
  SERVICE_FAULT: ["Service fault", "Point and service follow the active rules"],
  FAULT: ["Fault", "Effect follows the active rules"],
  LET: ["Let", "No score"],
  REPLAY: ["Replay rally", "No score"],
  FREE_THROW_MADE: ["Free throw made", "+1"],
  FREE_THROW_MISSED: ["Free throw missed", "No score"],
  TWO_POINT_MADE: ["2-point shot", "+2"],
  THREE_POINT_MADE: ["3-point shot", "+3"],
  PERSONAL_FOUL: ["Personal foul", "No automatic score"],
  TEAM_FOUL: ["Team foul", "No automatic score"],
  TECHNICAL_FOUL: ["Technical foul", "No automatic score"],
  GOAL: ["Goal", "+1"],
  PENALTY_AWARDED: ["Penalty awarded", "No automatic score"],
  PENALTY_SCORED: ["Penalty scored", "+1"],
  PENALTY_MISSED: ["Penalty missed", "No score"],
  SEVEN_METER_AWARDED: ["Seven-metre awarded", "No automatic score"],
  SEVEN_METER_SCORED: ["Seven-metre scored", "+1"],
  SEVEN_METER_MISSED: ["Seven-metre missed", "No score"],
  YELLOW_CARD: ["Yellow card", "No score"],
  RED_CARD: ["Red card", "No score"],
  TWO_MINUTE_SUSPENSION: ["Two-minute suspension", "No score"],
  FIRST_SERVICE_FAULT: ["First service fault", "No point"],
  DOUBLE_FAULT: ["Double fault", "Point to opponent"],
  SERVICE_LET: ["Service let", "No score"],
  RALLY_LET: ["Rally let", "No score"],
  TIMEOUT: ["Timeout", "No score"],
  SUBSTITUTION: ["Substitution", "No score"],
  CHECKMATE: ["Checkmate", "Completes the Match"],
  RESULT_CONFIRMED: ["Confirm result", "Completes the Match"],
  OFFICIAL_DECISION: ["Official decision", "Completes the Match"],
};

const controlCode = (control) => normalize(control?.event_type || control?.name);

export const needsDetailedComposer = (control) => Boolean(
  control?.requires_player
  || (control?.provides_value && control?.value === undefined)
  || controlCode(control) === "SUBSTITUTION"
);

export const getSportInterface = (sportCode) => (
  SPORT_INTERFACES[normalize(sportCode)] || { layout: "GENERIC_READ_ONLY", stageLabel: "Stage" }
);

export const partitionSportActions = (config, sportCode) => {
  const rows = Array.isArray(config?.controls) ? config.controls.filter(Boolean) : [];
  if (rows.length === 0) return { primary: [], secondary: [] };
  const preferred = PRIMARY_ACTIONS[normalize(sportCode)] || new Set();
  const primary = [];
  const secondary = [];
  const seen = new Set();
  rows.forEach((control) => {
    const code = controlCode(control);
    if (!code || seen.has(code)) return;
    seen.add(code);
    if (preferred.has(code)) primary.push(control);
    else secondary.push(control);
  });
  return { primary, secondary };
};

export const buildParticipantPresentation = (participants) => (
  (Array.isArray(participants) ? participants : []).map((participant, index) => {
    const model = normalize(participant?.participantModel || participant?.participant_model || "TEAM");
    const lane = Number(participant?.lane || (model === "LANE" ? participant?.side : 0)) || null;
    return {
      ...participant,
      key: participant?.key || `participant-${participant?.teamId || index + 1}`,
      label: String(participant?.label || "").trim() || "Waiting for previous result",
      participantModel: model,
      context: lane ? `Lane ${lane}` : model === "DUO" ? "Pair" : model === "SOLO" ? "Individual" : "",
    };
  })
);

export const getStatisticsPresentation = (participantModel) => {
  const model = normalize(participantModel);
  if (model === "DUO") return { aggregate: "Pair Stats", individual: "Player Stats" };
  if (model === "SOLO") return { aggregate: null, individual: "Player Stats" };
  if (model === "LANE" || model === "INDIVIDUAL_RESULT") {
    return { aggregate: "Event Results", individual: null };
  }
  return { aggregate: "Team Stats", individual: "Player Stats" };
};

export const getServicePresentation = (serviceOwnerId, participants) => {
  const owner = Number(serviceOwnerId || 0);
  const rows = Array.isArray(participants) ? participants : [];
  if (!owner) return { ownerId: null, label: "Service not assigned" };
  const match = rows.find((row) => Number(row?.teamId || row?.id || 0) === owner);
  return {
    ownerId: owner,
    label: match?.label ? `Serving: ${match.label}` : "Serving side",
  };
};

export const buildLiveScoreboardPresentation = ({
  config,
  liveState,
  participants,
  participantModel,
  sportCode,
} = {}) => {
  const safeConfig = config && typeof config === "object" ? config : {};
  const state = liveState && typeof liveState === "object" ? liveState : {};
  const rows = Array.isArray(participants) ? participants.slice(0, 2) : [];
  const logic = safeConfig.match_logic && typeof safeConfig.match_logic === "object"
    ? safeConfig.match_logic
    : {};
  const runtimeRules = safeConfig.runtime_rules && typeof safeConfig.runtime_rules === "object"
    ? safeConfig.runtime_rules
    : {};
  const rules = safeConfig.rules && typeof safeConfig.rules === "object" ? safeConfig.rules : {};
  const readRule = (key) => logic[key] ?? runtimeRules[key] ?? rules[key];
  const configuredEngine = normalize(
    safeConfig?.runtime_model?.engine_type
      || logic.engine_type
      || safeConfig?.runtime_governance?.engine_type
      || safeConfig.match_type
  );
  const sportInterface = getSportInterface(sportCode);
  const engine = configuredEngine === "SET" ? "SETS" : configuredEngine;
  const model = normalize(participantModel || safeConfig?.participant_profile?.unit_type || "TEAM");
  const sideAId = Number(rows[0]?.teamId ?? rows[0]?.id ?? 0) || null;
  const sideBId = Number(rows[1]?.teamId ?? rows[1]?.id ?? 0) || null;
  const setState = state.set_state && typeof state.set_state === "object" ? state.set_state : {};
  const setPoints = setState.set_points && typeof setState.set_points === "object" ? setState.set_points : {};
  const setsWon = setState.sets_won && typeof setState.sets_won === "object" ? setState.sets_won : {};
  const setsToWin = positiveInt(readRule("sets_to_win"));
  const configuredMaxSets = positiveInt(readRule("max_sets"));
  const bestOf = configuredMaxSets || (setsToWin ? (setsToWin * 2) - 1 : null);
  const currentSet = positiveInt(setState.current_set) || 1;
  const deciding = Boolean(bestOf && currentSet >= bestOf);
  const regularTarget = positiveInt(readRule("regular_set_target") ?? readRule("score_to_win"));
  const decidingTarget = positiveInt(readRule("deciding_set_target")) || regularTarget;
  const currentTarget = deciding ? decidingTarget : regularTarget;
  const winBy = positiveInt(readRule("win_by"));
  const cap = positiveInt(readRule("score_cap"));
  let sideAPoints = engine === "SETS" ? valueForSide(setPoints, sideAId) : valueForSide(state.score, sideAId);
  let sideBPoints = engine === "SETS" ? valueForSide(setPoints, sideBId) : valueForSide(state.score, sideBId);
  if (sportInterface.layout === "CHESS") {
    const resultPoints = state?.chess_state?.result_points;
    if (resultPoints && typeof resultPoints === "object" && Object.keys(resultPoints).length > 0) {
      sideAPoints = Number(resultPoints[String(sideAId)] ?? resultPoints[sideAId] ?? 0);
      sideBPoints = Number(resultPoints[String(sideBId)] ?? resultPoints[sideBId] ?? 0);
    } else {
      const resultStatus = normalize(state?.match_result?.status || state?.match_status);
      const winnerId = positiveInt(
        state?.winner_entry_id
        || state?.winner_team_id
        || state?.match_result?.winner_entry_id
        || state?.match_result?.winner_team_id
      );
      if (winnerId && (resultStatus === "FINISHED" || resultStatus === "COMPLETED")) {
        sideAPoints = winnerId === sideAId ? 1 : 0;
        sideBPoints = winnerId === sideBId ? 1 : 0;
      } else if (resultStatus === "DRAW") {
        sideAPoints = 0.5;
        sideBPoints = 0.5;
      }
    }
  }
  const sideASeries = valueForSide(setsWon, sideAId);
  const sideBSeries = valueForSide(setsWon, sideBId);
  const indicators = [];

  if (engine === "SETS" && deciding) indicators.push({ code: "DECIDING_SET", label: "Deciding Set", side: null });
  if (engine === "SETS" && currentTarget && winBy) {
    const atDeuce = sideAPoints >= currentTarget - 1 && sideBPoints >= currentTarget - 1 && sideAPoints === sideBPoints;
    if (atDeuce) indicators.push({ code: "DEUCE", label: "Deuce", side: null });
    const pointWinsSet = (own, other) => (
      (cap && own + 1 >= cap)
      || (own + 1 >= currentTarget && own + 1 - other >= winBy)
    );
    [["A", sideAPoints, sideBPoints, sideASeries], ["B", sideBPoints, sideAPoints, sideBSeries]].forEach(
      ([side, own, other, series]) => {
        if (!pointWinsSet(own, other)) return;
        const matchPoint = setsToWin && Number(series) === setsToWin - 1;
        indicators.push({
          code: matchPoint ? "MATCH_POINT" : "SET_POINT",
          label: matchPoint ? "Match Point" : "Set Point",
          side,
        });
      }
    );
  }

  const service = getServicePresentation(state?.service_state?.server_team_id, rows);
  const stageLabel = sportInterface.stageLabel || (engine === "SETS" ? "Set" : "Period");
  const seriesLabel = normalize(sportCode).includes("BADMINTON") || normalize(sportCode).includes("TABLE_TENNIS")
    ? "Games"
    : "Sets";

  return {
    engine: engine || sportInterface.layout,
    participantModel: model,
    participants: rows,
    phase: {
      label: stageLabel,
      current: engine === "SETS" ? currentSet : positiveInt(state?.period_state?.current_period) || 1,
      bestOf: engine === "SETS" ? bestOf : null,
      deciding,
    },
    score: { sideA: sideAPoints, sideB: sideBPoints },
    series: {
      visible: engine === "SETS",
      label: seriesLabel,
      sideA: sideASeries,
      sideB: sideBSeries,
      toWin: setsToWin,
    },
    target: {
      points: engine === "SETS" ? currentTarget : null,
      regular: regularTarget,
      deciding: decidingTarget,
      winBy: engine === "SETS" ? winBy : null,
      cap: engine === "SETS" ? cap : null,
    },
    service: {
      assigned: Boolean(service.ownerId),
      ownerId: service.ownerId,
      side: service.ownerId === sideAId ? "A" : service.ownerId === sideBId ? "B" : null,
      label: service.label,
    },
    indicators,
  };
};

export const getScoringReadinessPresentation = (config, sportCode) => {
  const supportStatus = normalize(config?.runtime_governance?.support_status);
  const isTakrawPending = normalize(sportCode).includes("TAKRAW")
    && supportStatus === "INSTITUTION_CONFIRMATION_REQUIRED";
  const operationalBlocker = config?.match_readiness?.blockers?.[0];
  const ruleReady = config?.rule_readiness?.scoring_ready !== false;
  const operationalReady = config?.match_readiness?.ready !== false;
  return {
    ready: ruleReady && operationalReady,
    code: normalize(operationalBlocker?.code || config?.rule_readiness?.reason_code),
    message: isTakrawPending
      ? "The institutional Takraw rules must be confirmed and approved before this Match can be scored."
      : String(
        operationalBlocker?.message
        || config?.rule_readiness?.message
        || "This Match does not currently provide scoring actions. Review its readiness and rule snapshot."
      ),
  };
};

export const isCompletionAction = (eventType) => COMPLETION_ACTIONS.has(normalize(eventType));

export const getActionPresentation = (eventType) => {
  const code = normalize(eventType);
  const configured = ACTION_PRESENTATION[code];
  return {
    code,
    label: configured?.[0] || code.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (value) => value.toUpperCase()),
    impact: configured?.[1] || "",
  };
};

export const isMatchCompleted = (state) => {
  const status = normalize(state?.match_status || state?.status || state?.match?.status);
  return new Set(["COMPLETED", "FINAL", "FINISHED", "DRAW", "CANCELED", "CANCELLED", "ABANDONED"]).has(status);
};

export const buildMatchCompletionPresentation = ({
  match,
  liveState,
  participants,
  scoreboard,
} = {}) => {
  const state = liveState && typeof liveState === "object" ? liveState : {};
  const result = state.match_result && typeof state.match_result === "object" ? state.match_result : {};
  const disposition = normalize(result.disposition || state.disposition);
  const completed = isMatchCompleted({
    match_status: state.match_status,
    status: state.match_status || result.status || match?.status,
  });
  const winnerTargetId = Number(
    state.winner_entry_id
      ?? result.winner_entry_id
      ?? state.winner_team_id
      ?? result.winner_team_id
      ?? match?.winner_entry_id
      ?? match?.winner_team_id
      ?? 0
  ) || null;
  const rows = Array.isArray(participants) ? participants : [];
  const winner = rows.find((row) => Number(row?.teamId ?? row?.id ?? 0) === winnerTargetId) || null;
  const canonicalWinner = state.winner_participant && typeof state.winner_participant === "object"
    ? state.winner_participant
    : {};
  const resolved = Object.keys(canonicalWinner).length > 0
    ? canonicalWinner
    : winner?.resolved && typeof winner.resolved === "object" ? winner.resolved : {};
  const winnerLabel = String(resolved.display_name || winner?.label || winner?.name || "").trim();
  const hasWinner = Boolean(winnerTargetId && winnerLabel);
  const noWinner = disposition === "DRAW" || disposition === "ABANDONMENT" || !winnerTargetId;
  const series = scoreboard?.series;
  const resultLabel = series?.visible
    ? `${series.label || "Sets"} ${series.sideA || 0} – ${series.sideB || 0}`
    : `Final Score ${scoreboard?.score?.sideA || 0} – ${scoreboard?.score?.sideB || 0}`;
  const officialResult = disposition === "DRAW"
    ? "Official Result: Draw"
    : disposition === "ABANDONMENT" && !hasWinner
      ? "Official Result: Abandoned"
      : resultLabel;
  const downstreamMatchId = Number(match?.winner_to_match_id || 0) || null;
  return {
    completed,
    hasWinner: completed && hasWinner && !noWinner,
    title: "Match Complete",
    winnerLabel,
    winnerDepartment: String(resolved.department_name || "").trim(),
    resultLabel: officialResult,
    disposition: disposition || "NORMAL",
    nextStep: downstreamMatchId
      ? {
          type: "WAITING_PARTICIPANTS",
          matchId: downstreamMatchId,
          message: "Waiting for the next Match participants to be determined. The bracket will update automatically.",
        }
      : {
          type: "NONE",
          matchId: null,
          message: "No additional assigned Match is currently scheduled.",
        },
  };
};

export const buildConnectionStatus = (mode) => ({
  live: { label: "Live", tone: "success" },
  reconnecting: { label: "Reconnecting", tone: "warning" },
  stale: { label: "Using refresh mode", tone: "warning" },
  refresh_mode: { label: "Using refresh mode", tone: "neutral" },
  offline: { label: "Offline", tone: "danger" },
  token_expired: { label: "Sign in required", tone: "danger" },
}[String(mode || "").toLowerCase()] || { label: "Using refresh mode", tone: "neutral" });

export const isStaleMatchError = (error) => {
  const detail = error?.response?.data?.detail;
  const code = normalize(
    typeof detail === "string"
      ? detail
      : detail?.code || detail?.issue_code || error?.response?.data?.code
  );
  return code === "STALE_MATCH_STATE" || code.includes("STALE_MATCH_STATE");
};
