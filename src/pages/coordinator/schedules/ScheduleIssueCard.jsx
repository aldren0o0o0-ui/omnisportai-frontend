import { ArrowRight, ExternalLink, Sparkles, Wrench } from "lucide-react";

import {
  buildIssueSeverityBadgeTone,
  getRecommendationTrustLabel,
  getRecommendationTrustTone,
  normalizeScheduleIssue,
} from "./scheduleHelpers";
import { formatSeverityLabel } from "../../../components/common/statusLabels";

const ScheduleIssueCard = ({
  issue,
  compact = false,
  onViewDetails = null,
  onApplyRecommendation = null,
  onPreviewRecommendation = null,
  onNavigateToFix = null,
}) => {
  const normalized = normalizeScheduleIssue(issue);
  const enriched = {
    ...normalized,
    ...issue,
    affectedItems: Array.isArray(issue?.affectedItems) ? issue.affectedItems : normalized.affectedItems,
    quickActions: Array.isArray(issue?.quickActions) ? issue.quickActions : normalized.quickActions,
  };

  const severityTone = buildIssueSeverityBadgeTone(enriched.severity);
  const quickAction = enriched.quickActions?.[0] || null;
  const recommendationOption = enriched.recommendedOption || null;
  const previewOption = enriched.previewOption || enriched.resolutionOptions?.[0] || null;
  const affectedItems = Array.isArray(enriched.affectedItems) ? enriched.affectedItems : [];
  const trustLabel = previewOption ? getRecommendationTrustLabel(previewOption) : "";
  const trustTone = previewOption ? getRecommendationTrustTone(previewOption) : "";
  const matchLabel = enriched.matchSummary?.primaryLabel || "";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-[var(--surface)]">
      <div className="flex flex-wrap items-start gap-2">
        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${severityTone}`}>
          {formatSeverityLabel(enriched.severity)}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300">
          {enriched.categoryLabel}
        </span>
        {previewOption ? (
          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${trustTone}`}>{trustLabel}</span>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{enriched.title}</h3>
          {matchLabel ? (
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{matchLabel}</p>
          ) : null}
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300">{enriched.explanation}</p>

        {!compact ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Why it happened:</span>{" "}
            {enriched.whyItHappened}
          </p>
        ) : null}

        {affectedItems.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {affectedItems.slice(0, compact ? 2 : 3).map((item) => (
              <span
                key={`${enriched.issueKey}-${item}`}
                className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}

        {!compact ? (
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-[var(--surface-soft)]/70 dark:text-slate-300">
            <span className="font-semibold text-slate-800 dark:text-slate-100">Recommended fix:</span>{" "}
            {enriched.recommendedFix}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {recommendationOption && typeof onApplyRecommendation === "function" ? (
          <button
            type="button"
            onClick={() => onApplyRecommendation(enriched)}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-cyan-600 dark:hover:bg-cyan-700"
          >
            <Sparkles size={13} />
            Apply Safe Fix
          </button>
        ) : null}

        {previewOption && typeof onPreviewRecommendation === "function" ? (
          <button
            type="button"
            onClick={() => onPreviewRecommendation(enriched)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowRight size={13} />
            View Options
          </button>
        ) : null}

        {!recommendationOption && quickAction && typeof onNavigateToFix === "function" ? (
          <button
            type="button"
            onClick={() => onNavigateToFix(quickAction, enriched)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Wrench size={13} />
            {quickAction.label || "Open Fix"}
          </button>
        ) : null}

        {typeof onViewDetails === "function" ? (
          <button
            type="button"
            onClick={() => onViewDetails(enriched)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ExternalLink size={13} />
            Open Details
          </button>
        ) : null}
      </div>
    </article>
  );
};

export default ScheduleIssueCard;
