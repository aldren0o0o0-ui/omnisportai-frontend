import React, { useMemo, useState } from "react";
import { classifyTimedTeamControls, findTimedTeamControl, getTimedTeamActionControls, getTimedTeamControlType } from "./timedTeamActions.js";

const playerLabel = (player) => player?.displayName || player?.name || `Player ${player?.playerId || player?.id || ""}`;
const playerId = (player) => Number(player?.playerId || player?.id || 0);

function ParticipantPanel({ participant, score, controls, selectedPlayerId, onPlayerChange, onAction, disabled, disabledReason, substitutionControl, substitutionOpen, substitution, onOpenSubstitution, onSubstitutionChange, onConfirmSubstitution }) {
  const members = Array.isArray(participant?.members) ? participant.members : [];
  return (
    <section className="min-w-0 rounded-2xl bg-[var(--surface-soft)] p-4 sm:p-5" aria-label={`${participant?.name || "Participant"} scoring controls`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="truncate text-base font-bold sm:text-lg" title={participant?.name}>{participant?.shortName || participant?.name}</h2>
        <span className="text-5xl font-black tabular-nums leading-none sm:text-6xl" aria-label={`${participant?.name} score ${score}`}>{score}</span>
      </div>
      {members.length > 0 ? (
        <fieldset className="mt-3">
          <legend className="flex w-full items-center justify-between gap-2 text-xs font-semibold text-[var(--text-muted)]">
            <span>Players on court</span>
            {substitutionControl ? <button type="button" disabled={disabled || !participant.benchMembers?.length} title={!participant.benchMembers?.length ? "No bench players are available for substitution." : "Substitute an active player"} onClick={onOpenSubstitution} className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-bold text-cyan-700 disabled:opacity-45 dark:text-cyan-200">{substitutionOpen ? "Cancel" : "Substitution"}</button> : null}
          </legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {members.slice(0, 5).map((member) => {
              const id = String(playerId(member));
              const selected = substitutionOpen
                ? id === String(substitution.outPlayerId || "")
                : id === String(selectedPlayerId || "");
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => substitutionOpen ? onSubstitutionChange({ outPlayerId: id }) : onPlayerChange(selected ? "" : id)}
                  className={`min-h-9 rounded-full border px-2.5 text-xs font-semibold transition ${selected ? "border-cyan-500 bg-cyan-500/15 text-cyan-800 dark:text-cyan-100" : "border-[var(--border-soft)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"}`}
                >
                  {playerLabel(member)}
                </button>
              );
            })}
          </div>
          {substitutionOpen ? <div className="mt-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-2.5">
            <p className="text-xs text-[var(--text-muted)]">Select the player leaving above, then choose a player from the bench.</p>
            <label htmlFor={`timed-bench-${participant.id}`} className="mt-2 block text-xs font-semibold">Player from bench</label>
            <select id={`timed-bench-${participant.id}`} value={substitution.inPlayerId} onChange={(event) => onSubstitutionChange({ inPlayerId: event.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-sm">
              <option value="">Choose a bench player</option>
              {(participant.benchMembers || []).map((member) => <option key={`timed-bench-option-${participant.id}-${playerId(member)}`} value={playerId(member)}>{playerLabel(member)}</option>)}
            </select>
            <button type="button" disabled={disabled || !substitution.outPlayerId || !substitution.inPlayerId} onClick={onConfirmSubstitution} className="mt-2 min-h-10 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white disabled:opacity-45">Confirm substitution</button>
          </div> : null}
        </fieldset>
      ) : null}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {controls.map((control) => (
          <button
            key={control.id || control.event_type}
            type="button"
            disabled={disabled || (control.requires_player && !selectedPlayerId)}
            aria-label={`Add ${control.points} point${control.points === 1 ? "" : "s"} to ${participant?.shortName || participant?.name}`}
            aria-describedby={disabled && disabledReason ? "timed-team-disabled-reason" : undefined}
            onClick={() => onAction(control, participant.id, selectedPlayerId)}
            className="min-h-10 rounded-lg bg-cyan-600 px-2 text-base font-black text-white shadow-sm transition hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-11"
          >
            {control.quickLabel}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function TimedTeamSurface({
  participants,
  scores,
  controls,
  clockValue,
  clockRunning,
  periodLabel,
  possessionTeamId,
  canSubmit,
  isPending,
  disabledReason,
  onAction,
  onClockAction,
  onUtilityAction,
  substitutionControl,
  onSubstitute,
}) {
  const classified = useMemo(() => classifyTimedTeamControls(controls), [controls]);
  const [selectedPlayers, setSelectedPlayers] = useState({});
  const [substitutionTeamId, setSubstitutionTeamId] = useState(null);
  const [substitution, setSubstitution] = useState({ outPlayerId: "", inPlayerId: "" });
  const startControl = findTimedTeamControl(classified.utility, /CLOCK_(START|RESUME)/);
  const stopControl = findTimedTeamControl(classified.utility, /CLOCK_(STOP|PAUSE)/);
  const periodControl = findTimedTeamControl(classified.utility, /(PERIOD|QUARTER|HALF)_ADVANCE/);
  const possessionControl = findTimedTeamControl(classified.utility, /POSSESSION/);
  const actionControls = useMemo(() => getTimedTeamActionControls(classified), [classified]);
  const disabled = !canSubmit || isPending;
  const toggleSubstitution = async (participant) => {
    const isOpen = Number(substitutionTeamId) === Number(participant.id);
    if (isOpen) {
      setSubstitutionTeamId(null);
      return;
    }
    if (clockRunning) {
      if (!stopControl) return;
      const stopped = await onClockAction(stopControl);
      if (stopped === false) return;
    }
    setSubstitutionTeamId(Number(participant.id));
    setSubstitution({ outPlayerId: "", inPlayerId: "" });
  };
  const panelProps = (participant) => ({
    substitutionControl,
    substitutionOpen: Number(substitutionTeamId) === Number(participant.id),
    substitution,
    onOpenSubstitution: () => toggleSubstitution(participant),
    onSubstitutionChange: (change) => setSubstitution((current) => ({ ...current, ...change })),
    onConfirmSubstitution: async () => {
      const saved = await onSubstitute({ teamId: participant.id, outPlayerId: Number(substitution.outPlayerId), inPlayerId: Number(substitution.inPlayerId) });
      if (saved !== false) setSubstitutionTeamId(null);
    },
  });
  const validSelectedPlayers = useMemo(() => {
    const next = {};
    for (const participant of participants) {
      const validIds = new Set((participant.members || []).map(playerId));
      const selected = Number(selectedPlayers[participant.id] || 0);
      next[participant.id] = selected && validIds.has(selected) ? String(selected) : "";
    }
    return next;
  }, [participants, selectedPlayers]);

  return (
    <div className="space-y-3">
      {disabledReason ? <p id="timed-team-disabled-reason" className="sr-only">{disabledReason}</p> : null}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)] lg:items-stretch">
        {participants[0] ? <ParticipantPanel participant={participants[0]} score={scores[0]} controls={classified.primary} selectedPlayerId={validSelectedPlayers[participants[0].id] || ""} onPlayerChange={(value) => setSelectedPlayers((current) => ({ ...current, [participants[0].id]: value }))} onAction={onAction} disabled={disabled} disabledReason={disabledReason} {...panelProps(participants[0])} /> : null}
        <section className="order-first flex min-h-40 flex-col items-center justify-center rounded-2xl bg-slate-950 px-4 py-4 text-white lg:order-none" aria-label="Match clock and period">
          <p className="font-mono text-4xl font-black tabular-nums sm:text-5xl">{clockValue}</p>
          <p className="mt-1 text-sm font-semibold text-slate-300">{clockRunning ? "Running" : "Stopped"} · {periodLabel}</p>
          <button type="button" disabled={disabled || (!startControl && !stopControl)} onClick={() => onClockAction(clockRunning ? stopControl : startControl)} aria-label={clockRunning ? "Stop Match clock" : "Start Match clock"} className="mt-3 min-h-11 w-full rounded-xl bg-white px-3 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-45">
            {clockRunning ? "Stop Clock" : "Start Clock"}
          </button>
          {possessionTeamId ? <p className="mt-2 text-xs text-slate-300">Possession: {participants.find((row) => Number(row.id) === Number(possessionTeamId))?.shortName || "Assigned"}</p> : null}
        </section>
        {participants[1] ? <ParticipantPanel participant={participants[1]} score={scores[1]} controls={classified.primary} selectedPlayerId={validSelectedPlayers[participants[1].id] || ""} onPlayerChange={(value) => setSelectedPlayers((current) => ({ ...current, [participants[1].id]: value }))} onAction={onAction} disabled={disabled} disabledReason={disabledReason} {...panelProps(participants[1])} /> : null}
      </div>
      <div className="flex flex-wrap gap-2 rounded-xl bg-[var(--surface-soft)] p-3" aria-label="Match actions">
        {actionControls.flatMap((control) => {
          const targets = control.requires_team || control.requires_player ? participants : [null];
          const destructive = /(CLOCK_RESET|CLOCK_SET)/.test(getTimedTeamControlType(control));
          return targets.map((participant) => (
            <button
              key={`${control.id || control.event_type}-${participant?.id || "match"}`}
              type="button"
              disabled={disabled || (control.requires_player && !validSelectedPlayers[participant?.id])}
              onClick={() => control.requires_player
                ? onAction(control, participant?.id, validSelectedPlayers[participant?.id])
                : onUtilityAction(control, participant?.id)}
              className={`min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:opacity-45 ${destructive ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200" : "border-[var(--border-soft)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"}`}
            >
              {control.label || String(control.event_type).replaceAll("_", " ")}{participant ? `: ${participant.shortName}` : ""}
            </button>
          ));
        })}
        {periodControl ? <button type="button" disabled={disabled} onClick={() => onUtilityAction(periodControl)} className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 text-sm font-semibold hover:bg-[var(--surface-muted)] disabled:opacity-45">Next {periodLabel.replace(/\s+\d+$/, "")}</button> : null}
        {possessionControl ? participants.map((participant) => <button key={`possession-${participant.id}`} type="button" disabled={disabled} onClick={() => onUtilityAction(possessionControl, participant.id)} className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 text-sm font-semibold hover:bg-[var(--surface-muted)] disabled:opacity-45">Possession: {participant.shortName}</button>) : null}
      </div>
    </div>
  );
}
