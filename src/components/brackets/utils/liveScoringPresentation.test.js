import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConnectionStatus,
  buildLiveScoreboardPresentation,
  buildMatchCompletionPresentation,
  buildParticipantPresentation,
  getActionPresentation,
  getScoringReadinessPresentation,
  getSportInterface,
  getServicePresentation,
  getStatisticsPresentation,
  isCompletionAction,
  isMatchCompleted,
  isStaleMatchError,
  needsDetailedComposer,
  partitionSportActions,
} from "./liveScoringPresentation.js";

const setBoard = (overrides = {}) => buildLiveScoreboardPresentation({
  sportCode: "BADMINTON",
  participantModel: "DUO",
  participants: [{ teamId: 10, label: "COTE Pair" }, { teamId: 20, label: "CITE Pair" }],
  config: {
    match_type: "SETS",
    match_logic: { sets_to_win: 2, regular_set_target: 21, deciding_set_target: 15, win_by: 2, score_cap: 30 },
  },
  liveState: {
    set_state: { current_set: 2, set_points: { 10: 18, 20: 16 }, sets_won: { 10: 1, 20: 0 } },
    service_state: { server_team_id: 10 },
  },
  ...overrides,
});

const controls = (...eventTypes) => eventTypes.map((event_type) => ({
  id: event_type.toLowerCase(),
  event_type,
  label: event_type,
  enabled: true,
}));

test("capabilities fail closed and never synthesize sport actions", () => {
  assert.deepEqual(partitionSportActions(null, "BASKETBALL"), { primary: [], secondary: [] });
  assert.deepEqual(partitionSportActions({ controls: [] }, "BASKETBALL"), { primary: [], secondary: [] });
});

test("basketball separates frequent scoring from non-scoring controls", () => {
  const result = partitionSportActions({
    controls: controls("FREE_THROW_MADE", "TWO_POINT_MADE", "THREE_POINT_MADE", "PERSONAL_FOUL", "TIMEOUT"),
  }, "BASKETBALL");
  assert.deepEqual(result.primary.map((row) => row.event_type), ["FREE_THROW_MADE", "TWO_POINT_MADE", "THREE_POINT_MADE"]);
  assert.deepEqual(result.secondary.map((row) => row.event_type), ["PERSONAL_FOUL", "TIMEOUT"]);
});

test("set and rally sports keep points primary and faults secondary", () => {
  for (const sport of ["VOLLEYBALL", "BEACH_VOLLEYBALL", "BADMINTON", "TABLE_TENNIS", "SEPAK_TAKRAW"]) {
    const result = partitionSportActions({ controls: controls("RALLY_WON", "SERVICE_FAULT", "LET", "TIMEOUT") }, sport);
    assert.deepEqual(result.primary.map((row) => row.event_type), ["RALLY_WON"], sport);
    assert.deepEqual(result.secondary.map((row) => row.event_type), ["SERVICE_FAULT", "LET", "TIMEOUT"], sport);
  }
});

test("duplicate configured actions render only once", () => {
  const repeatedPoint = { id: "point-copy", event_type: "RALLY_WON", label: "Point copy", enabled: true };
  const result = partitionSportActions({ controls: [...controls("RALLY_WON", "LET"), repeatedPoint] }, "BADMINTON");
  assert.deepEqual(result.primary.map((row) => row.event_type), ["RALLY_WON"]);
  assert.deepEqual(result.secondary.map((row) => row.event_type), ["LET"]);
});

test("authoritative Badminton RALLY_WIN control is a primary point action", () => {
  const result = partitionSportActions({ controls: controls("RALLY_WIN", "SERVE_FAULT") }, "BADMINTON");
  assert.deepEqual(result.primary.map((row) => row.event_type), ["RALLY_WIN"]);
  assert.equal(getActionPresentation("RALLY_WIN").label, "Point");
});

