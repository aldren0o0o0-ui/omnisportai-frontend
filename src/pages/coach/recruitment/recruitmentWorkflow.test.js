import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWorkspace,
  TEAM_LOCKED_REGISTRATION_STATUSES,
  TEAM_RESUBMITTABLE_REGISTRATION_STATUSES,
} from "./recruitmentWorkflow.js";

const readyTeam = (status) => ({
  groupKey: "team:69",
  groupType: "team",
  teamName: "CITE Basketball - Men's Basketball",
  currentStatus: status,
  players: [{ applicant_id: 1, medical_certificate_status: "RECEIVED" }],
  isValid: true,
  counts: { accepted: 1 },
});

const readiness = {
  min_satisfied: true,
  max_ok: true,
  all_certs_uploaded: true,
  team_info_complete: true,
  is_ready: true,
  missing: [],
};

test("PENDING_REVIEW locks a submitted Coach team registration", () => {
  const workspace = buildWorkspace(readyTeam("PENDING_REVIEW"), null, readiness);

  assert.equal(TEAM_LOCKED_REGISTRATION_STATUSES.has("PENDING_REVIEW"), true);
  assert.equal(workspace.isLocked, true);
  assert.equal(workspace.isReady, true);
});

test("canonical returned states use the resubmission endpoint", () => {
  assert.equal(TEAM_RESUBMITTABLE_REGISTRATION_STATUSES.has("INCOMPLETE"), true);
  assert.equal(TEAM_RESUBMITTABLE_REGISTRATION_STATUSES.has("REJECTED"), true);
  assert.equal(TEAM_RESUBMITTABLE_REGISTRATION_STATUSES.has("EXPIRED"), true);
  assert.equal(TEAM_RESUBMITTABLE_REGISTRATION_STATUSES.has("PENDING_REVIEW"), false);
});
