import { useId, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, ExternalLink, Sparkles, Wrench } from "lucide-react";

import {
  buildIssueSeverityBadgeTone,
  getIssueAffectedGroups,
  getIssueManualNextSteps,
  getIssueTechnicalDetails,
  getRecommendationActionLabel,
  getRecommendationTrustLabel,
  getRecommendationTrustTone,
  normalizeScheduleIssue,
} from "./scheduleHelpers";

const SECTION_TONE = {
  blocking: "border-rose-200 bg-rose-50/50 dark:border-rose-500/30 dark:bg-rose-500/10",
  warning: "border-amber-200 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/10",
  info: "border-blue-200 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-500/10",
  slate: "border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60",
};

const CountCard = ({ label, value, tone = "slate" }) => (
  <article className={`rounded-2xl border px-3 py-2 text-xs ${SECTION_TONE[tone] || SECTION_TONE.slate}`}>
    <p className="font-semibold uppercase tracking-wide">{label}</p>
    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{value}</p>
  </article>
);

const DrawerSection = ({ title, description, items = [], emptyText = "No issues in this section.", tone = "slate", anchorKey = "", renderItem }) => (
  <section data-issue-section={anchorKey || undefined} className={`rounded-3xl border p-4 ${SECTION_TONE[tone] || SECTION_TONE.slate}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {description ? <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{description}</p> : null}
      </div>
      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-[var(--surface)]/70 dark:text-slate-300">
        {items.length}
      </span>
    </div>
    {items.length === 0 ? (
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
    ) : (
      <div className="mt-4 space-y-4">
        {items.map((item) => renderItem(item))}
      </div>
    )}
  </section>
);

const SafeFixCard = ({ option, canApply, actionLoading, onApply, onFocusMatch }) => {
  const trustLabel = getRecommendationTrustLabel(option);
  const trustTone = getRecommendationTrustTone(option);
  return (
    <article className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
          Safe Quick Fix
        </span>
        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${trustTone}`}>{trustLabel}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{option.title}</p>
      <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{option.description}</p>
      {option.meta ? <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{option.meta}</p> : null}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={!canApply || actionLoading}
          onClick={() => onApply(option)}
          className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:bg-cyan-600 dark:hover:bg-cyan-700"
        >
          <Sparkles size={13} />
          {actionLoading ? "Applying fix..." : getRecommendationActionLabel(option.raw)}
        </button>
        {typeof onFocusMatch === "function" ? (
          <button
            type="button"
            onClick={onFocusMatch}
            className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowRight size={13} />
            Find on Calendar
          </button>
        ) : null}
      </div>
    </article>
  );
};

