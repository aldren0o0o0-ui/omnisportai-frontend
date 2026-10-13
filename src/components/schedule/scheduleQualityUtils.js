/**
 * Schedule Quality Utility functions.
 * Pure logic module for resolving authoritative backend thesis metrics
 * and timing values without React dependencies.
 */

/**
 * Safely format floating seconds to a human-readable string (e.g. "0.07 s").
 * Returns null if seconds is not a valid non-negative number.
 */
export function formatSeconds(seconds) {
  if (typeof seconds !== "number" || Number.isNaN(seconds) || seconds < 0) {
    return null;
  }
  if (seconds < 0.01) {
    return "< 0.01 s";
  }
  return `${seconds.toFixed(2)} s`;
}

/**
 * Normalizes backend generation and validation results into authoritative
 * schedule quality metrics without frontend calculation or metric fabrication.
 */
export function resolveScheduleQualityData({
  generationResult = null,
  validationResult = null,
  eventsCount = 0,
} = {}) {
  const evalPayload = generationResult?.evaluation || null;
  const timing = generationResult?.timing || null;
  const evalStatus = evalPayload?.status || (evalPayload ? "AVAILABLE" : "NOT_RUN");

  const isAvailable = evalStatus === "AVAILABLE";
  const isUnavailable = evalStatus === "UNAVAILABLE";

  const scheduledCount =
    typeof evalPayload?.scheduled_matches === "number"
      ? evalPayload.scheduled_matches
      : typeof generationResult?.scheduled_count === "number"
        ? generationResult.scheduled_count
        : eventsCount;

  const realUnscheduledCount = (generationResult?.unscheduled_matches || []).filter(
    (m) => !m?.is_placeholder
  ).length;

  const totalRequired =
    typeof evalPayload?.required_matches === "number"
      ? evalPayload.required_matches
      : typeof generationResult?.scheduled_count === "number"
        ? generationResult.scheduled_count + realUnscheduledCount
        : eventsCount;

  const successRate =
    typeof evalPayload?.scheduling_success_rate === "number"
      ? evalPayload.scheduling_success_rate
      : null;

  const totalConstraints =
    typeof evalPayload?.total_evaluated_constraints === "number"
      ? evalPayload.total_evaluated_constraints
      : null;

  const satisfiedConstraints =
    typeof evalPayload?.satisfied_constraints === "number"
      ? evalPayload.satisfied_constraints
      : null;

  const csr =
    typeof evalPayload?.constraint_satisfaction_rate === "number"
      ? evalPayload.constraint_satisfaction_rate
      : null;

  const hardViolations =
    typeof evalPayload?.hard_constraint_violations === "number"
      ? evalPayload.hard_constraint_violations
      : typeof validationResult?.blocking_count === "number"
        ? validationResult.blocking_count
        : typeof generationResult?.blocking_count === "number"
          ? generationResult.blocking_count
          : 0;

  const solverSeconds =
    typeof timing?.solver_time_seconds === "number"
      ? timing.solver_time_seconds
      : null;
  const pipelineSeconds =
    typeof timing?.pipeline_time_seconds === "number"
      ? timing.pipeline_time_seconds
      : null;

  return {
    evalStatus,
    isAvailable,
    isUnavailable,
    scheduledCount,
    totalRequired,
    successRate,
    totalConstraints,
    satisfiedConstraints,
    csr,
    hardViolations,
    solverSeconds,
    pipelineSeconds,
  };
}
