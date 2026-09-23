import test from "node:test";
import assert from "node:assert/strict";

import { buildUserAssignmentLabels } from "./userAssignmentPresentation.js";

test("presents role-specific scopes instead of a generic assignment count", () => {
  const labels = buildUserAssignmentLabels({
    base_role: { role_name: "COACH" },
    role_assignments: [
      { role_name: "COACH", team_name: "CITE Blue Eagles" },
      { role_name: "SPORTS_FACILITATOR", sport_name: "Badminton" },
      { role_name: "DEPARTMENT_MANAGER", department_name: "CITE" },
    ],
    player_assignments: [{ team_name: "CITE Smashers" }],
  });

  assert.deepEqual(labels, [
    "Coach · CITE Blue Eagles",
    "Facilitator · Badminton",
    "Manager · CITE",
    "Player · CITE Smashers",
  ]);
});

test("describes a global coordinator even when its scope row is absent", () => {
  assert.deepEqual(
    buildUserAssignmentLabels({ base_role: { role_name: "SPORTS_COORDINATOR" } }),
    ["Coordinator · All departments and sports"]
  );
});
