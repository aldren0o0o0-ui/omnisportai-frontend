import assert from "node:assert/strict";
import test from "node:test";

import {
  BOXING_SCORE_PRESETS,
  buildBoxingCornerPayload,
  buildBoxingJudgePayload,
  buildBoxingScorecardRows,
  isValidBoxingCard,
  resolveBoxingRules,
  submitBoxingRoundSequentially,
} from "./boxingScorecardModel.js";

test("Boxing rules use configured rounds, judges, duration, and scoring system", () => {
  assert.deepEqual(resolveBoxingRules({ runtime_rules: { rounds: 3, judge_count: 5, round_duration_minutes: 2, scoring_system: "TEN_POINT_MUST" } }), {
    rounds: 3, judgeCount: 5, roundDurationMinutes: 2, scoringSystem: "TEN POINT MUST",
  });
});

test("Boxing presets preserve explicit Red-Blue orientation", () => {
  assert.deepEqual(BOXING_SCORE_PRESETS.map(({ id, red, blue }) => [id, red, blue]), [
    ["10-9", 10, 9], ["10-8", 10, 8], ["10-7", 10, 7], ["9-10", 9, 10], ["8-10", 8, 10], ["7-10", 7, 10],
  ]);
});

test("Boxing cards mirror the runtime boundary", () => {
  assert.equal(isValidBoxingCard({ red: 10, blue: 9 }), true);
  assert.equal(isValidBoxingCard({ red: 9, blue: 10 }), true);
  assert.equal(isValidBoxingCard({ red: 10, blue: 10 }), false);
  assert.equal(isValidBoxingCard({ red: 11, blue: 9 }), false);
  assert.equal(isValidBoxingCard({ red: 10, blue: 6 }), false);
});

test("judge payload targets both exact entry sides without inventing a bulk API", () => {
  assert.deepEqual(buildBoxingJudgePayload({ judge: 2, round: 3, redId: 41, blueId: 42, red: 10, blue: 8 }), {
    event_type: "JUDGE_SCORE_SUBMITTED",
    metadata: { judge_id: 2, round: 3, scores: { "41": 10, "42": 8 } },
  });
});

test("corner actions preserve both participant and SOLO athlete attribution", () => {
  const participant = { teamId: 41, activePlayers: [{ id: 901, name: "Red Athlete" }] };
  assert.deepEqual(buildBoxingCornerPayload({ eventType: "warning", participant }), {
    event_type: "WARNING", team_id: 41, player_id: 901,
  });
  assert.deepEqual(buildBoxingCornerPayload({ eventType: "DEDUCTION", participant, value: 1 }), {
    event_type: "DEDUCTION", team_id: 41, player_id: 901, value: 1,
  });
  assert.deepEqual(buildBoxingCornerPayload({ eventType: "KNOCKOUT", participant, metadata: { round: 2 } }), {
    event_type: "KNOCKOUT", team_id: 41, player_id: 901, metadata: { round: 2 },
  });
});

test("scorecard rows support five configured judges and calculate display totals", () => {
  const rows = buildBoxingScorecardRows({ scorecards: { "1": { "1": { "41": 10, "42": 9 } } }, judgeCount: 5, rounds: 3, redId: 41, blueId: 42 });
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[0], { judge: 1, cards: [{ red: 10, blue: 9 }, null, null], redTotal: 10, blueTotal: 9 });
});

test("round cards submit sequentially and stop after the first failed request", async () => {
  const calls = [];
  const result = await submitBoxingRoundSequentially({
    cards: { 1: { red: 10, blue: 9 }, 2: { red: 10, blue: 8 }, 3: { red: 9, blue: 10 } },
    judgeCount: 3, round: 2, rounds: 3, redId: 41, blueId: 42,
    submit: async (payload) => { calls.push(payload.metadata.judge_id); return payload.metadata.judge_id !== 2; },
  });
  assert.deepEqual(calls, [1, 2]);
  assert.equal(result.ok, false);
});

test("round submission reports the exact missing judge before making requests", async () => {
  let calls = 0;
  const result = await submitBoxingRoundSequentially({
    cards: { 1: { red: 10, blue: 9 }, 3: { red: 9, blue: 10 } },
    judgeCount: 3, round: 2, rounds: 3, redId: 41, blueId: 42,
    submit: async () => { calls += 1; return true; },
  });
  assert.equal(calls, 0);
  assert.equal(result.error, "Judge 2 score is missing for Round 2.");
});

test("round submission skips immutable accepted cards and advances after missing cards save", async () => {
  const calls = [];
  const result = await submitBoxingRoundSequentially({
    cards: { 1: { red: 10, blue: 9 }, 2: { red: 10, blue: 8 }, 3: { red: 9, blue: 10 } },
    acceptedCards: { "1": { "41": 10, "42": 9 } }, judgeCount: 3, round: 1, rounds: 3, redId: 41, blueId: 42,
    submit: async (payload) => { calls.push(payload.event_type === "ROUND_END" ? "END" : payload.metadata.judge_id); return true; },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(calls, [2, 3, "END"]);
});
