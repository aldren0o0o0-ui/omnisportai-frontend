import test from "node:test";
import assert from "node:assert/strict";

import {
  getSportUiProfile,
  resolveScoringProfileFamily,
  SCORING_PROFILE_FAMILY,
} from "./sportUiProfile.js";

const cases = [
  ["TIMED_TEAM", "TIMED_TEAM"],
  ["SETS", "SET_RALLY"],
  ["GAME_SET_MATCH", "GAME_SET_MATCH"],
  ["WIN_LOSS", "RESULT"],
  ["TIMED_RACE", "TIMED_RACE"],
  ["JUDGE_SCORECARD", "JUDGE_SCORECARD"],
  ["COUNT_OR_TARGET", "COUNT_OR_TARGET"],
  ["INNING", "INNING"],
];

test("all canonical runtime engines resolve to stable frontend profile families", () => {
  for (const [engineType, expected] of cases) {
    assert.deepEqual(resolveScoringProfileFamily({ engineType }), {
      engineType,
      profileFamily: expected,
      source: "CANONICAL_ENGINE",
    });
  }
});

test("canonical engine wins over a conflicting legacy sport-name classification", () => {
  const profile = getSportUiProfile("baseball_9v9", null, {
    runtime_governance: { engine_type: "INNING" },
    match_type: "TIME",
  });
  assert.equal(profile.engineType, "INNING");
  assert.equal(profile.profileFamily, SCORING_PROFILE_FAMILY.INNING);
  assert.equal(profile.profileSource, "CANONICAL_ENGINE");
});

test("legacy sport metadata remains an explicit compatibility fallback", () => {
  const profile = getSportUiProfile("badminton", null, { match_type: "SETS" });
  assert.equal(profile.profileFamily, SCORING_PROFILE_FAMILY.LEGACY);
  assert.equal(profile.profileSource, "LEGACY_FALLBACK");
  assert.equal(profile.scoringMode, "SET_BASED");
});

test("rule values are not synthesized by profile-family resolution", () => {
  const profile = getSportUiProfile("badminton", null, {
    runtime_governance: { engine_type: "SETS" },
    rules: { regular_set_target: 15, win_by: 2 },
  });
  assert.equal(profile.profileFamily, SCORING_PROFILE_FAMILY.SET_RALLY);
  assert.equal(Object.hasOwn(profile, "regularSetTarget"), false);
  assert.equal(Object.hasOwn(profile, "winBy"), false);
});
