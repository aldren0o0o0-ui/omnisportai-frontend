import { AlertTriangle, Info, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

const normalizeInsightPayload = (insight) => {
  if (typeof insight === "string") {
    return {
      code: null,
      severity: null,
      confidence: null,
      message: insight,
      reason: null,
      evidence: null,
      recommended_actions: [],
    };
  }
  if (insight && typeof insight === "object") {
    return {
      code: insight.code || null,
      severity: insight.severity || null,
      confidence: insight.confidence || null,
      message: insight.message || "",
      reason: insight.reason || null,
      evidence: insight.evidence || null,
      recommended_actions: Array.isArray(insight.recommended_actions) ? insight.recommended_actions : [],
    };
  }
  return {
    code: null,
    severity: null,
    confidence: null,
    message: String(insight || ""),
    reason: null,
    evidence: null,
    recommended_actions: [],
  };
};

const classifyInsight = (insight) => {
  const normalized = normalizeInsightPayload(insight);
  const severity = String(normalized.severity || "").toUpperCase();
  const text = String(normalized.message || "").toLowerCase();
  if (severity === "BLOCKING" || severity === "WARNING") {
    return {
      icon: AlertTriangle,
      itemClass:
        severity === "BLOCKING"
          ? "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-100"
          : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100",
      iconClass: severity === "BLOCKING" ? "text-rose-600 dark:text-rose-300" : "text-amber-600 dark:text-amber-300",
      badge: severity === "BLOCKING" ? "Blocking" : "Warning",
      payload: normalized,
    };
  }
  if (
    /(tight|warning|risk|overlap|conflict|insufficient|overload|crowd|back-to-back)/.test(
      text
    )
  ) {
    return {
      icon: AlertTriangle,
      itemClass:
        "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100",
      iconClass: "text-amber-600 dark:text-amber-300",
      badge: "Warning",
      payload: normalized,
    };
  }
  if (/(great|balanced|fair|good|optimal|improved)/.test(text)) {
    return {
      icon: Sparkles,
      itemClass:
        "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-100",
      iconClass: "text-emerald-600 dark:text-emerald-300",
      badge: "Positive",
      payload: normalized,
    };
  }
  return {
    icon: Info,
    itemClass:
      "border-blue-300 bg-blue-50 text-blue-800 dark:border-cyan-500/35 dark:bg-cyan-500/10 dark:text-cyan-100",
    iconClass: "text-blue-600 dark:text-cyan-300",
    badge: "Insight",
    payload: normalized,
  };
};

const normalizeSeverity = (severityValue) => {
  const severity = String(severityValue || "").toUpperCase();
  if (severity === "BLOCKING" || severity === "HIGH") return "BLOCKING";
  if (severity === "WARNING" || severity === "MEDIUM") return "WARNING";
  if (severity === "INFO" || severity === "LOW") return "INFO";
  return "INFO";
};

const buildInsightIssueKey = (payload, contextKey = "") => {
  const evidence = payload?.evidence && typeof payload.evidence === "object" ? payload.evidence : {};
  const sportKey = evidence.sport_id || evidence.sport_name || "";
  const venueKey = evidence.venue_id || evidence.venue_name || "";
  return `${contextKey}|${payload?.code || "INSIGHT"}|${payload?.message || ""}|${sportKey}|${venueKey}`;
};

const AIInsights = ({
  insights = [],
  onAction = null,
  supportsSchedulingModes = false,
  warningState = {},
  insightContextKey = "",
  hasRealUnscheduledMatches = false,
  hideActionButtons = false,
}) => {
  const [showAll, setShowAll] = useState(false);
  const items = Array.isArray(insights) ? insights.filter(Boolean) : [];
  const filteredItems = useMemo(
    () =>
      items.filter((insight) => {
        const payload = normalizeInsightPayload(insight);
        const issueKey = buildInsightIssueKey(payload, insightContextKey);
        return warningState?.[issueKey] !== "dismissed";
      }),
    [insights, items, insightContextKey, warningState]
  );
  const visibleItems = useMemo(
    () => (showAll ? filteredItems : filteredItems.slice(0, 3)),
    [filteredItems, showAll]
  );

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/60 transition-all duration-200 dark:bg-[var(--surface)] dark:shadow-none">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
        Insights
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Checks for schedule pressure, conflicts, and balance.
      </p>
      {hasRealUnscheduledMatches ? (
        <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-100">
          Real unscheduled matches were detected. Resolve those first before acting on schedule quality warnings.
        </div>
      ) : null}

      {filteredItems.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          AI insights will appear after schedule generation and validation.
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-2.5">
            {visibleItems.map((insight, index) => {
              const tone = classifyInsight(insight);
              const Icon = tone.icon;
              const payload = tone.payload;
              const issueKey = buildInsightIssueKey(payload, insightContextKey);
              const warningStateValue = warningState?.[issueKey] || "";
              const isTimeDistributionInsight = payload.code === "TIME_DISTRIBUTION_IMBALANCE";
              const rawMorningMatches = payload?.evidence?.morning_matches;
              const rawAfternoonMatches = payload?.evidence?.afternoon_matches;
              const hasMorningCount = Number.isFinite(Number(rawMorningMatches));
              const hasAfternoonCount = Number.isFinite(Number(rawAfternoonMatches));
              const morningMatches = hasMorningCount ? Number(rawMorningMatches) : null;
              const afternoonMatches = hasAfternoonCount ? Number(rawAfternoonMatches) : null;
              const totalDaytimeMatches =
                morningMatches !== null && afternoonMatches !== null ? morningMatches + afternoonMatches : null;
              const hasDistributionData = totalDaytimeMatches !== null && totalDaytimeMatches > 0;
              const evidenceMorningPct = Number(payload?.evidence?.morning_daytime_percentage);
              const evidenceAfternoonPct = Number(payload?.evidence?.afternoon_daytime_percentage);
              const morningPct = hasDistributionData
                ? Number.isFinite(evidenceMorningPct)
                  ? evidenceMorningPct
                  : (morningMatches / totalDaytimeMatches) * 100
                : null;
              const afternoonPct = hasDistributionData
                ? Number.isFinite(evidenceAfternoonPct)
                  ? evidenceAfternoonPct
                  : (afternoonMatches / totalDaytimeMatches) * 100
                : null;
              const isMorningHeavy = hasDistributionData && morningPct > 60;
              const isAfternoonHeavy = hasDistributionData && afternoonPct > 60;
              const isImbalance = isTimeDistributionInsight && (isMorningHeavy || isAfternoonHeavy);
              const severity = normalizeSeverity(payload.severity);
              const isNonBlockingWarning = severity === "WARNING";

              const messageText = isTimeDistributionInsight
                ? !hasDistributionData
                  ? "Distribution data unavailable"
                  : isMorningHeavy
                    ? "Schedule is morning-heavy"
                    : isAfternoonHeavy
                      ? "Schedule is afternoon-heavy"
                      : "Schedule distribution is balanced"
                : payload.message;

              const reasonText = isTimeDistributionInsight
                ? !hasDistributionData
                  ? "Time distribution is not available yet. Generate or refresh the schedule to analyze balance."
                  : isMorningHeavy
                    ? `${morningPct.toFixed(0)}% of matches are scheduled in the morning. This is a schedule quality warning, not a blocking conflict.`
                    : isAfternoonHeavy
                      ? `${afternoonPct.toFixed(0)}% of matches are scheduled in the afternoon. This is a schedule quality warning, not a blocking conflict.`
                      : `Schedule distribution is balanced: Morning ${morningPct.toFixed(0)}%, Afternoon ${afternoonPct.toFixed(0)}%.`
                : payload.reason;

              const recommendedActions = isTimeDistributionInsight
                ? isImbalance
                  ? supportsSchedulingModes
                    ? [
                        "Change Schedule Style to Spread Across Day.",
                        "Regenerate schedule to reduce morning/afternoon concentration.",
                      ]
                    : [
                        "Review tournament operating hours and program blocks.",
                        "Move some matches manually into afternoon slots.",
                      ]
                  : []
                : payload.recommended_actions;
              return (
                <li
                  key={`insight-${index}-${String(insight).slice(0, 24)}`}
                  className={`rounded-xl border px-3 py-2.5 text-sm ${tone.itemClass} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm`}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <Icon size={13} className={tone.iconClass} />
                    <span className="text-[11px] font-semibold uppercase tracking-wide">
                      {tone.badge}
                    </span>
                    {payload.code && !isTimeDistributionInsight ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {payload.code}
                      </span>
                    ) : null}
                    {payload.confidence && !isTimeDistributionInsight ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {payload.confidence}
                      </span>
                    ) : null}
                  </div>
                  <p className="leading-relaxed">{messageText}</p>
                  {reasonText && reasonText !== messageText ? (
                    <p className="mt-1 text-xs opacity-90">{reasonText}</p>
                  ) : null}
                  {isTimeDistributionInsight ? (
                    <ul className="mt-1.5 space-y-0.5 text-xs">
                      <li>- Morning matches: {morningMatches === null ? "Distribution data unavailable" : morningMatches}</li>
                      <li>- Afternoon matches: {afternoonMatches === null ? "Distribution data unavailable" : afternoonMatches}</li>
                      <li>- Target range: 40%-60% per period</li>
                    </ul>
                  ) : null}
                  {recommendedActions.length > 0 ? (
                    <ul className="mt-1.5 space-y-0.5 text-xs">
                      {recommendedActions.slice(0, 2).map((action) => (
                        <li key={`${payload.code || "insight"}-${action}`}>- {action}</li>
                      ))}
                    </ul>
                  ) : null}
                  {warningStateValue === "acknowledged" ? (
                    <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Acknowledged warning
                    </p>
                  ) : null}
                  {isImbalance && typeof onAction === "function" && !hideActionButtons ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {supportsSchedulingModes ? (
                        <button
                          type="button"
                          onClick={() => onAction({ type: "regenerate_spread" })}
                          className="rounded-md border border-blue-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 dark:border-cyan-500/40 dark:bg-[var(--surface)] dark:text-cyan-300 dark:hover:bg-cyan-500/10"
                        >
                          Regenerate with Spread Across Day
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onAction({ type: "open_schedule_settings" })}
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-[var(--surface)]"
                      >
                        Open Schedule Settings
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction({ type: "acknowledge_warning", issueKey })}
                        className="rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-[var(--surface)] dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                      >
                        Keep Schedule Anyway
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction({ type: "dismiss_warning", issueKey })}
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-[var(--surface)]"
                      >
                        Dismiss Warning
                      </button>
                    </div>
                  ) : null}
                  {!isImbalance && isNonBlockingWarning && typeof onAction === "function" && !hideActionButtons ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onAction({ type: "acknowledge_warning", issueKey })}
                        className="rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-[var(--surface)] dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                      >
                        Keep Schedule Anyway
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction({ type: "dismiss_warning", issueKey })}
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-[var(--surface)]"
                      >
                        Dismiss Warning
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {filteredItems.length > 3 ? (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="mt-3 text-xs font-semibold text-blue-700 hover:underline dark:text-cyan-300"
            >
              {showAll ? "View fewer" : `View all (${filteredItems.length})`}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
};

export default AIInsights;
