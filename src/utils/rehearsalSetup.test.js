import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGovernanceGroups,
  humanizeSetupError,
  ongoingScheduleEvents,
  summarizeAdoption,
  validateInstitutionalDecisions,
} from "./rehearsalSetup.js";

test("institutional decisions require explicit values and enforce Takraw cap dependencies", () => {
  const requirement = { confirmation_schema: { fields: {
    match_format: { type: "enum", label: "Match format", values: ["BEST_OF_3_SETS"], required: true },
    regular_set_target: { type: "integer", label: "Regular set target", minimum: 15, maximum: 25, required: true },
    score_cap: { type: "integer", label: "Score cap", minimum: 15, maximum: 30, required: true },
  }, dependency_rules: [{ field: "score_cap", greater_than_or_equal: "regular_set_target" }] } };
  assert.equal(validateInstitutionalDecisions(requirement, {}).match_format, "Match format is required.");
  assert.match(validateInstitutionalDecisions(requirement, {
    match_format: "BEST_OF_3_SETS", regular_set_target: 21, score_cap: 20,
  }).score_cap, /must be at least/);
  assert.deepEqual(validateInstitutionalDecisions(requirement, {
    match_format: "BEST_OF_3_SETS", regular_set_target: 21, score_cap: 25,
  }), {});
});

test("governance profiles expose every covered event without duplicating profiles", () => {
  const groups = buildGovernanceGroups(
    [{ id: 86, sport_name: "Badminton", governance_status: "DRAFT" }],
    [
      { event_id: 1, event_name: "Men Singles", rules: { profile_id: 86 }, matches: { total: 7 } },
      { event_id: 2, event_name: "Women Singles", rules: { profile_id: 86 }, matches: { total: 7 } },
    ]
  );
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].covered_events.map((row) => row.event_name), ["Men Singles", "Women Singles"]);
});

test("adoption preview summary keeps eligible, governed, protected, and conflict counts distinct", () => {
  assert.deepEqual(summarizeAdoption([{ total_matches: 10, eligible_matches: 7, already_using_version: 2, started_matches_unchanged: 1 }]), {
    total: 10, eligible: 7, governed: 2, protected: 1, conflicts: 0,
  });
});

test("previous Intramural list includes only operationally active matches", () => {
  assert.deepEqual(ongoingScheduleEvents({ events: [{ id: 1, status: "ONGOING" }, { id: 2, status: "SCHEDULED" }] }).map((row) => row.id), [1]);
});

test("activation errors are presented in coordinator language", () => {
  assert.match(humanizeSetupError({ response: { data: { detail: { code: "ANOTHER_INTRAMURAL_ACTIVE" } } } }), /currently active Intramural/);
});
