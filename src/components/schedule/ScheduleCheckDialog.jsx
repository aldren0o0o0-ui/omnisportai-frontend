import { AlertTriangle, CheckCircle2, LoaderCircle, ShieldAlert } from "lucide-react";
import AppModal from "../common/AppModal";

const toneByMode = {
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  blocked: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  error: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  system_error: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  solver_failure: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

const ScheduleCheckDialog = ({
  open,
  mode,
  issues = [],
  onClose,
  onContinue,
  onResolution,
  busy = false,
  continueLabel,
}) => {
  const isChecking = mode === "checking";
  const isGenerating = mode === "generating";
  const isWarning = mode === "warning";
  const isBlocked = mode === "blocked";
  const isSystemError = mode === "system_error";
  const isSolverFailure = mode === "solver_failure";
  const isReady = mode === "ready";
  const isConfigureReady = mode === "configure_ready";
  const count = issues.length;
  const title = isChecking
    ? "Checking schedule readiness…"
    : isGenerating
      ? "Generating the schedule…"
      : isWarning
        ? "Review before generating"
        : isBlocked
          ? "Schedule setup needs attention"
          : isSolverFailure
            ? "Some matches could not be scheduled"
            : isSystemError
              ? "We couldn't generate the schedule"
              : isReady
                ? "Ready to generate"
                : isConfigureReady
                  ? "Schedule setup is ready"
              : "The schedule could not be generated";

  return (
    <AppModal
      open={open}
      onClose={busy ? undefined : onClose}
      title={title}
      subtitle={
        isWarning
          ? `${count} item${count === 1 ? "" : "s"} may need attention. You can still continue.`
          : isBlocked
            ? "Fix the items below, then return here and select Generate Schedule again."
            : isSolverFailure
              ? "There is not enough suitable time or venue space for every match."
              : isSystemError
                ? "Please try again. If this keeps happening, contact an administrator."
            : ""
      }
      maxWidthClass="max-w-xl"
    >
      {isChecking || isGenerating ? (
        <div className="flex min-h-36 flex-col items-center justify-center text-center" aria-live="assertive">
          <LoaderCircle className="animate-spin text-blue-600 dark:text-cyan-400" size={28} aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {isChecking ? "Reviewing brackets, venues, dates, and match details." : "Choosing dates, times, and venues for each match."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue, index) => (
            <article key={`${issue.code}-${index}`} className="rounded-xl bg-slate-50 p-4 dark:bg-[var(--surface-soft)]">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 inline-flex rounded-full p-1.5 ${toneByMode[mode] || toneByMode.error}`}>
                  {isWarning ? <AlertTriangle size={15} /> : <ShieldAlert size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{issue.title}</h3>
                  {issue.whyExplanation ? (
                    <details className="group mt-2 max-w-full text-sm">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-semibold text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-cyan-300 [&::-webkit-details-marker]:hidden">
                        <span>Why?</span>
                        <span className="text-xs transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
                      </summary>
                      <p className="mt-2 break-words rounded-lg border border-slate-200 bg-white/60 p-3 leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
                        {issue.whyExplanation}
                      </p>
                    </details>
                  ) : null}
                  {issue.recommendedAction ? (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">What to do: </span>
                      {issue.recommendedAction}
                    </p>
                  ) : null}
                  {issue.actionLabel && issue.destination && onResolution ? (
                    <button
                      type="button"
                      onClick={() => onResolution(issue)}
                      className="mt-3 text-sm font-semibold text-blue-700 hover:underline dark:text-cyan-300"
                    >
                      {issue.actionLabel}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
          {(mode === "error" || isSystemError) && issues.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300">
              We couldn't create the schedule right now. Please close this message and try again. If it keeps happening, contact an administrator and tell them which tournament you selected.
            </div>
          ) : null}
        </div>
      )}

      {!isChecking && !isGenerating ? (
        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
          {(isBlocked || isSolverFailure) && issues.length > 0 ? (
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              After making the change, return to Schedules and select <span className="font-semibold">Generate Schedule</span> again. If another item needs attention, this guide will show the next place to fix.
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {isWarning || isReady || isConfigureReady ? "Cancel" : "Close"}
          </button>
          {isWarning || isReady || isConfigureReady ? (
            <button
              type="button"
              onClick={onContinue}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60 dark:bg-cyan-600 dark:hover:bg-cyan-500"
            >
              <CheckCircle2 size={15} />
              {continueLabel || (isReady ? "Generate Schedule" : isConfigureReady ? "Continue" : "Continue and Generate")}
            </button>
          ) : null}
          </div>
        </div>
      ) : null}
    </AppModal>
  );
};

export default ScheduleCheckDialog;