test("player, substitution, and variable-value actions keep their validated detail form", () => {
  assert.equal(needsDetailedComposer({ requires_player: true, event_type: "PERSONAL_FOUL" }), true);
  assert.equal(needsDetailedComposer({ event_type: "SUBSTITUTION" }), true);
  assert.equal(needsDetailedComposer({ provides_value: true, event_type: "TIME_ADJUSTMENT" }), true);
  assert.equal(needsDetailedComposer({ provides_value: true, value: 3, event_type: "THREE_POINT_MADE" }), false);
});

test("all sport interfaces are presentation-only and preserve participant modes", () => {
  const expected = {
    VOLLEYBALL: "SET_RALLY",
    BEACH_VOLLEYBALL: "SET_RALLY",
    BADMINTON: "SET_RALLY",
    TABLE_TENNIS: "SET_RALLY",
    SEPAK_TAKRAW: "SET_RALLY",
    BASKETBALL: "DIRECT_SCORE",
    FOOTBALL: "DIRECT_SCORE",
    HANDBALL: "DIRECT_SCORE",
    TENNIS: "TENNIS",
    BOXING: "BOXING",
    ARCHERY: "ARCHERY",
    ATHLETICS: "RACE",
    SWIMMING: "RACE",
    BASEBALL: "BASEBALL",
    CHESS: "CHESS",
  };
  Object.entries(expected).forEach(([sport, layout]) => {
    assert.equal(getSportInterface(sport).layout, layout);
  });
  assert.equal(getSportInterface("UNKNOWN").layout, "GENERIC_READ_ONLY");
});

test("participant presentation supports TEAM SOLO DUO LANE and unresolved slots", () => {
  const rows = buildParticipantPresentation([
    { teamId: 10, label: "Falcons", side: 1, participantModel: "TEAM" },
    { teamId: 20, label: "", side: 2, participantModel: "DUO" },
    { teamId: 30, label: "Runner A", side: 3, lane: 4, participantModel: "LANE" },
  ]);
  assert.equal(rows[0].label, "Falcons");
  assert.equal(rows[1].label, "Waiting for previous result");
  assert.equal(rows[2].context, "Lane 4");
});

test("match-ending actions require confirmation but ordinary scores do not", () => {
  for (const action of ["FORFEIT", "DISQUALIFICATION", "OFFICIAL_DECISION", "RESULT_CONFIRMED", "GAME_END", "CHECKMATE"]) {
    assert.equal(isCompletionAction(action), true, action);
  }
  for (const action of ["POINT_WON", "GOAL", "THREE_POINT_MADE", "FOUL", "TIMEOUT"]) {
    assert.equal(isCompletionAction(action), false, action);
  }
});

test("recent actions use human labels and describe no-score effects", () => {
  assert.equal(getActionPresentation("THREE_POINT_MADE").label, "3-point shot");
  assert.equal(getActionPresentation("SERVICE_FAULT").label, "Service fault");
  assert.equal(getActionPresentation("LET").impact, "No score");
});

test("completed matches hide destructive actions", () => {
  assert.equal(isMatchCompleted({ match_status: "COMPLETED" }), true);
  assert.equal(isMatchCompleted({ match_status: "CANCELLED" }), true);
  assert.equal(isMatchCompleted({ match_status: "ABANDONED" }), true);
  assert.equal(isMatchCompleted({ status: "FINAL" }), true);
  assert.equal(isMatchCompleted({ match_status: "ONGOING" }), false);
});

test("connection status is understandable without exposing socket errors", () => {
  assert.equal(buildConnectionStatus("live").label, "Live");
  assert.equal(buildConnectionStatus("reconnecting").label, "Reconnecting");
  assert.equal(buildConnectionStatus("refresh_mode").label, "Using refresh mode");
  assert.equal(buildConnectionStatus("offline").label, "Offline");
  assert.equal(buildConnectionStatus("token_expired").label, "Sign in required");
});

