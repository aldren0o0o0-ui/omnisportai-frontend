const toCount = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const COORDINATOR_DASHBOARD_PHASE = Object.freeze({
  ASSIGNMENTS: "ASSIGNMENTS",
  TEAM_REGISTRATION: "TEAM_REGISTRATION",
  FACILITATOR_REVIEW: "FACILITATOR_REVIEW",
  BRACKETS: "BRACKETS",
  SCHEDULING: "SCHEDULING",
  LIVE_RESULTS: "LIVE_RESULTS",
  COMPLETED: "COMPLETED",
});

export const deriveStaffCoverage = (metric = {}, kind = "staff") => {
  const isCoach = kind === "coaches";
  const total = toCount(isCoach ? metric?.target_total ?? metric?.total : metric?.total);
  const notRequired = toCount(metric?.not_required);
  const required = Math.max(0, total - notRequired);
  const assigned = Math.min(
    required,
    toCount(isCoach ? metric?.target_assigned ?? metric?.assigned : metric?.assigned)
  );
  const missing = Math.max(0, Number(metric?.missing ?? required - assigned) || 0);
  const conflicts = toCount(metric?.conflicts);
  const inactive = toCount(metric?.inactive);
  return {
    assigned,
    required,
    missing,
    conflicts,
    inactive,
    ready: required > 0 && assigned >= required && missing === 0 && conflicts === 0 && inactive === 0,
  };
};

export const deriveCompetitionSetupProgress = ({
  registrationProgress,
  registrationSummary,
  bracketCount,
  scheduleCount,
} = {}) => {
  const totalTargets = toCount(registrationProgress?.totalTargets);
  const submittedTargets = toCount(registrationProgress?.submittedTargets);
  const approvedTargets = toCount(registrationProgress?.approvedTargets);
  const teamSubmissions = toCount(registrationSummary?.teamTotal);
  const entrySubmissions = toCount(registrationSummary?.entryTotal);
  const registrationRecords = teamSubmissions + entrySubmissions;
  const generatedBrackets = toCount(bracketCount);
  const scheduledMatches = toCount(scheduleCount);

  // Brackets can only be generated from approved participants, and schedules can
  // only be generated from brackets. Preserve that monotonic workflow even if a
  // supporting dashboard request is temporarily unavailable.
  const bracketStageComplete = generatedBrackets > 0 || scheduledMatches > 0;
  const allTargetsApproved = totalTargets > 0 && approvedTargets >= totalTargets;
  const teamsAndEntriesComplete =
    submittedTargets > 0 ||
    registrationRecords > 0 ||
    bracketStageComplete;
  const facilitatorReviewComplete =
    allTargetsApproved ||
    bracketStageComplete;

  return {
    totalTargets,
    submittedTargets,
    approvedTargets,
    registrationRecords,
    bracketStageComplete,
    teamsAndEntriesComplete,
    facilitatorReviewComplete,
  };
};

export const deriveCoordinatorDashboardPhase = ({
  staffAssignmentComplete,
  competitionProgress,
  scheduleCount,
  completedMatchCount,
} = {}) => {
  if (!staffAssignmentComplete) {
    return COORDINATOR_DASHBOARD_PHASE.ASSIGNMENTS;
  }
  if (!competitionProgress?.teamsAndEntriesComplete) {
    return COORDINATOR_DASHBOARD_PHASE.TEAM_REGISTRATION;
  }
  if (!competitionProgress?.facilitatorReviewComplete) {
    return COORDINATOR_DASHBOARD_PHASE.FACILITATOR_REVIEW;
  }
  if (!competitionProgress?.bracketStageComplete) {
    return COORDINATOR_DASHBOARD_PHASE.BRACKETS;
  }

  const scheduledMatches = toCount(scheduleCount);
  if (scheduledMatches === 0) {
    return COORDINATOR_DASHBOARD_PHASE.SCHEDULING;
  }

  const completedMatches = toCount(completedMatchCount);
  if (completedMatches >= scheduledMatches) {
    return COORDINATOR_DASHBOARD_PHASE.COMPLETED;
  }
  return COORDINATOR_DASHBOARD_PHASE.LIVE_RESULTS;
};
