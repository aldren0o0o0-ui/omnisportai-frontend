import test from "node:test";
import assert from "node:assert/strict";

import { normalizePlayerStatistics, normalizeStatistic } from "./statisticNormalizer.js";

const get = (result, key) => result.metrics[key];

test("basketball aliases normalize with precedence and safe unified zeroes", () => {
  const rawStats = Object.freeze({ POINTS: 11, ASSIST: 3, ASSISTS: 99, REBOUND: 6, STEAL: 2 });
  const before = JSON.stringify(rawStats);
  const result = normalizePlayerStatistics({ sportKey: "basketball", rawStats });
  assert.equal(get(result, "points").value, 11);
  assert.equal(get(result, "assists").value, 3);
  assert.equal(get(result, "rebounds").value, 6);
  assert.equal(get(result, "steals").value, 2);
  assert.equal(get(result, "blocks").value, 0);
  assert.equal(get(result, "turnovers").value, 0);
  assert.equal(JSON.stringify(rawStats), before);
});

test("missing, malformed, unknown, and not-applicable values remain distinct", () => {
  const malformed = normalizePlayerStatistics({ sportKey: "basketball", rawStats: { ASSIST: "not-a-number", INTERNAL_X: 4 } });
  assert.equal(get(malformed, "assists").status, "unavailable");
  assert.equal(get(malformed, "assists").displayValue, "—");
  assert.deepEqual(malformed.unknownKeys, ["INTERNAL_X"]);
  assert.equal(normalizeStatistic({ sportKey: "basketball", metricKey: "officialTime" }).status, "not_applicable");
  assert.equal(normalizeStatistic({ sportKey: "basketball", metricKey: "officialTime" }).displayValue, "N/A");
});

const SPORT_VECTORS = [
  ["volleyball", { SERVICE_ACE: 2, KILL: 4, BLOCK_POINT: 1 }, "serviceAces", 2],
  ["badminton", { SMASH_WIN: 3, SERVICE_ACE: 1 }, "smashWins", 3],
  ["beach_volleyball_2v2", { KILL: 4, BLOCK_POINT: 2 }, "kills", 4],
  ["takraw", { SERVICE_ACE: 2, ROLL_SPIKE: 3 }, "rollSpikes", 3],
  ["table_tennis_doubles", { RALLY_WIN: 5, SERVICE_ACE: 2 }, "rallyWins", 5],
  ["football_11v11", { GOAL: 2, YELLOW_CARD: 1, FOUL: 3 }, "goals", 2],
  ["handball_7v7", { GOAL: 3, SEVEN_METER_GOAL: 1, TWO_MIN_SUSPENSION: 1 }, "suspensions", 1],
];

test("unified sport profiles normalize representative authoritative counters", () => {
  for (const [sportKey, rawStats, metricKey, expected] of SPORT_VECTORS) {
    const result = normalizePlayerStatistics({ sportKey, rawStats });
    assert.equal(get(result, metricKey).value, expected, sportKey);
    assert.equal(get(result, metricKey).status, "tracked", sportKey);
  }
});

const SPECIALIZED_VECTORS = [
  ["tennis_doubles", "GAME_SET_MATCH", "serviceAces"],
  ["baseball_9v9", "INNING", "hits"],
  ["boxing", "JUDGE_SCORECARD", "warnings"],
  ["chess", "WIN_LOSS", "illegalMoves"],
  ["archery_recurve_individual", "COUNT_OR_TARGET", "arrow10s"],
];

test("specialized runtimes never turn unsupported empty player stats into zero", () => {
  for (const [sportKey, engineType, metricKey] of SPECIALIZED_VECTORS) {
    const result = normalizePlayerStatistics({ sportKey, rawStats: {}, engineType });
    assert.equal(get(result, metricKey).status, "unavailable", sportKey);
    assert.equal(get(result, metricKey).displayValue, "—", sportKey);
  }
});

test("timing sports use authoritative result values and never invent time", () => {
  for (const sportKey of ["athletics_100m_sprint", "swimming_100m_freestyle"]) {
    const complete = normalizePlayerStatistics({
      sportKey,
      engineType: "TIMED_RACE",
      resultState: { placement: 2, finish_time: 61.25, result_status: "FINISHED" },
    });
    assert.equal(get(complete, "rank").value, 2);
    assert.equal(get(complete, "officialTime").displayValue, "1:01.25");
    assert.equal(get(complete, "resultStatus").value, "FINISHED");
    const missing = normalizePlayerStatistics({ sportKey, engineType: "TIMED_RACE", resultState: {} });
    assert.equal(get(missing, "officialTime").displayValue, "—");
  }
});

test("all 15 sport profiles can be normalized without mutation or crashes", () => {
  const sports = [
    "basketball", "volleyball", "badminton", "beach_volleyball_2v2", "takraw",
    "tennis_doubles", "table_tennis_doubles", "football_11v11", "handball_7v7",
    "baseball_9v9", "boxing", "chess", "archery_recurve_individual",
    "athletics_100m_sprint", "swimming_100m_freestyle",
  ];
  for (const sportKey of sports) assert.ok(normalizePlayerStatistics({ sportKey }).profile, sportKey);
});
