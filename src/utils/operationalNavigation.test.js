import assert from "node:assert/strict";
import test from "node:test";

import { resolveOperationalDestination } from "./operationalNavigation.js";
import { buildFallbackNotificationPath, getRelatedNotificationPath, resolveRoleKeyFromRoles } from "./notificationRouting.js";

const context = {
  workspace_id: 3,
  tournament_id: 9,
  sport_id: 5,
  department_id: 2,
  return_to: "/coordinator/intramurals?workspace_id=3&section=assignments",
};

test("each operational role receives its own dashboard destination", () => {
  assert.equal(resolveOperationalDestination("dashboard", "sports_coordinator"), "/coordinator/dashboard");
  assert.equal(resolveOperationalDestination("dashboard", "department_manager"), "/department/dashboard");
  assert.equal(resolveOperationalDestination("dashboard", "sports_facilitator"), "/sport-facilitator/dashboard");
  assert.equal(resolveOperationalDestination("dashboard", "coach"), "/coach/dashboard");
  assert.equal(resolveOperationalDestination("dashboard", "viewer"), "/viewer/dashboard");
});

test("coach assignment action never crosses facilitator, coach, or viewer routes", () => {
  assert.match(resolveOperationalDestination("coach_assignments", "sports_coordinator", context), /^\/department\/coach-assignments\?/);
  assert.match(resolveOperationalDestination("coach_assignments", "department_manager", context), /^\/department\/coach-assignments\?/);
  assert.equal(resolveOperationalDestination("coach_assignments", "sports_facilitator", context), null);
  assert.equal(resolveOperationalDestination("coach_assignments", "coach", context), null);
  assert.equal(resolveOperationalDestination("coach_assignments", "viewer", context), null);
});

test("resolution links preserve exact Workspace and target context", () => {
  const destination = resolveOperationalDestination("coach_assignments", { effective_mode: "department_manager" }, context);
  const query = new URL(`https://example.test${destination}`).searchParams;
  assert.equal(query.get("workspace_id"), "3");
  assert.equal(query.get("tournament_id"), "9");
  assert.equal(query.get("sport_id"), "5");
  assert.equal(query.get("department_id"), "2");
  assert.equal(query.get("return_to"), context.return_to);
});

test("shared operational actions remain within every role prefix", () => {
  const expected = {
    sports_coordinator: "/coordinator/brackets",
    department_manager: "/department/brackets",
    sports_facilitator: "/sport-facilitator/brackets",
    coach: "/coach/brackets",
    viewer: "/viewer/brackets",
  };
  for (const [mode, path] of Object.entries(expected)) {
    assert.equal(resolveOperationalDestination("brackets", mode), path);
  }
});

test("schedule resolution actions never cross into coordinator settings", () => {
  assert.equal(
    resolveOperationalDestination("venues", "sports_coordinator", context),
    "/coordinator/intramurals/9/settings/venues"
  );
  assert.match(resolveOperationalDestination("program_blocks", "sports_coordinator", context), /^\/coordinator\/tournaments\?/);
  for (const mode of ["sports_facilitator", "department_manager", "coach", "viewer"]) {
    assert.equal(resolveOperationalDestination("venues", mode, context), null);
    assert.equal(resolveOperationalDestination("program_blocks", mode, context), null);
  }
});

test("venue navigation safely falls back when no Intramural is selected", () => {
  assert.equal(
    resolveOperationalDestination("venues", "sports_coordinator"),
    "/coordinator/venues"
  );
});

test("unknown notification context falls back to viewer-safe navigation", () => {
  assert.equal(resolveRoleKeyFromRoles({ roleNames: [] }), "viewer");
  assert.equal(buildFallbackNotificationPath(), "/viewer/notifications");
});

test("medical certificate submission routes the Coach to recruitment", () => {
  assert.equal(
    getRelatedNotificationPath({
      roleKey: "coach",
      notification: {
        event_type: "MEDICAL_CERTIFICATE_SUBMITTED",
        tournament_id: 9,
        metadata: { application_id: 41 },
      },
    }),
    "/coach/player-applications"
  );
});

test("facilitator application links use the consolidated pending-review directory", () => {
  const destination = resolveOperationalDestination("applications", "sports_facilitator", context);
  const url = new URL(`https://example.test${destination}`);
  assert.equal(url.pathname, "/sport-facilitator/teams-and-players");
  assert.equal(url.searchParams.get("status"), "PENDING_REVIEW");
  assert.equal(url.searchParams.get("tournament_id"), "9");
});

test("competition-entry notifications open the consolidated facilitator workspace", () => {
  assert.equal(
    getRelatedNotificationPath({
      roleKey: "sport-facilitator",
      notification: { event_type: "COMPETITION_ENTRY_SUBMITTED", tournament_id: 9 },
    }),
    "/sport-facilitator/teams-and-players?status=PENDING_REVIEW"
  );
});
