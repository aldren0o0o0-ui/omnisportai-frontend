import assert from "node:assert/strict";
import test from "node:test";

import {
  controlsByEventType,
  isDedicatedEntryEngine,
  resolveSpecializedEngine,
  specializedStateForEngine,
} from "./specializedScoringUi.js";

test("specialized engine resolution is snapshot-driven and fails closed", () => {
  assert.equal(
    resolveSpecializedEngine({ runtime_model: { engine_type: "GAME_SET_MATCH" } }),
    "GAME_SET_MATCH"
  );
  assert.equal(resolveSpecializedEngine({ match_logic: { engine_type: "INNING" } }), "INNING");
  assert.equal(resolveSpecializedEngine({ match_logic: { engine_type: "UNKNOWN" } }), "");
  assert.equal(resolveSpecializedEngine(null), "");
});

test("dedicated entry forms are limited to scorecard, archery, and race engines", () => {
  for (const engine of ["JUDGE_SCORECARD", "COUNT_OR_TARGET", "TIMED_RACE", "PLACEMENT", "WIN_LOSS"]) {
    assert.equal(isDedicatedEntryEngine(engine), true);
  }
  for (const engine of ["GAME_SET_MATCH", "INNING", "TIMED_TEAM"]) {
    assert.equal(isDedicatedEntryEngine(engine), false);
  }
});

test("specialized state selects only the active engine projection", () => {
  const state = {
    tennis_state: { points: { 1: "40" } },
    boxing_state: { current_round: 2 },
    archery_state: { current_end: 3 },
    race_state: { confirmed: true },
    baseball_state: { inning: 5 },
    chess_state: { result_reason: "CHECKMATE" },
  };
  assert.equal(specializedStateForEngine("GAME_SET_MATCH", state).points[1], "40");
  assert.equal(specializedStateForEngine("JUDGE_SCORECARD", state).current_round, 2);
  assert.equal(specializedStateForEngine("COUNT_OR_TARGET", state).current_end, 3);
  assert.equal(specializedStateForEngine("TIMED_RACE", state).confirmed, true);
  assert.equal(specializedStateForEngine("INNING", state).inning, 5);
  assert.equal(specializedStateForEngine("WIN_LOSS", state).result_reason, "CHECKMATE");
});

test("specialized controls expose only backend-provided capabilities", () => {
  const controls = controlsByEventType({
    controls: [
      { event_type: "ARROW_RECORDED" },
      { event_type: "RESULT_CONFIRMED" },
    ],
  });
  assert.equal(controls.has("ARROW_RECORDED"), true);
  assert.equal(controls.has("JUDGE_SCORE_SUBMITTED"), false);
});
