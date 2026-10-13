import React, { useMemo, useState } from "react";
import {
  classifyTimedTeamControls,
  findTimedTeamControl,
  getTimedTeamActionControls,
  getTimedTeamControlType,
  getBasketballActionDisabledReason,
  isTimeoutControl,
  isPlayerActionControl,
  resolvePeriodAdvancePresentation,
} from "./timedTeamActions.js";
import BasketballAnalytics from "./BasketballAnalytics.jsx";
import { buildTeamStats } from "./basketballStatsEngine.js";

const playerLabel = (player) => player?.displayName || player?.name || `Player ${player?.playerId || player?.id || ""}`;
const playerId = (player) => Number(player?.playerId || player?.id || 0);

// ─── Team Scoring Panel ───────────────────────────────────────────────────────
// Renders the player selector + +1/+2/+3 scoring buttons + team actions for one team.
function ParticipantPanel({
  participant,
  score,
  primaryControls,
  teamActionControls = [],
  selectedPlayerId,
  onPlayerChange,
  onAction,
  disabled,
  disabledReason,
  possessionTeamId,
  possessionTeamName,
  substitutionControl,
  substitutionOpen,
  substitution,
  onOpenSubstitution,
  onSubstitutionChange,
  onConfirmSubstitution,
  teamStats,
}) {
  const members = Array.isArray(participant?.members) ? participant.members : [];
  const hasSelectedPlayer = Boolean(selectedPlayerId);

  const isPossessionEstablished = Boolean(
    possessionTeamId !== null &&
    possessionTeamId !== undefined &&
    possessionTeamId !== "" &&
    Number(possessionTeamId) > 0
  );
  const isOffense = isPossessionEstablished && Number(participant?.id) === Number(possessionTeamId);
  const isDefense = isPossessionEstablished && Number(participant?.id) !== Number(possessionTeamId);

  return (
    <section
      className="min-w-0 rounded-2xl bg-[var(--surface-soft)] p-4 sm:p-5"
      aria-label={`${participant?.name || "Participant"} scoring controls`}
    >
      {/* Header: team name + possession indicator + score */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-bold sm:text-lg" title={participant?.name}>
              {participant?.shortName || participant?.name}
            </h2>
            {isOffense && (
              <span
                data-testid={`possession-indicator-${participant?.id}`}
                className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:border-amber-500/40 dark:text-amber-200"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Offense
              </span>
            )}
            {isDefense && (
              <span
                data-testid={`possession-indicator-${participant?.id}`}
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:text-slate-400"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                Defense
              </span>
            )}
          </div>
          {teamStats ? (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)]">
              <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5">
                Fls: <strong className="text-rose-600 dark:text-rose-400">{teamStats.fouls || 0}</strong>
              </span>
              <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5">
                TO: <strong className="text-amber-600 dark:text-amber-400">{teamStats.timeouts || 0}</strong>
              </span>
              <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5">
                Reb: <strong className="text-[var(--text-main)]">{teamStats.rebounds || 0}</strong>
              </span>
              <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5">
                Ast: <strong className="text-[var(--text-main)]">{teamStats.assists || 0}</strong>
              </span>
            </div>
          ) : null}
        </div>
        <span
          className="text-5xl font-black tabular-nums leading-none sm:text-6xl"
          aria-label={`${participant?.name} score ${score}`}
        >
          {score}
        </span>
      </div>

      {/* Player selector */}
      {members.length > 0 ? (
        <fieldset className="mt-3">
          <legend className="flex w-full items-center justify-between gap-2 text-xs font-semibold text-[var(--text-muted)]">
            <span>Select player</span>
            {substitutionControl ? (
              <button
                type="button"
                disabled={disabled || !participant.benchMembers?.length}
                title={
                  !participant.benchMembers?.length
                    ? "No bench players are available for substitution."
                    : "Substitute an active player"
                }
                onClick={onOpenSubstitution}
                className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-bold text-cyan-700 disabled:opacity-45 dark:text-cyan-200"
              >
                {substitutionOpen ? "Cancel" : "Substitution"}
              </button>
            ) : null}
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
                  onClick={() =>
                    substitutionOpen
                      ? onSubstitutionChange({ outPlayerId: id })
                      : onPlayerChange(selected ? "" : id)
                  }
                  className={`min-h-9 rounded-full border px-2.5 text-xs font-semibold transition ${
                    selected
                      ? "border-cyan-500 bg-cyan-500/15 text-cyan-800 dark:text-cyan-100"
                      : "border-[var(--border-soft)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  {playerLabel(member)}
                </button>
              );
            })}
          </div>

          {/* Selected player stat line */}
          {hasSelectedPlayer && teamStats?.playerName?.[selectedPlayerId] ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
              <span className="font-bold text-[var(--text-main)]">
                {teamStats.playerName[selectedPlayerId]}:
              </span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
                {teamStats.playerPts?.[selectedPlayerId] || 0} PTS
              </span>
              <span>·</span>
              <span className="tabular-nums">
                {teamStats.playerRebounds?.[selectedPlayerId] || 0} REB
              </span>
              <span>·</span>
              <span className="tabular-nums">
                {teamStats.playerAssists?.[selectedPlayerId] || 0} AST
              </span>
              <span>·</span>
              <span className="tabular-nums">
                {teamStats.playerSteals?.[selectedPlayerId] || 0} STL
              </span>
              <span>·</span>
              <span className="tabular-nums text-rose-600 dark:text-rose-400">
                {teamStats.playerFouls?.[selectedPlayerId] || 0} PF
              </span>
            </div>
          ) : null}

          {/* Substitution sub-panel */}
          {substitutionOpen ? (
            <div className="mt-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-2.5">
              <p className="text-xs text-[var(--text-muted)]">
                Select the player leaving above, then choose a player from the bench.
              </p>
              <label
                htmlFor={`timed-bench-${participant.id}`}
                className="mt-2 block text-xs font-semibold"
              >
                Player from bench
              </label>
              <select
                id={`timed-bench-${participant.id}`}
                value={substitution.inPlayerId}
                onChange={(event) => onSubstitutionChange({ inPlayerId: event.target.value })}
                className="mt-1 min-h-10 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-sm"
              >
                <option value="">Choose a bench player</option>
                {(participant.benchMembers || []).map((member) => (
                  <option
                    key={`timed-bench-option-${participant.id}-${playerId(member)}`}
                    value={playerId(member)}
                  >
                    {playerLabel(member)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={disabled || !substitution.outPlayerId || !substitution.inPlayerId}
                onClick={onConfirmSubstitution}
                className="mt-2 min-h-10 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white disabled:opacity-45"
              >
                Confirm substitution
              </button>
            </div>
          ) : null}
        </fieldset>
      ) : null}

      {/* Scoring buttons (+1 / +2 / +3) — require a player to be selected & possession check */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {primaryControls.map((control) => {
          const actionDisabledReason = getBasketballActionDisabledReason({
            eventType: control.event_type,
            teamId: participant.id,
            possessionTeamId,
            possessionTeamName,
            hasSelectedPlayer,
            disabled,
            generalDisabledReason: disabledReason,
          });
          const isButtonDisabled = disabled || !hasSelectedPlayer || Boolean(actionDisabledReason);

          return (
            <button
              key={control.id || control.event_type}
              type="button"
              disabled={isButtonDisabled}
              title={actionDisabledReason || (!hasSelectedPlayer ? "Select a player above before scoring" : undefined)}
              aria-label={`Add ${control.points} point${control.points === 1 ? "" : "s"} to ${participant?.shortName || participant?.name}`}
              aria-describedby={disabled && disabledReason ? "timed-team-disabled-reason" : undefined}
              onClick={() => onAction(control, participant.id, selectedPlayerId)}
              className="min-h-10 rounded-lg bg-cyan-600 px-2 text-base font-black text-white shadow-sm transition hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-11"
            >
              {control.quickLabel}
            </button>
          );
        })}
      </div>

      {/* Secondary team actions (Turnover, Steal, Block, Rebound) */}
      {teamActionControls.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5" aria-label={`${participant?.shortName || participant?.name} actions`}>
          {teamActionControls.map((control) => {
            const actionDisabledReason = getBasketballActionDisabledReason({
              eventType: control.event_type,
              teamId: participant.id,
              possessionTeamId,
              possessionTeamName,
              hasSelectedPlayer,
              disabled,
              generalDisabledReason: disabledReason,
            });
            const isButtonDisabled = disabled || !hasSelectedPlayer || Boolean(actionDisabledReason);
            const label = control.label || String(control.event_type).replaceAll("_", " ");
            const isWarn = /(TURNOVER)/.test(control.event_type);

            return (
              <button
                key={`team-action-${participant.id}-${control.id || control.event_type}`}
                type="button"
                disabled={isButtonDisabled}
                title={actionDisabledReason || (!hasSelectedPlayer ? "Select a player above before recording this action" : undefined)}
                aria-label={`${label} for ${participant?.shortName || participant?.name}`}
                onClick={() => onAction(control, participant.id, selectedPlayerId)}
                className={`min-h-9 rounded-lg border px-2.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-45 ${
                  isWarn
                    ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                    : "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Hint when no player is selected */}
      {!hasSelectedPlayer && members.length > 0 && (
        <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
          ↑ Select a player to enable scoring &amp; actions
        </p>
      )}
    </section>
  );
}

// ─── Main Surface ─────────────────────────────────────────────────────────────
export default function TimedTeamSurface({
  participants,
  scores,
  controls,
  clockValue,
  clockRunning,
  periodLabel,
  periodTotal = 4,
  possessionTeamId,
  canSubmit,
  isPending,
  disabledReason,
  onAction,
  onClockAction,
  onUtilityAction,
  substitutionControl,
  onSubstitute,
  // Analytics
  timeline = [],
  currentPeriod = null,
  playerStats = null,
}) {
  const classified = useMemo(() => classifyTimedTeamControls(controls), [controls]);

  const teamIds = useMemo(
    () => [String(participants?.[0]?.id || ""), String(participants?.[1]?.id || "")].filter(Boolean),
    [participants]
  );

  const matchStats = useMemo(
    () => buildTeamStats(timeline || [], teamIds, participants, playerStats),
    [timeline, teamIds, participants, playerStats]
  );

  // Per-team selected player (teamId → playerId string)
  const [selectedPlayers, setSelectedPlayers] = useState({});

  // Substitution state
  const [substitutionTeamId, setSubstitutionTeamId] = useState(null);
  const [substitution, setSubstitution] = useState({ outPlayerId: "", inPlayerId: "" });

  // Clock / period dedicated controls
  const startControl = findTimedTeamControl(classified.utility, /CLOCK_(START|RESUME)/);
  const stopControl = findTimedTeamControl(classified.utility, /CLOCK_(STOP|PAUSE)/);
  const periodControl = findTimedTeamControl(classified.utility, /(PERIOD|QUARTER|HALF)_ADVANCE/);
  const possessionControl = findTimedTeamControl(classified.utility, /POSSESSION/);

  const periodAdvance = useMemo(
    () => resolvePeriodAdvancePresentation({ periodLabel, scores, totalPeriods: periodTotal }),
    [periodLabel, scores, periodTotal]
  );

  // All action controls (secondary / fallback / destructive / utility minus dedicated ones)
  const actionControls = useMemo(() => getTimedTeamActionControls(classified), [classified]);

  const disabled = !canSubmit || isPending;

  // Substitution helpers
  const toggleSubstitution = async (participant) => {
    const isOpen = Number(substitutionTeamId) === Number(participant.id);
    if (isOpen) { setSubstitutionTeamId(null); return; }
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
      const saved = await onSubstitute({
        teamId: participant.id,
        outPlayerId: Number(substitution.outPlayerId),
        inPlayerId: Number(substitution.inPlayerId),
      });
      if (saved !== false) setSubstitutionTeamId(null);
    },
  });

  // Validate selected player IDs against actual member lists
  const validSelectedPlayers = useMemo(() => {
    const next = {};
    for (const participant of participants) {
      const validIds = new Set((participant.members || []).map(playerId));
      const selected = Number(selectedPlayers[participant.id] || 0);
      next[participant.id] = selected && validIds.has(selected) ? String(selected) : "";
    }
    return next;
  }, [participants, selectedPlayers]);

  // Derive which team owns the globally-selected player (for single-button actions)
  const globallySelectedTeamId = useMemo(() => {
    for (const participant of participants) {
      if (validSelectedPlayers[participant.id]) return participant.id;
    }
    return null;
  }, [participants, validSelectedPlayers]);

  const globallySelectedPlayerId = globallySelectedTeamId
    ? validSelectedPlayers[globallySelectedTeamId]
    : "";

  // Split action controls into: timeout (per-team) vs player-action (once) vs other (once)
  const timeoutControls = actionControls.filter(isTimeoutControl);
  const playerActionControls = actionControls.filter(isPlayerActionControl);
  const otherActionControls = actionControls.filter(
    (c) => !isTimeoutControl(c) && !isPlayerActionControl(c)
  );

  const possessionParticipant = participants.find((row) => Number(row.id) === Number(possessionTeamId));
  const possessionTeamName = possessionParticipant?.shortName || possessionParticipant?.name || "";

  return (
    <div className="space-y-3">
      {disabledReason ? (
        <p id="timed-team-disabled-reason" className="sr-only">
          {disabledReason}
        </p>
      ) : null}

      {/* ── Team panels: left team | clock | right team ── */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)] lg:items-stretch">
        {participants[0] ? (
          <ParticipantPanel
            participant={participants[0]}
            score={scores[0]}
            primaryControls={classified.primary}
            teamActionControls={classified.teamActions || []}
            selectedPlayerId={validSelectedPlayers[participants[0].id] || ""}
            onPlayerChange={(value) =>
              setSelectedPlayers((current) => ({ ...current, [participants[0].id]: value }))
            }
            onAction={onAction}
            disabled={disabled}
            disabledReason={disabledReason}
            possessionTeamId={possessionTeamId}
            possessionTeamName={possessionTeamName}
            teamStats={matchStats[String(participants[0].id)]}
            {...panelProps(participants[0])}
          />
        ) : null}

        {/* Clock panel */}
        <section
          className="order-first flex min-h-40 flex-col items-center justify-center rounded-2xl bg-slate-950 px-4 py-4 text-white lg:order-none"
          aria-label="Match clock and period"
        >
          <p className="font-mono text-4xl font-black tabular-nums sm:text-5xl">{clockValue}</p>
          <p className="mt-1 text-sm font-semibold text-slate-300">
            {clockRunning ? "Running" : "Stopped"} · {periodLabel}
          </p>
          <button
            type="button"
            disabled={disabled || (!startControl && !stopControl)}
            onClick={() => onClockAction(clockRunning ? stopControl : startControl)}
            aria-label={clockRunning ? "Stop Match clock" : "Start Match clock"}
            className="mt-3 min-h-11 w-full rounded-xl bg-white px-3 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {clockRunning ? "Stop Clock" : "Start Clock"}
          </button>
          {possessionTeamId ? (
            <p className="mt-2 text-xs text-slate-300">
              Possession:{" "}
              {participants.find((row) => Number(row.id) === Number(possessionTeamId))?.shortName ||
                "Assigned"}
            </p>
          ) : null}
        </section>

        {participants[1] ? (
          <ParticipantPanel
            participant={participants[1]}
            score={scores[1]}
            primaryControls={classified.primary}
            teamActionControls={classified.teamActions || []}
            selectedPlayerId={validSelectedPlayers[participants[1].id] || ""}
            onPlayerChange={(value) =>
              setSelectedPlayers((current) => ({ ...current, [participants[1].id]: value }))
            }
            onAction={onAction}
            disabled={disabled}
            disabledReason={disabledReason}
            possessionTeamId={possessionTeamId}
            possessionTeamName={possessionTeamName}
            teamStats={matchStats[String(participants[1].id)]}
            {...panelProps(participants[1])}
          />
        ) : null}
      </div>

      {/* ── Shared action bar ── */}
      <div
        className="flex flex-wrap gap-2 rounded-xl bg-[var(--surface-soft)] p-3"
        aria-label="Match actions"
      >
        {/* TIMEOUT: one button per team (intentionally duplicated) */}
        {timeoutControls.flatMap((control) =>
          participants.map((participant) => (
            <button
              key={`timeout-${control.id || control.event_type}-${participant.id}`}
              type="button"
              disabled={disabled}
              onClick={() => onUtilityAction(control, participant.id)}
              className="min-h-11 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-45 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
            >
              {control.label || "Timeout"}: {participant.shortName}
            </button>
          ))
        )}

        {/* FOUL / CARD / SUSPENSION: one button, uses the currently selected player */}
        {playerActionControls.map((control) => {
          const destructive = /(CLOCK_RESET|CLOCK_SET)/.test(getTimedTeamControlType(control));
          const hasPlayer = Boolean(globallySelectedPlayerId);
          const selectedParticipant = participants.find(
            (p) => String(p.id) === String(globallySelectedTeamId)
          );
          return (
            <button
              key={control.id || control.event_type}
              type="button"
              disabled={disabled || !hasPlayer}
              title={!hasPlayer ? "Select a player in one of the team panels first" : undefined}
              onClick={() =>
                onAction(control, globallySelectedTeamId, globallySelectedPlayerId)
              }
              className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition disabled:opacity-45 ${
                destructive
                  ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
                  : "border-[var(--border-soft)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              {control.label || String(control.event_type).replaceAll("_", " ")}
              {selectedParticipant ? `: ${selectedParticipant.shortName}` : ""}
            </button>
          );
        })}

        {/* Other controls (VIDEO_REVIEW, CLOCK_RESET, etc.): one button each */}
        {otherActionControls.map((control) => {
          const destructive = /(CLOCK_RESET|CLOCK_SET)/.test(getTimedTeamControlType(control));
          const requiresTeam = control.requires_team || control.requires_player;
          return (
            <button
              key={control.id || control.event_type}
              type="button"
              disabled={disabled}
              onClick={() =>
                requiresTeam
                  ? onUtilityAction(control, participants[0]?.id)
                  : onUtilityAction(control, undefined)
              }
              className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition disabled:opacity-45 ${
                destructive
                  ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
                  : "border-[var(--border-soft)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              {control.label || String(control.event_type).replaceAll("_", " ")}
            </button>
          );
        })}

        {/* Period advance */}
        {periodControl ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onUtilityAction(periodControl)}
            aria-label={periodAdvance.ariaLabel}
            className={periodAdvance.className}
          >
            {periodAdvance.label}
          </button>
        ) : null}

        {/* Possession: one per team */}
        {possessionControl
          ? participants.map((participant) => (
              <button
                key={`possession-${participant.id}`}
                type="button"
                disabled={disabled}
                onClick={() => onUtilityAction(possessionControl, participant.id)}
                className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 text-sm font-semibold transition hover:bg-[var(--surface-muted)] disabled:opacity-45"
              >
                Possession: {participant.shortName}
              </button>
            ))
          : null}
      </div>

      {/* ── Basketball Analytics & Box Score ── */}
      <section className="mt-4" aria-label="Basketball Match Analytics and Box Score">
        <BasketballAnalytics
          participants={participants}
          scores={scores}
          timeline={timeline}
          currentPeriod={currentPeriod}
          playerStats={playerStats}
        />
      </section>
    </div>
  );
}