test("stale-state conflicts are recognized without treating every conflict as stale", () => {
  assert.equal(isStaleMatchError({ response: { data: { detail: { code: "STALE_MATCH_STATE" } } } }), true);
  assert.equal(isStaleMatchError({ response: { data: { detail: "STALE_MATCH_STATE" } } }), true);
  assert.equal(isStaleMatchError({ response: { status: 409, data: { detail: { code: "MATCH_ALREADY_COMPLETED" } } } }), false);
});

test("statistics labels follow TEAM, SOLO, DUO, and LANE participant models", () => {
  assert.deepEqual(getStatisticsPresentation("TEAM"), { aggregate: "Team Stats", individual: "Player Stats" });
  assert.deepEqual(getStatisticsPresentation("SOLO"), { aggregate: null, individual: "Player Stats" });
  assert.deepEqual(getStatisticsPresentation("DUO"), { aggregate: "Pair Stats", individual: "Player Stats" });
  assert.deepEqual(getStatisticsPresentation("LANE"), { aggregate: "Event Results", individual: null });
});

test("service presentation identifies one owner or reports that service is unassigned", () => {
  const participants = [
    { teamId: 10, label: "COTE Pair" },
    { teamId: 20, label: "CITE Pair" },
  ];
  assert.deepEqual(getServicePresentation(null, participants), {
    ownerId: null,
    label: "Service not assigned",
  });
  assert.deepEqual(getServicePresentation(20, participants), {
    ownerId: 20,
    label: "Serving: CITE Pair",
  });
});

test("Chess winner projects an official 1-0 result instead of leaving the board at 0-0", () => {
  const result = buildLiveScoreboardPresentation({
    config: { match_type: "RESULT" },
    sportCode: "chess",
    participantModel: "SOLO",
    participants: [{ teamId: 41, label: "White" }, { teamId: 42, label: "Black" }],
    liveState: {
      score: { "41": 0, "42": 0 },
      match_status: "COMPLETED",
      winner_entry_id: 42,
      match_result: { status: "FINISHED", winner_team_id: 42 },
    },
  });
  assert.deepEqual(result.score, { sideA: 0, sideB: 1 });
});

test("Chess draw and specialized result points use official Chess result values", () => {
  const participants = [{ teamId: 41, label: "White" }, { teamId: 42, label: "Black" }];
  const draw = buildLiveScoreboardPresentation({
    config: { match_type: "RESULT" }, sportCode: "chess", participantModel: "SOLO", participants,
    liveState: { score: {}, match_status: "DRAW", match_result: { status: "DRAW" } },
  });
  assert.deepEqual(draw.score, { sideA: 0.5, sideB: 0.5 });
  const specialized = buildLiveScoreboardPresentation({
    config: { runtime_governance: { engine_type: "WIN_LOSS" } }, sportCode: "chess", participantModel: "SOLO", participants,
    liveState: { score: {}, chess_state: { result_points: { "41": 1, "42": 0 } } },
  });
  assert.deepEqual(specialized.score, { sideA: 1, sideB: 0 });
});

test("set presentation exposes best-of, current points, series, target, and service", () => {
  const board = setBoard();
  assert.equal(board.phase.current, 2);
  assert.equal(board.phase.bestOf, 3);
  assert.deepEqual(board.score, { sideA: 18, sideB: 16 });
  assert.deepEqual({ a: board.series.sideA, b: board.series.sideB, toWin: board.series.toWin }, { a: 1, b: 0, toWin: 2 });
  assert.equal(board.target.points, 21);
  assert.equal(board.target.winBy, 2);
  assert.equal(board.target.cap, 30);
  assert.equal(board.service.side, "A");
});

test("best-of-five and deciding-set target come only from locked configuration", () => {
  const board = setBoard({
    sportCode: "VOLLEYBALL",
    config: { match_type: "SETS", match_logic: { sets_to_win: 3, regular_set_target: 25, deciding_set_target: 15, win_by: 2 } },
    liveState: { set_state: { current_set: 5, set_points: { 10: 12, 20: 10 }, sets_won: { 10: 2, 20: 2 } } },
  });
  assert.equal(board.phase.bestOf, 5);
  assert.equal(board.phase.deciding, true);
  assert.equal(board.target.points, 15);
  assert.equal(board.indicators[0].code, "DECIDING_SET");
});

