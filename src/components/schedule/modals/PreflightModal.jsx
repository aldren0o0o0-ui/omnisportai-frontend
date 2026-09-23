import React from 'react';
import AppModal from "../../../components/common/AppModal";
import { AlertTriangle, CheckCircle2, Info, MapPin } from "lucide-react";

export default function PreflightModal({
  preflightDisplayStatusLabel,
  formatSnakeLabel,
  getRecommendationTrustTone,
  primaryPreflightFixAction,
  existingScheduleNoticeAck,
  preflightStatusKey,
  buildUnscheduledDiagnosticNotes,
  blockingIssuesForDisplay,
  getIssueQuickActions,
  preflightMode,
  preflightStateTitle,
  hideDetailedPreflightIssueLists,
  exactFeasibilityDiagnosticHighlights,
  exactFeasibilityIssue,
  preflightStatusExplanation,
  preflightFingerprint,
  selectedTournamentId,
  actionLoading,
  handleGeneratePartialSchedule,
  preflightConfidenceLabel,
  formatPreflightTimestamp,
  exactFeasibilityScheduledCount,
  getResolutionOptionExplanation,
  preflightStale,
  hasOnlyExistingSchedulePressureIssue,
  preflightModalOpen,
  preflightExactStatus,
  sortResolutionOptions,
  exactFeasibilityFocusedActions,
  getConflictBadgeTone,
  preflightDataFingerprint,
  setIssueDrawerOpen,
  groupIssuesByCategory,
  getIssueSeverityLabel,
  buildFriendlyMatchSummary,
  preflightSummaryBlockingCount,
  hasExactFeasibilityFailure,
  activeExistingSchedulePressureIssue,
  formatPreflightCategoryLabel,
  preflightExactMode,
  warningIssuesExcludingEstimatedPlacement,
  isAutoApplicableVerifiedOption,
  exactFeasibilityPlaceholders,
  normalizeResolutionOptions,
  handlePreflightQuickAction,
  setPreflightModalOpen,
  getConfidenceTone,
  preflightRunning,
  handleApplyRecommendationOption,
  getMatchDisplayName,
  buildEvidenceRows,
  getRecommendationActionLabel,
  preflightResult,
  exactFeasibilityRealMatches,
  isRecommendationDowngraded,
  getRecommendationTrustLabel,
  generating,
  getContextualResolutionTitle
}) {
  return (
    <AppModal open={preflightModalOpen} onClose={() => setPreflightModalOpen(false)} title="AI Schedule Preflight" subtitle="Predict scheduling feasibility before generation and surface exact fixes." maxWidthClass="max-w-5xl">
        <div className="space-y-4">
          {preflightRunning ? <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
              Running preflight check...
            </div> : null}

          {!preflightResult ? <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60 dark:text-slate-300">
              Run preflight to check venue compatibility, capacity, program blocks, and schedule readiness.
            </div> : <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full border px-2.5 py-1 font-semibold ${preflightStatusKey === "READY" ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300" : preflightStatusKey === "WARNING" ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300" : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"}`}>
                  {preflightDisplayStatusLabel || "NOT CHECKED"}
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  Readiness score: <span className="font-semibold text-slate-800 dark:text-slate-100">{preflightResult.readiness_score ?? 0}/100</span>
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  Confidence: <span className="font-semibold text-slate-800 dark:text-slate-100">{preflightConfidenceLabel}</span>
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  Exact check: <span className="font-semibold text-slate-800 dark:text-slate-100">{formatSnakeLabel(preflightExactStatus)}</span>
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  Checked mode: <span className="font-semibold text-slate-800 dark:text-slate-100">{formatSnakeLabel(preflightExactMode)}</span>
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  Last checked: <span className="font-medium text-slate-800 dark:text-slate-100">{formatPreflightTimestamp(preflightResult?.last_checked_at)}</span>
                </span>
                {preflightStale ? <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                    Preflight may be outdated. Run again.
                  </span> : null}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 xl:grid-cols-6">
                <article className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60">
                  <p className="text-slate-500 dark:text-slate-400">Sports checked</p>
                  <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                    {preflightResult?.summary?.total_sports ?? preflightResult?.summary?.sports_checked ?? 0}
                  </p>
                </article>
                <article className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60">
                  <p className="text-slate-500 dark:text-slate-400">Venues checked</p>
                  <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                    {preflightResult?.summary?.total_venues ?? preflightResult?.summary?.venues_checked ?? 0}
                  </p>
                </article>
                <article className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60">
                  <p className="text-slate-500 dark:text-slate-400">Required slots</p>
                  <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                    {preflightResult?.summary?.required_slots ?? preflightResult?.summary?.matches_needed ?? 0}
                  </p>
                </article>
                <article className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60">
                  <p className="text-slate-500 dark:text-slate-400">Estimated capacity</p>
                  <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                    {preflightResult?.summary?.estimated_capacity ?? 0}
                  </p>
                </article>
                {preflightMode === "ESTIMATED_ONLY" ? <article className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-500/30 dark:bg-blue-500/10">
                    <p className="text-blue-600 dark:text-blue-300">Exact check</p>
                    <p className="mt-0.5 font-semibold text-blue-700 dark:text-blue-200">Not run</p>
                  </article> : null}
                {preflightMode !== "ESTIMATED_ONLY" && preflightMode !== "EXACT_FAILED" && preflightSummaryBlockingCount > 0 ? <article className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-500/30 dark:bg-rose-500/10">
                    <p className="text-rose-600 dark:text-rose-300">Blocking Issues</p>
                    <p className="mt-0.5 font-semibold text-rose-700 dark:text-rose-200">
                      {preflightSummaryBlockingCount}
                    </p>
                  </article> : null}
                {preflightMode !== "ESTIMATED_ONLY" && preflightMode !== "EXACT_FAILED" && warningIssuesExcludingEstimatedPlacement.length > 0 ? <article className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                    <p className="text-amber-600 dark:text-amber-300">Warnings</p>
                    <p className="mt-0.5 font-semibold text-amber-700 dark:text-amber-200">
                      {warningIssuesExcludingEstimatedPlacement.length}
                    </p>
                  </article> : null}
                {preflightMode === "EXACT_FAILED" ? <>
                    <article className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                      <p className="text-amber-600 dark:text-amber-300">Exact check</p>
                      <p className="mt-0.5 font-semibold text-amber-700 dark:text-amber-200">Failed</p>
                    </article>
                    <article className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-500/30 dark:bg-rose-500/10">
                      <p className="text-rose-600 dark:text-rose-300">Real unscheduled</p>
                      <p className="mt-0.5 font-semibold text-rose-700 dark:text-rose-200">
                        {exactFeasibilityRealMatches.length}
                      </p>
                    </article>
                    <article className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-500/30 dark:bg-blue-500/10">
                      <p className="text-blue-600 dark:text-blue-300">Placeholders</p>
                      <p className="mt-0.5 font-semibold text-blue-700 dark:text-blue-200">
                        {exactFeasibilityPlaceholders.length}
                      </p>
                    </article>
                    <article className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60">
                      <p className="text-slate-500 dark:text-slate-400">Scheduled in dry-run</p>
                      <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                        {exactFeasibilityScheduledCount}
                      </p>
                    </article>
                  </> : preflightExactStatus !== "NOT_RUN" ? <>
                    <article className={`rounded-lg border px-3 py-2 ${preflightExactStatus === "FAILED" ? "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10" : "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"}`}>
                      <p className={`${preflightExactStatus === "FAILED" ? "text-amber-600 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-300"}`}>Exact check</p>
                      <p className={`mt-0.5 font-semibold ${preflightExactStatus === "FAILED" ? "text-amber-700 dark:text-amber-200" : "text-emerald-700 dark:text-emerald-200"}`}>
                        {formatSnakeLabel(preflightExactStatus)}
                      </p>
                    </article>
                    <article className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-500/30 dark:bg-rose-500/10">
                      <p className="text-rose-600 dark:text-rose-300">Real unscheduled</p>
                      <p className="mt-0.5 font-semibold text-rose-700 dark:text-rose-200">
                        {exactFeasibilityRealMatches.length}
                      </p>
                    </article>
                    <article className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-500/30 dark:bg-blue-500/10">
                      <p className="text-blue-600 dark:text-blue-300">Placeholders</p>
                      <p className="mt-0.5 font-semibold text-blue-700 dark:text-blue-200">
                        {exactFeasibilityPlaceholders.length}
                      </p>
                    </article>
                    <article className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-[var(--surface-soft)]/60">
                      <p className="text-slate-500 dark:text-slate-400">Scheduled in dry-run</p>
                      <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                        {exactFeasibilityScheduledCount}
                      </p>
                    </article>
                  </> : null}
              </div>

              <article className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs dark:border-slate-700 dark:bg-[var(--surface-soft)]/60">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{preflightStateTitle}</p>
                {preflightStatusExplanation ? <p className="mt-1 text-slate-700 dark:text-slate-300">{preflightStatusExplanation}</p> : null}
                {preflightMode === "ESTIMATED_ONLY" ? <p className="mt-1 text-slate-500 dark:text-slate-400">
                    Exact placement has not been verified yet.
                  </p> : null}
                {preflightMode === "EXACT_FAILED" ? <div data-fix-checklist className="mt-2 space-y-2.5">
                    {exactFeasibilityDiagnosticHighlights.length > 0 ? <div className="rounded-md border border-amber-200 bg-amber-50/80 px-2.5 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                        <p className="font-semibold text-amber-800 dark:text-amber-200">Why this happened:</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-amber-700 dark:text-amber-300">
                          {exactFeasibilityDiagnosticHighlights.map(line => <li key={`exact-diagnostic-highlight-${line}`}>{line}</li>)}
                        </ul>
                      </div> : null}
                    <p className="font-semibold text-amber-800 dark:text-amber-200">What to do next:</p>
                    <ol className="list-decimal space-y-1 pl-4 text-amber-700 dark:text-amber-300">
                      {exactFeasibilityFocusedActions.map(action => <li key={`exact-focused-action-${action}`}>{action}</li>)}
                    </ol>
                  </div> : null}
              </article>

              {hasOnlyExistingSchedulePressureIssue && activeExistingSchedulePressureIssue ? <article className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs dark:border-blue-500/30 dark:bg-blue-500/10">
                  <p className="font-semibold text-blue-800 dark:text-blue-200">Existing Schedule Notice</p>
                  <p className="mt-1 text-blue-700 dark:text-blue-300">
                    {activeExistingSchedulePressureIssue.message || "Existing scheduled matches were considered in preflight capacity."}
                  </p>
                  {activeExistingSchedulePressureIssue.reason ? <p className="mt-1 text-blue-700 dark:text-blue-300">{activeExistingSchedulePressureIssue.reason}</p> : null}
                  {existingScheduleNoticeAck[`${selectedTournamentId || "none"}:${preflightFingerprint || preflightDataFingerprint}:EXISTING_SCHEDULE_PRESSURE`] ? <p className="mt-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                      Acknowledged for this session.
                    </p> : null}
                </article> : null}

              {/* Exact Feasibility Failure Section */}
              {!hideDetailedPreflightIssueLists && hasExactFeasibilityFailure && exactFeasibilityIssue ? <section data-exact-failure-section className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                      WARNING
                    </span>
                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      {exactFeasibilityRealMatches.length} real match{exactFeasibilityRealMatches.length !== 1 ? "es" : ""} cannot be placed with the current time, venue, and program settings.
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">
                    These matches need schedule fixes before you can create a complete schedule.
                  </p>

                  {/* Real Unscheduled Matches */}
                  {exactFeasibilityRealMatches.length > 0 && <div className="mt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        Real Unscheduled Matches ({exactFeasibilityRealMatches.length})
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {exactFeasibilityRealMatches.map(match => <div key={`exact-real-${match.match_id}`} className="rounded-lg border border-amber-100 bg-white/50 px-3 py-2.5 text-[11px] text-amber-900 dark:border-amber-500/20 dark:bg-amber-900/10 dark:text-amber-100">
                            {(() => {
                const summary = buildFriendlyMatchSummary(match?.match_id, match || {});
                return <>
                                  <div className="font-semibold text-sm">{summary.primaryLabel}</div>
                                  <div className="mt-0.5 opacity-90">{summary.timeRange}</div>
                                  <div className="mt-0.5 opacity-90">Venue: {summary.venueName}</div>
                                  <div className="mt-0.5 text-[10px] opacity-80">{summary.meta}</div>
                                </>;
              })()}
                            <div className="mt-2.5">
                              <span className="font-semibold block opacity-90 mb-0.5">Reason:</span>
                              {match.reasonLabel}
                            </div>
                            {buildUnscheduledDiagnosticNotes(match).length > 0 ? <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/70 px-2 py-1 dark:border-amber-500/30 dark:bg-amber-500/10">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                                  Why venue/time was rejected
                                </p>
                                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-amber-800 dark:text-amber-200">
                                  {buildUnscheduledDiagnosticNotes(match).map(line => <li key={`exact-unscheduled-diagnostic-${match.match_id}-${line}`}>{line}</li>)}
                                </ul>
                              </div> : null}
                            <div className="mt-2">
                              {(() => {
                  const normalizedOptions = sortResolutionOptions(normalizeResolutionOptions(match?.resolution_options));
                  const automaticFixes = normalizedOptions.filter(opt => isAutoApplicableVerifiedOption({
                    option: opt,
                    matchId: match?.match_id
                  }));
                  const manualSuggestions = normalizedOptions.filter(opt => !isAutoApplicableVerifiedOption({
                    option: opt,
                    matchId: match?.match_id
                  }));
                  const displayManualSuggestions = manualSuggestions.length > 0 ? manualSuggestions : [{
                    option_type: "MANUAL_REVIEW",
                    explanation: "Review this match manually using venue, program block, and time-window constraints."
                  }];
                  return <>
                                    <span className="font-semibold block opacity-90 mb-1 text-sm">Verified fixes:</span>
                                    {automaticFixes.length === 0 ? <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 italic mb-3">
                                        No verified fix is available yet. Review suggested or guide-only actions below.
                                      </p> : <div className="grid gap-1.5 sm:grid-cols-2 mb-3">
                                        {automaticFixes.map((option, optionIdx) => {
                        const isBestOption = optionIdx === 0;
                        const confidence = String(option?.confidence || "LOW").toUpperCase();
                        const confidenceLabel = confidence === "HIGH" ? "High confidence" : confidence === "MEDIUM" ? "Medium confidence" : "Low confidence";
                        const downgraded = isRecommendationDowngraded(match?.match_id, option);
                        const trustOption = downgraded ? {
                          ...option,
                          verification_status: "PARTIAL"
                        } : option;
                        const trustLabel = getRecommendationTrustLabel(trustOption);
                        const buttonLabel = getRecommendationActionLabel(option);
                        return <article key={`exact-option-${match.match_id}-${option.option_type}-${optionIdx}`} className={`rounded-md border p-2 ${isBestOption ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-500/40 dark:bg-emerald-500/10" : "border-amber-200 bg-white/70 dark:border-amber-500/20 dark:bg-amber-900/10"}`}>
                                              <div className="flex flex-wrap items-center gap-1">
                                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                                  {getContextualResolutionTitle(option, match)}
                                                </span>
                                                {isBestOption && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                                    Recommended
                                                  </span>}
                                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${getConfidenceTone(confidence)}`}>
                                                  {confidenceLabel}
                                                </span>
                                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${getRecommendationTrustTone(trustOption)}`}>
                                                  {trustLabel}
                                                </span>
                                              </div>
                                              <p className="mt-1 text-[11px] text-slate-700 dark:text-slate-200">
                                                {getResolutionOptionExplanation(option)}
                                              </p>
                                              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                                                Impact: {option?.impact_summary || "Helps unblock this match while preserving schedule constraints."}
                                              </p>
                                              {option?.expected_effect ? <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                                                  Expected effect: {option.expected_effect}
                                                </p> : null}
                                              {Array.isArray(option?.limitations) && option.limitations.length > 0 ? <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                                                  Limitation: {option.limitations[0]}
                                                </p> : null}
                                              <button type="button" disabled={!isAutoApplicableVerifiedOption({
                            option,
                            matchId: match?.match_id
                          }) || actionLoading} onClick={() => handleApplyRecommendationOption({
                            matchId: match.match_id,
                            option
                          })} className="mt-1.5 rounded-md border border-blue-400 bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:border-cyan-400 dark:bg-cyan-600 dark:hover:bg-cyan-700">
                                                {actionLoading ? "Applying..." : buttonLabel}
                                              </button>
                                            </article>;
                      })}
                                      </div>}

                                    {displayManualSuggestions.length > 0 && <div className="mt-2">
                                        <span className="font-semibold block opacity-90 mb-1 text-sm">Suggested and guide-only actions:</span>
                                        <ul className="list-disc space-y-1 pl-4 text-[11px] text-amber-900 dark:text-amber-100">
                                          {displayManualSuggestions.map((option, idx) => <li key={`manual-sugg-${idx}`}>
                                              {getResolutionOptionExplanation(option)}
                                              <span className={`ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${getRecommendationTrustTone(option)}`}>
                                                {getRecommendationTrustLabel(option)}
                                              </span>
                                            </li>)}
                                        </ul>
                                      </div>}
                                  </>;
                })()}
                            </div>
                          </div>)}
                      </div>
                    </div>}

                  {/* Future-Round Placeholders */}
                  {exactFeasibilityPlaceholders.length > 0 && <div className="mt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                        Future-round placeholders — normal
                      </p>
                      <p className="mt-1 text-[11px] text-blue-700 dark:text-blue-200">
                        These matches will be scheduled after earlier-round winners are known.
                      </p>
                      <div className="mt-2 space-y-1">
                        {exactFeasibilityPlaceholders.map(match => <div key={`exact-placeholder-${match.match_id}`} className="rounded-lg border border-blue-100 bg-blue-50/50 px-2.5 py-1.5 text-[11px] text-blue-900 dark:border-blue-500/20 dark:bg-[var(--surface)]/10 dark:text-blue-100">
                            <span className="opacity-90">
                              <span className="font-semibold">{getMatchDisplayName(match)}</span> will be scheduled after earlier-round winners are known.
                            </span>
                          </div>)}
                      </div>
                    </div>}
                </section> : null}

              {hideDetailedPreflightIssueLists ? <section className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                  Detailed issue lists are now shown directly on calendar match cards and in the floating Schedule Issues panel.
                </section> : null}

              {!hideDetailedPreflightIssueLists ? <div className="space-y-4">
                {[{
          key: "blocking",
          label: "Blocking Issues",
          entries: blockingIssuesForDisplay
        }, {
          key: "warning",
          label: "Warnings",
          entries: warningIssuesExcludingEstimatedPlacement
        }].filter(section => section.entries.length > 0).map(section => {
          const groups = groupIssuesByCategory(section.entries);
          return <section key={`modal-preflight-${section.key}`}>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                          {section.label} ({section.entries.length})
                        </h4>
                        <div className="mt-2 space-y-3">
                          {groups.map(group => <div key={`modal-preflight-category-${section.key}-${group.category}`} className="space-y-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                {formatPreflightCategoryLabel(group.category)} ({group.rows.length})
                              </p>
                              {group.rows.slice(0, 8).map((issue, index) => {
                  const severity = getIssueSeverityLabel(issue);
                  const evidenceRows = buildEvidenceRows(issue);
                  const actions = getIssueQuickActions(issue, selectedTournamentId);
                  return <article key={`modal-preflight-${section.key}-${issue.code || "issue"}-${index}`} className={`rounded-lg border px-3 py-2 ${severity === "BLOCKING" ? "border-rose-200 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/10" : severity === "WARNING" ? "border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10" : "border-blue-200 bg-blue-50/70 dark:border-blue-500/30 dark:bg-blue-500/10"}`}>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getConflictBadgeTone(severity)}`}>
                                        {formatSnakeLabel(severity)}
                                      </span>
                                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                        {issue.message || issue.code || "Preflight issue"}
                                      </span>
                                      {issue.confidence ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getConfidenceTone(issue.confidence)}`}>
                                          {issue.confidence} confidence
                                        </span> : null}
                                    </div>
                                    {issue.reason ? <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">
                                        <span className="font-semibold">Why this matters: </span>
                                        {issue.reason}
                                      </p> : null}
                                    <div className="mt-1.5">
                                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                        Evidence
                                      </p>
                                      {evidenceRows.length > 0 ? <ul className="mt-1 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                                          {evidenceRows.slice(0, 6).map(row => <li key={`modal-evidence-${section.key}-${issue.code || "issue"}-${row.key}`}>
                                              {row.label}: {row.value}
                                            </li>)}
                                        </ul> : <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No additional evidence available.</p>}
                                    </div>
                                    {Array.isArray(issue.recommended_actions) && issue.recommended_actions.length > 0 ? <div className="mt-2 border-t border-current/10 pt-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                          Recommended actions
                                        </p>
                                        <ul className="mt-1 space-y-0.5 text-xs text-slate-700 dark:text-slate-200">
                                          {issue.recommended_actions.slice(0, 3).map((action, actionIdx) => <li key={`modal-preflight-action-${section.key}-${index}-${actionIdx}`}>- {action}</li>)}
                                        </ul>
                                      </div> : null}
                                    {normalizeResolutionOptions(issue?.resolution_options).length > 0 ? <div className="mt-2 border-t border-current/10 pt-2">
                                        {(() => {
                        const normalizedOptions = sortResolutionOptions(normalizeResolutionOptions(issue?.resolution_options));
                        const automaticFixes = normalizedOptions.filter(opt => isAutoApplicableVerifiedOption({
                          option: opt,
                          matchId: issue?.match_id
                        }));
                        const manualSuggestions = normalizedOptions.filter(opt => !isAutoApplicableVerifiedOption({
                          option: opt,
                          matchId: issue?.match_id
                        }));
                        return <>
                                              {automaticFixes.length > 0 && <>
                                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                                                    Verified fixes
                                                  </p>
                                                  <div className="grid gap-2 sm:grid-cols-2 mb-2">
                                                    {automaticFixes.slice(0, 3).map((option, optionIdx) => {
                                const isBestOption = optionIdx === 0;
                                const confidence = String(option?.confidence || "LOW").toUpperCase();
                                const confidenceLabel = confidence === "HIGH" ? "High confidence" : confidence === "MEDIUM" ? "Medium confidence" : "Low confidence";
                                const buttonLabel = getRecommendationActionLabel(option);
                                const downgraded = isRecommendationDowngraded(issue?.match_id, option);
                                const trustOption = downgraded ? {
                                  ...option,
                                  verification_status: "PARTIAL"
                                } : option;
                                const trustLabel = getRecommendationTrustLabel(trustOption);
                                return <article key={`preflight-option-${section.key}-${issue.code || "issue"}-${option.option_type}-${option.label}`} className={`rounded-md border p-2 ${isBestOption ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-500/40 dark:bg-emerald-500/10" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-[var(--surface)]"}`}>
                                                          <div className="flex flex-wrap items-center gap-1.5">
                                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                                              {getContextualResolutionTitle(option, issue)}
                                                            </p>
                                                            {isBestOption && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                                                Recommended
                                                              </span>}
                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getConfidenceTone(confidence)}`}>
                                                              {confidenceLabel}
                                                            </span>
                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getRecommendationTrustTone(trustOption)}`}>
                                                              {trustLabel}
                                                            </span>
                                                          </div>
                                                          <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                                                            {getResolutionOptionExplanation(option)}
                                                          </p>
                                                          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                            Impact: {option.impact_summary || "Helps reduce scheduling conflicts for this issue."}
                                                          </p>
                                                          {option?.expected_effect ? <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                              Expected effect: {option.expected_effect}
                                                            </p> : null}
                                                          {Array.isArray(option?.limitations) && option.limitations.length > 0 ? <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                                              Limitation: {option.limitations[0]}
                                                            </p> : null}
                                                          <button type="button" disabled={!isAutoApplicableVerifiedOption({
                                    option,
                                    matchId: issue?.match_id
                                  }) || actionLoading} onClick={() => handleApplyRecommendationOption({
                                    matchId: issue.match_id,
                                    option
                                  })} className="mt-1.5 rounded-md border border-blue-400 bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:border-cyan-400 dark:bg-cyan-600 dark:hover:bg-cyan-700">
                                                            {actionLoading ? "Applying..." : buttonLabel}
                                                          </button>
                                                        </article>;
                              })}
                                                  </div>
                                                </>}

                                              {manualSuggestions.length > 0 && <>
                                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                                                    Suggested and guide-only actions
                                                  </p>
                                                  <ul className="list-disc space-y-1 pl-4 text-[11px] text-slate-700 dark:text-slate-300">
                                                    {manualSuggestions.map((option, idx) => <li key={`manual-sugg-gen-${idx}`}>
                                                        {getResolutionOptionExplanation(option)}
                                                        <span className={`ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${getRecommendationTrustTone(option)}`}>
                                                          {getRecommendationTrustLabel(option)}
                                                        </span>
                                                      </li>)}
                                                  </ul>
                                                </>}
                                            </>;
                      })()}
                                      </div> : null}
                                    {actions.length > 0 ? <div className="mt-2 flex flex-wrap gap-2">
                                        {actions.map(action => <button key={`modal-preflight-quick-action-${section.key}-${issue.code || "issue"}-${action.label}`} type="button" onClick={() => handlePreflightQuickAction(action)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800">
                                            {action.label}
                                          </button>)}
                                      </div> : null}
                                  </article>;
                })}
                            </div>)}
                        </div>
                      </section>;
        })}
                </div> : null}
            </>}

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
            {preflightMode === "EXACT_FAILED" ? <>
                <button type="button" onClick={() => {
          setIssueDrawerOpen(true);
          setPreflightModalOpen(false);
        }} className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20">
                  Review Schedule Issues
                </button>
                <button type="button" onClick={handleGeneratePartialSchedule} disabled={generating || preflightRunning} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:border-amber-500/30 dark:bg-[var(--surface-soft)] dark:text-amber-400 dark:hover:bg-slate-700">
                  {generating ? "Generating..." : "Generate Partial Schedule"}
                </button>
                <button type="button" onClick={() => setPreflightModalOpen(false)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700">
                  Cancel
                </button>
              </> : preflightMode === "BLOCKED" ? <>
                {primaryPreflightFixAction ? <button type="button" onClick={() => handlePreflightQuickAction(primaryPreflightFixAction)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700">
                    {primaryPreflightFixAction.label || "Fix Blocking Issues"}
                  </button> : null}
                <button type="button" onClick={() => {
          setIssueDrawerOpen(true);
          setPreflightModalOpen(false);
        }} className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20">
                  Open Schedule Issues
                </button>
                <button type="button" onClick={() => setPreflightModalOpen(false)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700">
                  Close
                </button>
              </> : <button type="button" onClick={() => setPreflightModalOpen(false)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700">
                Close
              </button>}

          </div>
        </div>
      </AppModal>
  );
}
