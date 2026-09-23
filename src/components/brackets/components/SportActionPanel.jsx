import React, { useMemo } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";

import {
  buildParticipantPresentation,
  getActionPresentation,
  getScoringReadinessPresentation,
  needsDetailedComposer,
  partitionSportActions,
} from "../utils/liveScoringPresentation";

const actionCode = (control) => String(control?.event_type || "").trim().toUpperCase();

const ActionButton = ({ control, disabledReason, busy, onAction, secondary = false }) => {
  const presentation = getActionPresentation(control?.event_type);
  const displayLabel = presentation.label.replace(/[^\x20-\x7E]+/g, " - ");
  return (
    <button
      type="button"
      onClick={() => onAction?.(control)}
      disabled={Boolean(disabledReason) || busy}
      title={disabledReason || presentation.impact || displayLabel}
      aria-label={displayLabel}
      className={secondary
        ? "min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-left text-sm font-semibold text-[var(--text-main)] transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
        : "min-h-14 rounded-xl bg-cyan-600 px-4 py-3 text-left text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate">{displayLabel}</span>
        {busy ? <LoaderCircle aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" /> : null}
      </span>
      {presentation.impact ? (
        <span className={secondary ? "mt-0.5 block text-xs font-normal text-[var(--text-muted)]" : "mt-0.5 block text-xs font-medium text-cyan-50/90"}>
          {presentation.impact}
        </span>
      ) : null}
    </button>
  );
};

export default function SportActionPanel({
  config,
  sportCode,
  participants = [],
  selectedParticipantId,
  selectedPlayerId,
  selectedPlayerLabel,
  canWrite = false,
  isSubmitting = false,
  getDisabledReason,
  onAction,
  onOpenDetailedControls,
}) {
  const rows = useMemo(() => buildParticipantPresentation(participants), [participants]);
  const groups = useMemo(() => partitionSportActions(config, sportCode), [config, sportCode]);
  const isDirectRallySport = ["VOLLEYBALL", "TAKRAW", "SEPAK_TAKRAW"].some((code) =>
    String(sportCode || "").toUpperCase().includes(code)
  );
  
  const primary = groups.primary.filter((control) => {
    if (actionCode(control) === "SUBSTITUTION") return false;
    if (control?.provides_value && control?.value === undefined) return false;
    if (isDirectRallySport) return true;
    return !needsDetailedComposer(control);
  });
  const secondary = groups.secondary.filter((control) => {
    if (actionCode(control) === "SUBSTITUTION") return false;
    if (control?.provides_value && control?.value === undefined) return false;
    if (isDirectRallySport) return true;
    return !needsDetailedComposer(control);
  });
  const detailed = isDirectRallySport
    ? []
    : [...groups.primary, ...groups.secondary].filter(needsDetailedComposer);
  const readiness = getScoringReadinessPresentation(config, sportCode);
  const scoringReady = readiness.ready;
  const selectedParticipant = rows.find((row) => Number(row.teamId) === Number(selectedParticipantId)) || null;

  if (!canWrite) return null;
  if (!scoringReady || (groups.primary.length === 0 && groups.secondary.length === 0)) {
    return (
      <section className="rounded-2xl bg-amber-50 px-4 py-4 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100" role="status">
        <div className="flex items-start gap-3">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <div><h3 className="font-semibold">Scoring is not available yet</h3><p className="mt-1 text-sm opacity-90">{readiness.message}</p></div>
        </div>
      </section>
    );
  }

  const renderControl = (control, secondaryStyle) => {
    const isPlayerRequired = control?.requires_player;
    const reason = getDisabledReason?.(control)
      || (control?.requires_team && !selectedParticipantId ? "Select a team or player first." : "")
      || (isPlayerRequired && !selectedPlayerId ? "Select an active player above first." : "");
    return (
      <ActionButton
        key={control?.id || actionCode(control)}
        control={control}
        disabledReason={reason}
        busy={isSubmitting}
        onAction={onAction}
        secondary={secondaryStyle}
      />
    );
  };

  return (
    <section aria-labelledby="scoring-actions-title" className="space-y-4 py-2">
      {selectedParticipant ? (
        <p className="rounded-lg bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-900 dark:bg-cyan-500/10 dark:text-cyan-100" aria-live="polite">
          Actions apply to <strong>{selectedPlayerLabel || selectedParticipant.label}</strong>
          {selectedPlayerLabel ? <span className="text-cyan-700 dark:text-cyan-200"> · {selectedParticipant.label}</span> : null}
        </p>
      ) : isDirectRallySport ? (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Tip: Click an on-court player in the lineup above to credit skills like Service Aces, Kills, and Roll Spikes directly.
        </p>
      ) : null}
      {primary.length > 0 ? (
        <div>
          <h2 id="scoring-actions-title" className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">Scoring</h2>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{primary.map((control) => renderControl(control, false))}</div>
        </div>
      ) : null}
      {secondary.length > 0 || detailed.length > 0 ? (
        <div className="border-t border-[var(--border-soft)] pt-3" aria-label="Additional scoring actions">
          {secondary.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{secondary.map((control) => renderControl(control, true))}</div>
          ) : null}
          {detailed.length > 0 ? (
            <button type="button" onClick={onOpenDetailedControls} className="mt-3 min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-main)] transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
              Lineup and substitutions
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
