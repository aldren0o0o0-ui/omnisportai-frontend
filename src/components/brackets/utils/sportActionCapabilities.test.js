// utils/sportActionCapabilities.test.js

import assert from "node:assert/strict";
import test from "node:test";

import { applyLockedSnapshotCapabilities } from "./sportActionCapabilities.js";

const config = (actions, controls) => ({
  supported_actions: actions,
  controls: controls.map((event_type) => ({ id: event_type, event_type })),
  action_groups: [{ group: "scoring", controls: controls.map((event_type) => ({ event_type })) }],
});

test("locked snapshot capabilities hide cross-sport actions", () => {
  const result = applyLockedSnapshotCapabilities(
    config(["RALLY_WON", "SERVICE_FAULT"], ["RALLY_WON", "SERVICE_FAULT", "THREE_POINT_MADE"])
  );
  assert.deepEqual(
    result.controls.map((row) => row.event_type),
    ["RALLY_WON", "SERVICE_FAULT"]
  );
});

test("Beach Volleyball capability list hides substitutions", () => {
  const result = applyLockedSnapshotCapabilities(
    config(["RALLY_WON", "TIMEOUT"], ["RALLY_WON", "TIMEOUT", "SUBSTITUTION"])
  );
  assert.equal(result.controls.some((row) => row.event_type === "SUBSTITUTION"), false);
});

test("missing capability data fails closed", () => {
  const result = applyLockedSnapshotCapabilities(
    config(undefined, ["GOAL", "FOUL"])
  );
  assert.deepEqual(result.controls, []);
  assert.deepEqual(result.action_groups, []);
});

test("TEAM, SOLO, and DUO labels are not rewritten by capability filtering", () => {
  for (const participantModel of ["TEAM", "SOLO", "DUO"]) {
    const result = applyLockedSnapshotCapabilities({
      ...config(["POINT_WON"], ["POINT_WON"]),
      runtime_model: { participant_model: participantModel },
    });
    assert.equal(result.runtime_model.participant_model, participantModel);
  }
});

test("each Phase 3 sport renders only its locked-snapshot controls", () => {
  const sports = {
    VOLLEYBALL: ["RALLY_WON", "SERVICE_FAULT", "TIMEOUT", "SUBSTITUTION"],
    BEACH_VOLLEYBALL: ["RALLY_WON", "SERVICE_FAULT", "TIMEOUT"],
    BADMINTON: ["POINT_WON", "SERVICE_FAULT", "LET", "REPLAY"],
    TABLE_TENNIS: ["RALLY_WON", "SERVICE_FAULT", "LET", "TIMEOUT"],
    BASKETBALL: ["FREE_THROW_MADE", "TWO_POINT_MADE", "THREE_POINT_MADE", "PERSONAL_FOUL"],
    FOOTBALL: ["GOAL", "FOUL", "YELLOW_CARD", "PENALTY_SCORED"],
    HANDBALL: ["GOAL", "FOUL", "SEVEN_METER_SCORED", "TWO_MINUTE_SUSPENSION"],
  };
  const unrelated = ["THREE_POINT_MADE", "SUBSTITUTION", "GOAL", "RALLY_WON"];
  for (const [sport, actions] of Object.entries(sports)) {
    const result = applyLockedSnapshotCapabilities({
      ...config(actions, [...new Set([...actions, ...unrelated])]),
      runtime_governance: { sport_code: sport },
    });
    assert.deepEqual(
      result.controls.map((row) => row.event_type),
      actions,
      `${sport} exposed an action outside its snapshot`
    );
  }
});

test("unconfirmed Takraw exposes no scoring controls", () => {
  const result = applyLockedSnapshotCapabilities({
    ...config([], ["RALLY_WON", "SERVICE_FAULT"]),
    runtime_governance: {
      sport_code: "SEPAK_TAKRAW",
      support_status: "INSTITUTION_CONFIRMATION_REQUIRED",
    },
  });
  assert.deepEqual(result.controls, []);
});

test("backend action-group identifiers are retained only for permitted controls", () => {
  const result = applyLockedSnapshotCapabilities({
    supported_actions: ["GOAL", "FOUL"],
    controls: [
      { id: "goal-control", event_type: "GOAL" },
      { id: "foul-control", event_type: "FOUL" },
      { id: "three-control", event_type: "THREE_POINT_MADE" },
    ],
    action_groups: [
      {
        id: "scoring",
        controls: ["goal-control", "three-control"],
      },
      {
        id: "violations",
        controls: ["foul-control"],
      },
    ],
  });
  assert.deepEqual(result.action_groups[0].controls, ["goal-control"]);
  assert.deepEqual(result.action_groups[1].controls, ["foul-control"]);
});
