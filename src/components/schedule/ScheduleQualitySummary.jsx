import React from "react";
import PropTypes from "prop-types";
import { ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { formatSeconds, resolveScheduleQualityData } from "./scheduleQualityUtils";

export { formatSeconds, resolveScheduleQualityData };

/**
 * Compact institutional schedule quality presentation component.
 * Displays authoritative backend thesis metrics without fabricating metrics in React.
 */
export default function ScheduleQualitySummary({
  generationResult = null,
  validationResult = null,
  eventsCount = 0,
  onOpenValidationDetails = null,
}) {
  const data = resolveScheduleQualityData({
    generationResult,
    validationResult,
    eventsCount,
  });

  const {
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
  } = data;

  const formattedSolver = formatSeconds(solverSeconds);
  const formattedPipeline = formatSeconds(pipelineSeconds);

  let timingText = null;
  if (formattedPipeline && formattedSolver) {
    timingText = `Generated in ${formattedPipeline} · Solver ${formattedSolver}`;
  } else if (formattedSolver) {
    timingText = `Solver ${formattedSolver}`;
  } else if (formattedPipeline) {
    timingText = `Pipeline ${formattedPipeline}`;
  }

  return (
    <section
      aria-label="Schedule Quality Summary"
      className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm dark:border-slate-800/90 dark:bg-[var(--surface)] text-slate-900 dark:text-slate-100"
    >
      <div className="flex flex-col gap-2.5">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800/70">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Schedule Quality
            </h2>
            {isAvailable && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 size={11} />
                Verified
              </span>
            )}
            {isUnavailable && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertCircle size={11} />
                Evaluation unavailable
              </span>
            )}
          </div>
          {onOpenValidationDetails && (
            <button
              type="button"
              onClick={onOpenValidationDetails}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <span>View validation details</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>

        {/* 3 Metric Columns in a single compact row */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4 text-xs">
          {/* Column 1: Scheduled Matches */}
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {totalRequired > 0
                ? `${scheduledCount} / ${totalRequired} scheduled`
                : `${scheduledCount} scheduled`}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {typeof successRate === "number"
                ? `Scheduling Success: ${successRate}%`
                : "Match placement status"}
            </span>
          </div>

          {/* Column 2: Constraint Satisfaction */}
          <div className="flex flex-col">
            {isAvailable && typeof totalConstraints === "number" ? (
              <>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {satisfiedConstraints} / {totalConstraints} constraints satisfied
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Constraint Satisfaction: {csr}%
                </span>
              </>
            ) : isUnavailable ? (
              <>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  Evaluation metrics unavailable
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Harness execution skipped
                </span>
              </>
            ) : (
              <>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  Constraints pending
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Run generation to evaluate CSR
                </span>
              </>
            )}
          </div>

          {/* Column 3: Hard Violations */}
          <div className="flex flex-col">
            <span
              className={`font-semibold ${
                hardViolations === 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {hardViolations === 0
                ? "No violations"
                : `${hardViolations} hard violation${hardViolations === 1 ? "" : "s"}`}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {hardViolations === 0
                ? "Zero blocking conflicts"
                : "Requires resolution"}
            </span>
          </div>
        </div>

        {/* Footer timing line */}
        {timingText && (
          <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-800/70 dark:text-slate-400">
            {timingText}
          </div>
        )}
      </div>
    </section>
  );
}

ScheduleQualitySummary.propTypes = {
  generationResult: PropTypes.object,
  validationResult: PropTypes.object,
  eventsCount: PropTypes.number,
  onOpenValidationDetails: PropTypes.func,
};
