import { Bot, RefreshCcw, ShieldAlert, ShieldCheck } from "lucide-react";

import ScheduleIssueCard from "./ScheduleIssueCard";

const STATUS_TONE = {
  NOT_RUN: "border-blue-200 bg-blue-50/70 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200",
  ESTIMATED_ONLY: "border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  WARNING: "border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  BLOCKED: "border-rose-200 bg-rose-50/80 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
  EXACT_FAILED: "border-rose-200 bg-rose-50/80 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
  READY: "border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  EXACT_PASSED: "border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
};

const MetricCard = ({ label, value, helper }) => (
  <article className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-[var(--surface-soft)]/70">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{value}</p>
    {helper ? <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{helper}</p> : null}
  </article>
);

const AiPreflightResultsPanel = ({
  hasTournamentSelected = false,
  hasPreflightResult = false,
  isRunning = false,
  readinessScore = null,
  statusLabel = "Not Checked",
  state = "NOT_RUN",
  summaryMessage = "",
  exactStatus = "NOT_RUN",
  confidenceLabel = "ESTIMATED",
  lastCheckedLabel = "Not checked yet",
  stale = false,
  counts = {},
  topIssues = [],
  realUnscheduledCount = 0,
  onRunAgain = null,
  onOpenIssue = null,
  onOpenIssueDrawer = null,
  onApplyRecommendation = null,
  onPreviewRecommendation = null,
  onNavigateToFix = null,
  children = null,
}) => {
  const tone = STATUS_TONE[state] || STATUS_TONE.NOT_RUN;

  return (
    <aside className="space-y-4 xl:sticky xl:top-20">
      <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-[var(--surface)]/95">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300">
              <Bot size={13} />
              AI Preflight Results
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Before generation</p>
          </div>
          {typeof onRunAgain === "function" ? (
            <button
              type="button"
              onClick={onRunAgain}
              disabled={isRunning || !hasTournamentSelected}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCcw size={13} className={isRunning ? "animate-spin" : ""} />
              {isRunning ? "Checking..." : hasPreflightResult ? "Run Again" : "Run Preflight"}
            </button>
          ) : null}
        </div>

        {!hasTournamentSelected ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            Select a tournament to inspect scheduling readiness.
          </div>
        ) : !hasPreflightResult ? (
          <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-5 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
            <p className="font-semibold">AI Preflight has not been run yet.</p>
            <p className="mt-1 text-blue-700 dark:text-blue-300">
              Run a check to find setup issues before generating the schedule.
            </p>
          </div>
        ) : (
          <>
            <div className={`mt-4 rounded-2xl border px-4 py-3 ${tone}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{statusLabel}</p>
                  <p className="mt-1 text-xs opacity-90">{summaryMessage}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-current/15 bg-white/70 px-2 py-1 text-[11px] font-semibold dark:bg-[var(--surface)]/50">
                  {state === "READY" || state === "EXACT_PASSED" ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                  {readinessScore ?? statusLabel}
                  {readinessScore !== null ? "% Ready" : ""}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-current/10 bg-white/70 px-2 py-1 dark:bg-[var(--surface)]/50">
                  Exact check: {exactStatus}
                </span>
                <span className="rounded-full border border-current/10 bg-white/70 px-2 py-1 dark:bg-[var(--surface)]/50">
                  Confidence: {confidenceLabel}
                </span>
                <span className="rounded-full border border-current/10 bg-white/70 px-2 py-1 dark:bg-[var(--surface)]/50">
                  Last checked: {lastCheckedLabel}
                </span>
                {stale ? (
                  <span className="rounded-full border border-current/10 bg-white/70 px-2 py-1 dark:bg-[var(--surface)]/50">
                    Results may be outdated
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <MetricCard label="Blocking" value={counts.blocking ?? 0} />
              <MetricCard label="Warnings" value={counts.warnings ?? 0} />
              <MetricCard label="Info" value={counts.info ?? 0} />
              <MetricCard label="Real Unscheduled" value={realUnscheduledCount} helper="Not placed yet" />
            </div>
          </>
        )}

        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Top issues</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Why conflicts happened</p>
            </div>
            {typeof onOpenIssueDrawer === "function" ? (
              <button
                type="button"
                onClick={onOpenIssueDrawer}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Open drawer
              </button>
            ) : null}
          </div>
          {topIssues.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {hasPreflightResult ? "No blocking issues found." : "Run AI Preflight to load issue explanations."}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {topIssues.slice(0, 5).map((issue) => (
                <ScheduleIssueCard
                  key={issue.issueKey}
                  issue={issue}
                  compact
                  onViewDetails={onOpenIssue}
                  onApplyRecommendation={onApplyRecommendation}
                  onPreviewRecommendation={onPreviewRecommendation}
                  onNavigateToFix={onNavigateToFix}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {children}
    </aside>
  );
};

export default AiPreflightResultsPanel;
