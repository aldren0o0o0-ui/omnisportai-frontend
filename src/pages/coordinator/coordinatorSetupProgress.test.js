import assert from "node:assert/strict";
import test from "node:test";

import {
  COORDINATOR_DASHBOARD_PHASE,
  deriveCompetitionSetupProgress,
  deriveCoordinatorDashboardPhase,
  deriveStaffCoverage,
} from "./coordinatorSetupProgress.js";

test("Coach readiness uses authoritative assignment-target coverage", () => {
  assert.deepEqual(deriveStaffCoverage({
    people_assigned: 108,
    target_assigned: 132,
    target_total: 132,
    missing: 0,
    conflicts: 0,
    inactive: 0,
  }, "coaches"), {
    assigned: 132,
    required: 132,
    missing: 0,
    conflicts: 0,
    inactive: 0,
    ready: true,
  });
});

test("Coach coverage remains incomplete while event assignments are missing", () => {
  const coverage = deriveStaffCoverage({
    people_assigned: 58,
    target_assigned: 64,
    target_total: 132,
    missing: 68,
  }, "coaches");
  assert.equal(coverage.assigned, 64);
  assert.equal(coverage.required, 132);
  assert.equal(coverage.missing, 68);
  assert.equal(coverage.ready, false);
});

test("registration records complete Teams and Entries without a coordinator team KPI", () => {
  const result = deriveCompetitionSetupProgress({
    registrationProgress: { totalTargets: 4, submittedTargets: 3, approvedTargets: 2 },
    registrationSummary: { teamTotal: 1, entryTotal: 2 },
  });

  assert.equal(result.registrationRecords, 3);
  assert.equal(result.teamsAndEntriesComplete, true);
});

test("generated brackets confirm participant submission and facilitator review stages", () => {
  const result = deriveCompetitionSetupProgress({
    registrationProgress: {},
    registrationSummary: {},
    bracketCount: 2,
  });

  assert.equal(result.teamsAndEntriesComplete, true);
  assert.equal(result.facilitatorReviewComplete, true);
  assert.equal(result.bracketStageComplete, true);
});

test("scheduled matches preserve completed prerequisite stages when bracket data is unavailable", () => {
  const result = deriveCompetitionSetupProgress({
    registrationProgress: {},
    registrationSummary: {},
    bracketCount: 0,
    scheduleCount: 6,
  });

  assert.equal(result.teamsAndEntriesComplete, true);
  assert.equal(result.facilitatorReviewComplete, true);
  assert.equal(result.bracketStageComplete, true);
});

test("setup remains incomplete when there are no submissions or downstream evidence", () => {
  const result = deriveCompetitionSetupProgress({
    registrationProgress: { totalTargets: 4, submittedTargets: 0, approvedTargets: 0 },
    registrationSummary: { teamTotal: 0, entryTotal: 0 },
  });

  assert.equal(result.teamsAndEntriesComplete, false);
  assert.equal(result.facilitatorReviewComplete, false);
  assert.equal(result.bracketStageComplete, false);
});

test("coordinator dashboard moves from registration monitoring to live operations after scheduling", () => {
  const competitionProgress = deriveCompetitionSetupProgress({
    bracketCount: 2,
    scheduleCount: 8,
  });

  assert.equal(
    deriveCoordinatorDashboardPhase({
      staffAssignmentComplete: true,
      competitionProgress,
      scheduleCount: 8,
      completedMatchCount: 2,
    }),
    COORDINATOR_DASHBOARD_PHASE.LIVE_RESULTS
  );
});

test("team registration remains the focus while no submissions exist", () => {
  const competitionProgress = deriveCompetitionSetupProgress({
    registrationProgress: { totalTargets: 4 },
  });

  assert.equal(
    deriveCoordinatorDashboardPhase({
      staffAssignmentComplete: true,
      competitionProgress,
    }),
    COORDINATOR_DASHBOARD_PHASE.TEAM_REGISTRATION
  );
});

test("all completed scheduled matches move the coordinator dashboard to completed results", () => {
  const competitionProgress = deriveCompetitionSetupProgress({
    bracketCount: 1,
    scheduleCount: 3,
  });

  assert.equal(
    deriveCoordinatorDashboardPhase({
      staffAssignmentComplete: true,
      competitionProgress,
      scheduleCount: 3,
      completedMatchCount: 3,
    }),
    COORDINATOR_DASHBOARD_PHASE.COMPLETED
  );
});
