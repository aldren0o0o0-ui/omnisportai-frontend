export const correctionStatusPresentation = (status) => {
  const key = String(status || "").trim().toUpperCase();
  return ({
    DRAFT: { label: "Draft", tone: "neutral", description: "Correction details are being prepared." },
    SUBMITTED: { label: "Waiting for review", tone: "warning", description: "A Sports Coordinator must review this request." },
    APPROVED: { label: "Approved", tone: "info", description: "The correction is approved and ready to apply." },
    APPLIED: { label: "Applied", tone: "success", description: "The corrected result is now official." },
    REJECTED: { label: "Rejected", tone: "danger", description: "The correction was not approved." },
    FAILED: { label: "Blocked", tone: "danger", description: "No official data changed." },
  })[key] || { label: "Unknown", tone: "neutral", description: "Status is unavailable." };
};

export const defaultCorrectionType = (sportName) => {
  const sport = String(sportName || "").trim().toUpperCase();
  if (sport.includes("ATHLET") || sport.includes("SWIMM")) return "OFFICIAL_TIME_CORRECTION";
  if (sport.includes("BOX")) return "JUDGE_SCORECARD_CORRECTION";
  if (sport.includes("ARCHERY")) return "ARCHERY_RESULT_CORRECTION";
  if (sport.includes("BASEBALL")) return "BASEBALL_RESULT_CORRECTION";
  if (sport.includes("CHESS")) return "CHESS_RESULT_CORRECTION";
  return "SCORE_CORRECTION";
};

export const correctionErrorMessage = (error, fallback = "The correction could not be completed.") => {
  const detail = error?.response?.data?.detail;
  const code = String(detail?.code || "").toUpperCase();
  const messages = {
    CORRECTION_REASON_REQUIRED: "Explain why the official result needs to be corrected.",
    SELF_APPROVAL_NOT_ALLOWED: "A different Sports Coordinator must review this correction.",
    CORRECTION_STATE_STALE: "The Match or correction changed. Refresh and review the latest result.",
    DOWNSTREAM_MATCH_ALREADY_STARTED: "A later bracket Match has already started. Manual tournament repair is required.",
    DOWNSTREAM_MATCH_ALREADY_COMPLETED: "A later bracket Match is already complete. Automatic correction is blocked.",
    INVALID_CORRECTED_RESULT: "Review the corrected result. It does not match the approved Sport rules.",
    CORRECTION_NOT_ALLOWED: "You do not have permission to perform this correction action.",
  };
  return messages[code] || detail?.message || (typeof detail === "string" ? detail : fallback);
};

export const summarizeCorrectionImpact = (impact) => {
  const result = [];
  if ((impact?.result_changes || []).length) result.push("The official Match result will change.");
  if ((impact?.affected_downstream_matches || []).length) {
    result.push(`${impact.affected_downstream_matches.length} downstream bracket Match${impact.affected_downstream_matches.length === 1 ? "" : "es"} will be reviewed.`);
  }
  if (impact?.standings_affected) result.push("Standings and rankings will be recalculated.");
  if (impact?.statistics_affected) result.push("Official statistics will be refreshed.");
  if (impact?.notifications_affected) result.push("The previous final notification will be superseded.");
  return result;
};

export const canShowCorrectionMutation = ({ completed, capability }) => Boolean(completed && capability === true);