test("deuce, set point, and match point are deterministic display indicators", () => {
  const deuce = setBoard({ liveState: { set_state: { current_set: 1, set_points: { 10: 20, 20: 20 }, sets_won: { 10: 0, 20: 0 } } } });
  assert.equal(deuce.indicators.some((row) => row.code === "DEUCE"), true);
  const setPoint = setBoard({ liveState: { set_state: { current_set: 1, set_points: { 10: 20, 20: 19 }, sets_won: { 10: 0, 20: 0 } } } });
  assert.equal(setPoint.indicators.some((row) => row.code === "SET_POINT" && row.side === "A"), true);
  const matchPoint = setBoard({ liveState: { set_state: { current_set: 2, set_points: { 10: 20, 20: 19 }, sets_won: { 10: 1, 20: 0 } } } });
  assert.equal(matchPoint.indicators.some((row) => row.code === "MATCH_POINT" && row.side === "A"), true);
});

test("governed runtime target overrides stale historical rules for display", () => {
  const board = setBoard({
    sportCode: "SEPAK_TAKRAW",
    config: {
      match_type: "SETS",
      rules: { score_to_win: 21, sets_to_win: 2 },
      runtime_rules: { regular_set_target: 15, deciding_set_target: 11, sets_to_win: 2, win_by: 2, score_cap: 17 },
    },
    liveState: { set_state: { current_set: 1, set_points: { 10: 4, 20: 3 }, sets_won: { 10: 0, 20: 0 } } },
  });
  assert.equal(board.target.points, 15);
  assert.equal(board.target.deciding, 11);
});

test("historical set templates remain readable through rules fallback", () => {
  const board = setBoard({
    config: { match_type: "SETS", rules: { score_to_win: 21, max_sets: 3, sets_to_win: 2, win_by: 2 } },
  });
  assert.equal(board.phase.bestOf, 3);
  assert.equal(board.target.points, 21);
});

test("completed DUO result uses the canonical winner entry label", () => {
  const scoreboard = setBoard();
  const result = buildMatchCompletionPresentation({
    liveState: {
      match_status: "COMPLETED",
      winner_entry_id: 10,
      match_result: { status: "FINISHED", winner_entry_id: 10, disposition: "NORMAL" },
    },
    participants: [
      { teamId: 10, label: "COTE Pair", participantModel: "DUO", resolved: { display_name: "COTE Pair", department_name: "COTE", members: [{ name: "Donna Marie" }, { name: "Sel Ann" }] } },
      { teamId: 20, label: "CITE Pair", participantModel: "DUO" },
    ],
    scoreboard,
  });
  assert.equal(result.completed, true);
  assert.equal(result.hasWinner, true);
  assert.equal(result.winnerLabel, "COTE Pair");
  assert.equal(result.winnerDepartment, "COTE");
  assert.equal(result.resultLabel, "Games 1 – 0");
});

test("completed bracket Match gives dependency-aware next-Match guidance", () => {
  const result = buildMatchCompletionPresentation({
    match: { winner_to_match_id: 700 },
    liveState: { match_status: "COMPLETED", winner_entry_id: 10, match_result: { status: "FINISHED", winner_entry_id: 10 } },
    participants: [{ teamId: 10, label: "COTE Pair", participantModel: "DUO" }],
    scoreboard: { participantModel: "DUO", score: { sideA: 2, sideB: 0 }, series: { visible: true, label: "Games", sideA: 2, sideB: 0 } },
  });
  assert.equal(result.nextStep.type, "WAITING_PARTICIPANTS");
  assert.equal(result.nextStep.matchId, 700);
});

