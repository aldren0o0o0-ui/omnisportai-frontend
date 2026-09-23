import React from 'react';
import AppModal from "../../../components/common/AppModal";
import { AlertTriangle, Info, MapPin } from "lucide-react";

export default function MatchDetailModal({
  actionLoading,
  activePopover,
  activePopoverFirstApplicableOption,
  activePopoverIssueSeverity,
  activePopoverItem,
  activePopoverMatchId,
  activePopoverMatchLocked,
  activePopoverPrimaryIssue,
  activePopoverRecommendedActions,
  buildIssueTitle,
  eventDetailOpen,
  formatTimeRangeLabel,
  getRecommendationActionLabel,
  handleApplyRecommendationOption,
  handleEditSelectedMatch,
  handleOpenLiveScoring,
  handleStartSelectedMatch,
  isMeaningfulEventName,
  liveScoringDisabledReason,
  matchStartDisabledReason,
  participantShapeBadgeClass,
  schedulePanelRef,
  setEventDetailOpen
}) {
  return (
    <AppModal open={eventDetailOpen && Boolean(activePopoverItem) && activePopover?.type === "MATCH"} onClose={() => setEventDetailOpen(false)} title={activePopoverItem ? `${String(activePopoverItem?.team1_label || "Team 1")} vs ${String(activePopoverItem?.team2_label || "Team 2")}` : "Match Details"} subtitle={activePopoverItem?.sportDisplayLabel || activePopoverItem?.sportName || activePopoverItem?.sport || ""} variant="drawer" closeButtonLabel="Close match details" fallbackFocusRef={schedulePanelRef}>
        {activePopoverItem ? <div className="space-y-4">
            {/* Schedule information */}
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-[var(--surface-soft)]/60">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Schedule
              </h3>
              <dl className="mt-2 space-y-1.5 text-slate-700 dark:text-slate-200">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Time</dt>
                  <dd className="text-right font-medium">{formatTimeRangeLabel(activePopoverItem?.start, activePopoverItem?.end)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Venue</dt>
                  <dd className="text-right font-medium">{activePopoverItem?.venue || "Venue TBA"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Sport</dt>
                  <dd className="text-right font-medium">{activePopoverItem?.sportName || activePopoverItem?.sport || "Sport"}</dd>
                </div>
                {isMeaningfulEventName(activePopoverItem?.eventName, activePopoverItem?.sportName) ? <div className="flex justify-between gap-3">
                    <dt className="text-slate-500 dark:text-slate-400">Event Category</dt>
                    <dd className="text-right font-medium">{activePopoverItem?.eventName}</dd>
                  </div> : null}
                {activePopoverItem?.competitionTypeLabel ? <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500 dark:text-slate-400">Competition Type</dt>
                    <dd>
                      <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${participantShapeBadgeClass(activePopoverItem?.participantShape || activePopoverItem?.participant_shape || "TEAM")}`}>
                        {activePopoverItem.competitionTypeLabel}
                      </span>
                    </dd>
                  </div> : null}
              </dl>
            </section>

            {/* Conflict details */}
            {activePopoverIssueSeverity !== "NONE" ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  <AlertTriangle size={12} /> Conflict
                </h3>
                <p className="mt-2 font-semibold text-amber-900 dark:text-amber-200">
                  {buildIssueTitle(activePopoverPrimaryIssue)}
                </p>
                {activePopoverPrimaryIssue?.reason ? <p className="mt-1 text-amber-800 dark:text-amber-200/90">{activePopoverPrimaryIssue.reason}</p> : null}
              </section> : null}

            {/* AI suggestions */}
            {activePopoverRecommendedActions.length > 0 ? <section className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-[var(--surface)]">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  AI Suggestions
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-700 dark:text-slate-200">
                  {activePopoverRecommendedActions.slice(0, 5).map(action => <li key={`detail-action-${action}`}>{action}</li>)}
                </ul>
              </section> : null}

            {/* Actions — same handlers and disabled rules as before */}
            <section className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleEditSelectedMatch(activePopoverItem)} disabled={activePopoverMatchLocked} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800">
                Edit
              </button>
              <button type="button" onClick={() => handleStartSelectedMatch(activePopoverItem)} disabled={Boolean(matchStartDisabledReason)} title={matchStartDisabledReason || "Start match"} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20">
                Start
              </button>
              <button type="button" onClick={() => handleOpenLiveScoring(activePopoverItem)} disabled={Boolean(liveScoringDisabledReason)} title={liveScoringDisabledReason || "Open live scoring"} className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20">
                Live Scoring
              </button>
              {activePopoverFirstApplicableOption ? <button type="button" onClick={() => handleApplyRecommendationOption({
            matchId: activePopoverMatchId,
            option: activePopoverFirstApplicableOption
          })} disabled={actionLoading} className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-700 hover:bg-cyan-100 disabled:opacity-60 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20">
                  {actionLoading ? "Applying..." : getRecommendationActionLabel(activePopoverFirstApplicableOption)}
                </button> : null}
            </section>
          </div> : null}
      </AppModal>
  );
}
