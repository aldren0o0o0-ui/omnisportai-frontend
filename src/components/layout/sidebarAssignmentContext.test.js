import test from "node:test";
import assert from "node:assert/strict";
import { getSidebarAssignmentContext } from "./sidebarAssignmentContext.js";

test("selects context matching the active sidebar role", () => {
  const user = { assignment_contexts: [
    { type: "COACH", label: "CITE Basketball" },
    { type: "SPORTS_FACILITATOR", label: "Badminton" },
  ] };
  assert.equal(getSidebarAssignmentContext(user, "coach"), "CITE Basketball");
  assert.equal(getSidebarAssignmentContext(user, "sport-facilitator"), "Badminton");
});

test("summarizes multiple scopes without overflowing the sidebar", () => {
  const user = { assignment_contexts: [
    { type: "PLAYER", label: "CITE Smashers" },
    { type: "PLAYER", label: "Badminton Pair 1" },
  ] };
  assert.equal(getSidebarAssignmentContext(user, "viewer"), "CITE Smashers +1");
});