test("completed SOLO and TEAM results use canonical participant labels", () => {
  for (const [model, label] of [["SOLO", "CITE Singles"], ["TEAM", "Blue Eagles"]]) {
    const result = buildMatchCompletionPresentation({
      liveState: { match_status: "COMPLETED", winner_team_id: 10, match_result: { status: "FINISHED", winner_team_id: 10 } },
      participants: [{ teamId: 10, label, participantModel: model, resolved: model === "SOLO" ? { members: [{ name: label }] } : {} }],
      scoreboard: { participantModel: model, score: { sideA: 2, sideB: 0 }, series: { visible: false } },
    });
    assert.equal(result.winnerLabel, label);
    assert.equal(result.hasWinner, true);
  }
});

test("draw and abandonment never show congratulations", () => {
  for (const disposition of ["DRAW", "ABANDONMENT"]) {
    const result = buildMatchCompletionPresentation({
      liveState: { match_status: disposition === "DRAW" ? "DRAW" : "COMPLETED", match_result: { status: "FINISHED", disposition } },
      participants: [],
      scoreboard: { score: { sideA: 1, sideB: 1 }, series: { visible: false } },
    });
    assert.equal(result.completed, true);
    assert.equal(result.hasWinner, false);
  }
});

test("operational Match blockers override otherwise available scoring controls", () => {
  const presentation = getScoringReadinessPresentation({
    rule_readiness: { scoring_ready: true, message: "Rules are ready." },
    match_readiness: {
      ready: false,
      blockers: [{
        code: "FACILITATOR_NOT_ASSIGNED",
        message: "Assign a Sports Facilitator before scoring begins.",
      }],
    },
  }, "BADMINTON");
  assert.equal(presentation.ready, false);
  assert.equal(presentation.code, "FACILITATOR_NOT_ASSIGNED");
  assert.equal(presentation.message, "Assign a Sports Facilitator before scoring begins.");
});

test("scoring readiness remains capability-driven when all operational checks pass", () => {
  const presentation = getScoringReadinessPresentation({
    rule_readiness: { scoring_ready: true },
    match_readiness: { ready: true, blockers: [] },
  }, "BADMINTON");
  assert.equal(presentation.ready, true);
});

test("volleyball classifies Service Ace, Kill, and Block Point as primary scoring actions", () => {
  const result = partitionSportActions({
    controls: controls("RALLY_WIN", "SERVICE_ACE", "KILL", "BLOCK_POINT", "NET_FAULT", "TIMEOUT"),
  }, "VOLLEYBALL");
  assert.deepEqual(
    result.primary.map((row) => row.event_type),
    ["RALLY_WIN", "SERVICE_ACE", "KILL", "BLOCK_POINT"]
  );
  assert.deepEqual(
    result.secondary.map((row) => row.event_type),
    ["NET_FAULT", "TIMEOUT"]
  );
  assert.equal(getActionPresentation("SERVICE_ACE").label, "Service ace");
  assert.equal(getActionPresentation("KILL").label, "Kill");
  assert.equal(getActionPresentation("BLOCK_POINT").label, "Block point");
});

test("takraw classifies Service Ace and Roll Spike as primary scoring actions", () => {
  const result = partitionSportActions({
    controls: controls("RALLY_WIN", "SERVICE_ACE", "ROLL_SPIKE", "NET_FAULT", "FOOT_FAULT"),
  }, "TAKRAW");
  assert.deepEqual(
    result.primary.map((row) => row.event_type),
    ["RALLY_WIN", "SERVICE_ACE", "ROLL_SPIKE"]
  );
  assert.deepEqual(
    result.secondary.map((row) => row.event_type),
    ["NET_FAULT", "FOOT_FAULT"]
  );
  assert.equal(getActionPresentation("SERVICE_ACE").label, "Service ace");
  assert.equal(getActionPresentation("ROLL_SPIKE").label, "Roll spike");
  assert.equal(getActionPresentation("FOOT_FAULT").label, "Foot fault");
});


