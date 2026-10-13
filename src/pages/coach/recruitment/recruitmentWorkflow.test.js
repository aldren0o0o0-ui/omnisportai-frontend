import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWorkspace,
  computeNextAction,
  getRegistrationWindowStatus,
  isRegistrationOpenStatus,
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

test("registration window status accurately reflects intramural lifecycle", () => {
  assert.equal(isRegistrationOpenStatus("PLANNING"), true);
  assert.equal(isRegistrationOpenStatus("DRAFT"), false);
  assert.equal(isRegistrationOpenStatus("READY"), false);
  assert.equal(isRegistrationOpenStatus("ACTIVE"), false);
  assert.equal(isRegistrationOpenStatus("PLANNING", true), false); // historical

  const planning = getRegistrationWindowStatus("DRAFT");
  assert.equal(planning.isOpen, false);
  assert.equal(planning.isPlanning, true);
  assert.equal(planning.isClosed, false);
  assert.match(planning.reason, /Planning phase/i);

  const open = getRegistrationWindowStatus("PLANNING");
  assert.equal(open.isOpen, true);
  assert.equal(open.isPlanning, false);
  assert.equal(open.isClosed, false);
  assert.equal(open.reason, "");

  const closed = getRegistrationWindowStatus("READY");
  assert.equal(closed.isOpen, false);
  assert.equal(closed.isPlanning, false);
  assert.equal(closed.isClosed, true);
  assert.match(closed.reason, /closed/i);

  const historical = getRegistrationWindowStatus("PLANNING", true);
  assert.equal(historical.isOpen, false);
  assert.equal(historical.isClosed, true);
});

test("planning phase blocks team submission and reflects in next action", () => {
  const regWindow = getRegistrationWindowStatus("DRAFT");
  const workspace = buildWorkspace(readyTeam("INCOMPLETE"), null, readiness, regWindow);

  assert.equal(workspace.isRegistrationOpen, false);
  assert.equal(workspace.isReady, false);
  assert.equal(workspace.missingReasons.some((r) => /Planning phase/i.test(r)), true);

  const nextAction = computeNextAction(workspace);
  assert.equal(nextAction.buttonLabel, "Planning Phase");
  assert.equal(nextAction.disabled, true);
});

test("closed registration blocks team submission and reflects in next action", () => {
  const regWindow = getRegistrationWindowStatus("READY");
  const workspace = buildWorkspace(readyTeam("INCOMPLETE"), null, readiness, regWindow);

  assert.equal(workspace.isRegistrationOpen, false);
  assert.equal(workspace.isReady, false);
  assert.equal(workspace.missingReasons.some((r) => /closed/i.test(r)), true);

  const nextAction = computeNextAction(workspace);
  assert.equal(nextAction.buttonLabel, "Registration Closed");
  assert.equal(nextAction.disabled, true);
});
