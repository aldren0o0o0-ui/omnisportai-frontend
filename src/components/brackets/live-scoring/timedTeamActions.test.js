import test from "node:test";
import assert from "node:assert/strict";
import { classifyTimedTeamControls, findTimedTeamControl, getTimedTeamActionControls } from "./timedTeamActions.js";
import { buildEventPayload } from "../eventComposer/core/buildEventPayload.js";

const controls = [
  { id: "ft", event_type: "FREE_THROW_MADE", requires_team: true, requires_player: true, enabled: true },
  { id: "two", event_type: "FIELD_GOAL_2_MADE", requires_team: true, requires_player: true, enabled: true },
  { id: "three", event_type: "FIELD_GOAL_3_MADE", requires_team: true, requires_player: true, enabled: true },
  { id: "timeout", event_type: "TIMEOUT", requires_team: true, requires_player: false, enabled: true },
  { id: "start", event_type: "CLOCK_START", requires_team: false, enabled: true },
  { id: "stop", event_type: "CLOCK_STOP", requires_team: false, enabled: true },
  { id: "period", event_type: "QUARTER_ADVANCE", requires_team: false, enabled: true },
  { id: "possession", event_type: "POSSESSION_SET", requires_team: true, enabled: true },
  { id: "reset", event_type: "CLOCK_RESET", requires_team: false, enabled: true },
  { id: "rare", event_type: "VIDEO_REVIEW", requires_team: false, enabled: true },
];

test("Basketball canonical scoring controls map to +1, +2, and +3 in point order", () => {
  const result = classifyTimedTeamControls(controls);
  assert.deepEqual(result.primary.map((row) => [row.event_type, row.quickLabel]), [
    ["FREE_THROW_MADE", "+1"],
    ["FIELD_GOAL_2_MADE", "+2"],
    ["FIELD_GOAL_3_MADE", "+3"],
  ]);
  assert.equal(result.secondary[0].event_type, "TIMEOUT");
  assert.equal(result.destructive[0].event_type, "CLOCK_RESET");
  assert.equal(result.fallback[0].event_type, "VIDEO_REVIEW");
});

test("clock, period, and possession controls are discovered from existing configuration", () => {
  const utility = classifyTimedTeamControls(controls).utility;
  assert.equal(findTimedTeamControl(utility, /CLOCK_START/).id, "start");
  assert.equal(findTimedTeamControl(utility, /CLOCK_STOP/).id, "stop");
  assert.equal(findTimedTeamControl(utility, /QUARTER_ADVANCE/).id, "period");
  assert.equal(findTimedTeamControl(utility, /POSSESSION/).id, "possession");
});

test("action container includes every remaining action once and excludes dedicated controls", () => {
  const duplicated = [...controls, { id: "timeout-copy", event_type: "TIMEOUT", enabled: true }];
  const actions = getTimedTeamActionControls(classifyTimedTeamControls(duplicated));
  assert.deepEqual(actions.map((row) => row.event_type), ["TIMEOUT", "VIDEO_REVIEW", "CLOCK_RESET"]);
});

test("new +2 quick path produces the existing canonical composer payload", () => {
  globalThis.window = { crypto: { randomUUID: () => "quick-event" } };
  const control = controls[1];
  const config = {
    state_version: 5,
    event_types: [{ name: "FIELD_GOAL_2_MADE", has_team: true, has_player: true }],
  };
  const quick = buildEventPayload({
    selectedControl: control,
    formState: { selectedTeamId: 22, selectedPlayerId: 7, inputValue: "", inputBoolean: false },
    validatedConfig: config,
    liveStateVersion: 12,
  });
  assert.equal(quick.error, null);
  assert.deepEqual(quick.payload, {
    event_type: "FIELD_GOAL_2_MADE",
    team_id: 22,
    player_id: 7,
    client_event_id: "quick-event",
    expected_state_version: 12,
  });
});

test("required-player scoring remains blocked by the canonical payload builder", () => {
  globalThis.window = { crypto: { randomUUID: () => "unused" } };
  const result = buildEventPayload({
    selectedControl: controls[0],
    formState: { selectedTeamId: 22, selectedPlayerId: "", inputValue: "", inputBoolean: false },
    validatedConfig: { event_types: [{ name: "FREE_THROW_MADE", has_player: true }] },
    liveStateVersion: 1,
  });
  assert.equal(result.payload, null);
  assert.equal(result.error, "Please select a player.");
});