const IssueDetailPanel = ({
  item,
  actionLoading = false,
  onApplyRecommendation = null,
  onNavigateAction = null,
  onFocusMatch = null,
}) => {
  const technicalDetailsId = useId();
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const normalized = normalizeScheduleIssue(item.issue);
  const issue = {
    ...normalized,
    ...item.issue,
    matchSummary: item.matchSummary || null,
    affectedCount: item.affectedCount ?? normalized.affectedCount,
  };
  const severityTone = buildIssueSeverityBadgeTone(issue.severity);
  const affectedGroups = getIssueAffectedGroups(issue, {
    matchSummary: item.matchSummary,
    affectedMatches: item.affectedMatches,
  });
  const manualSteps = item.manualSteps?.length > 0 ? item.manualSteps : getIssueManualNextSteps(issue);
  const technical = getIssueTechnicalDetails(issue);
  const safeQuickFixes = Array.isArray(item.safeQuickFixes) ? item.safeQuickFixes : [];
  const manualFixOptions = Array.isArray(item.manualFixOptions) ? item.manualFixOptions : [];
  const quickActions = Array.isArray(item.quickActions) ? item.quickActions : [];
  const whyHighlights = Array.isArray(item.whyHighlights) ? item.whyHighlights.filter(Boolean) : [];
  const hasCalendarFocus = Number(item.matchId) > 0 && typeof onFocusMatch === "function";

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-[var(--surface)]/95">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="break-words text-base font-semibold text-slate-900 dark:text-slate-100">{issue.title}</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${severityTone}`}>
              {issue.severity}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300">
              {issue.categoryLabel}
            </span>
            {issue.affectedCount > 0 ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300">
                {issue.affectedCount} affected item{issue.affectedCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        </div>
        {hasCalendarFocus ? (
          <button
            type="button"
            onClick={() => onFocusMatch(item.matchId)}
            className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ExternalLink size={13} />
            Find on Calendar
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <section className="order-1 rounded-2xl bg-slate-50/80 px-4 py-3 dark:bg-[var(--surface-soft)]/70">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Plain-language summary
          </p>
          <p className="mt-2 break-words text-sm text-slate-800 dark:text-slate-200">{issue.explanation}</p>
        </section>

        <section className="order-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Why this happened
          </p>
          <div className="mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-[var(--surface)] dark:text-slate-300">
            <p className="break-words">{issue.whyItHappened}</p>
            {whyHighlights.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-400">
                {whyHighlights.map((line) => (
                  <li key={`${issue.issueKey}-why-${line}`} className="break-words">{line}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        <section className="order-6 md:order-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Affected items
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {affectedGroups.map((group) => (
              <article key={`${issue.issueKey}-${group.label}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-[var(--surface-soft)]/70">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{group.label}</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  {group.entries.map((entry) => (
                    <li key={`${issue.issueKey}-${group.label}-${entry}`} className="break-words">{entry}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="order-3 rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3 dark:border-blue-500/30 dark:bg-blue-500/10">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Recommended fix
          </p>
          <p className="mt-2 break-words text-sm text-blue-900 dark:text-blue-100">{issue.recommendedFix}</p>
        </section>

        <section className="order-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Available fix options
          </p>
          <div className="mt-2 space-y-3">
            {safeQuickFixes.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-300" />
                  Safe quick fixes
                </div>
                {safeQuickFixes.map((option) => (
                  <SafeFixCard
                    key={option.key}
                    option={option}
                    canApply={option.canApply}
                    actionLoading={actionLoading}
                    onApply={onApplyRecommendation}
                    onFocusMatch={hasCalendarFocus ? () => onFocusMatch(item.matchId) : null}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-[var(--surface-soft)]/70 dark:text-slate-300">
                No automatic fix is available for this issue. Use the recommended manual steps below.
              </div>
            )}

            {(manualFixOptions.length > 0 || quickActions.length > 0) ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Wrench size={16} className="text-amber-600 dark:text-amber-300" />
                  Manual fix guidance
                </div>
                {manualFixOptions.length > 0 ? (
                  <div className="space-y-2">
                    {manualFixOptions.map((option) => (
                      <article key={option.key} className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{option.title}</p>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${option.trustTone}`}>
                            {option.trustLabel}
                          </span>
                        </div>
                        <p className="mt-1 break-words text-xs text-amber-900/90 dark:text-amber-100/90">{option.description}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
                {quickActions.length > 0 ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {quickActions.map((action) => (
                      <button
                        key={`${issue.issueKey}-${action.label}-${action.route || "inline"}`}
                        type="button"
                        onClick={() => onNavigateAction(action)}
                        className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <ArrowRight size={13} />
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="order-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Manual next steps
          </p>
          <ol className="mt-2 list-decimal space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-6 py-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-[var(--surface-soft)]/70 dark:text-slate-300">
            {manualSteps.map((step) => (
              <li key={`${issue.issueKey}-step-${step}`} className="break-words">{step}</li>
            ))}
          </ol>
        </section>

        <section className="order-7 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm dark:border-slate-800 dark:bg-[var(--surface-soft)]/70">
          <button
            type="button"
            onClick={() => setTechnicalOpen((current) => !current)}
            aria-expanded={technicalOpen}
            aria-controls={technicalDetailsId}
            className="flex w-full items-center justify-between gap-3 text-left font-semibold text-slate-800 dark:text-slate-200"
          >
            <span>Technical details</span>
            <ChevronDown size={16} className={`shrink-0 transition-transform ${technicalOpen ? "rotate-180" : ""}`} />
          </button>
          <div
            id={technicalDetailsId}
            hidden={!technicalOpen}
            className="mt-3 space-y-3"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {technical.summaryRows.map((row) => (
                <div key={`${issue.issueKey}-tech-${row.label}`} className="min-w-0 rounded-xl bg-white px-3 py-2 text-xs dark:bg-[var(--surface)]">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{row.label}</p>
                  <p className="mt-1 break-words text-slate-600 dark:text-slate-300">{row.value}</p>
                </div>
              ))}
            </div>
            {technical.evidenceRows.length > 0 ? (
              <div className="min-w-0 rounded-2xl bg-white px-4 py-3 dark:bg-[var(--surface)]">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Evidence summary
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {technical.evidenceRows.map((row) => (
                    <div key={`${issue.issueKey}-evidence-${row.label}`} className="min-w-0 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{row.label}:</span>{" "}
                      <span className="break-words">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </article>
  );
};

const ScheduleIssueDrawer = ({
  counts = {},
  sections = [],
  actionLoading = false,
  footerActions = [],
  onApplyRecommendation = null,
  onNavigateAction = null,
  onFocusMatch = null,
  helperId = "",
}) => (
  <div className="flex min-h-full flex-col">
    <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <CountCard label="Critical" value={counts.blocking ?? 0} tone="blocking" />
      <CountCard label="Alerts" value={counts.warnings ?? 0} tone="warning" />
      <CountCard label="To Schedule" value={counts.unscheduled ?? 0} tone="blocking" />
    </section>

    <details id={helperId || undefined} className="group rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-[var(--surface)]/95">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 dark:text-slate-100">
        How to use this panel
      </summary>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl bg-slate-50/80 px-4 py-3 dark:bg-[var(--surface-soft)]/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Issues</p>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Each issue starts with a plain-language summary.</p>
        </article>
        <article className="rounded-2xl bg-slate-50/80 px-4 py-3 dark:bg-[var(--surface-soft)]/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Fixes</p>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Safe fixes are separated from manual setup actions.</p>
        </article>
        <article className="rounded-2xl bg-slate-50/80 px-4 py-3 dark:bg-[var(--surface-soft)]/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Details</p>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Diagnostics stay collapsed until you need them.</p>
        </article>
      </div>
    </details>

    {sections.map((section) => (
      <DrawerSection
        key={section.key}
        title={section.title}
        description={section.description}
        items={section.items}
        emptyText={section.emptyText}
        tone={section.tone}
        anchorKey={section.anchorKey}
        renderItem={(item) => (
          <IssueDetailPanel
            key={item.key}
            item={item}
            actionLoading={actionLoading}
            onApplyRecommendation={onApplyRecommendation}
            onNavigateAction={onNavigateAction}
            onFocusMatch={onFocusMatch}
          />
        )}
      />
    ))}
    </div>
    {footerActions.length > 0 ? (
      <div className="sticky bottom-0 mt-auto border-t border-slate-200 bg-[var(--surface)]/95 px-4 py-4 backdrop-blur sm:px-5 dark:border-slate-700">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {footerActions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={`w-full rounded-lg px-3 py-2 text-xs font-semibold sm:w-auto ${action.primary
              ? "border border-blue-400 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 dark:border-cyan-400 dark:bg-cyan-600 dark:hover:bg-cyan-700"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
          >
            {action.label}
          </button>
        ))}
        </div>
      </div>
    ) : null}
  </div>
);

export default ScheduleIssueDrawer;
