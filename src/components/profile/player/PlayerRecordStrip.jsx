import React from "react";

/**
 * PlayerRecordStrip
 * Displays universal competitive records: Matches Played, Wins, Losses, Draws.
 * Scoped strictly to the selected intramural and active sport/event.
 */
export const PlayerRecordStrip = ({
  matches = 0,
  wins = 0,
  losses = 0,
  draws = 0,
  label = "Record Summary",
}) => {
  const hasDraws = Number(draws) > 0;
  const gridCols = hasDraws ? "grid-cols-4" : "grid-cols-3";

  return (
    <div
      className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3 sm:p-4"
      data-testid="player-record-strip"
    >
      <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">
        <span>{label}</span>
      </div>

      <div className={`grid ${gridCols} gap-2 text-center`}>
        {/* Matches Played */}
        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Played
          </span>
          <p
            className="mt-0.5 text-lg font-extrabold text-[var(--text-main)]"
            data-testid="player-record-matches"
          >
            {matches}
          </p>
        </div>

        {/* Wins */}
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Wins
          </span>
          <p
            className="mt-0.5 text-lg font-extrabold text-emerald-600 dark:text-emerald-400"
            data-testid="player-record-wins"
          >
            {wins}
          </p>
        </div>

        {/* Losses */}
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Losses
          </span>
          <p
            className="mt-0.5 text-lg font-extrabold text-rose-600 dark:text-rose-400"
            data-testid="player-record-losses"
          >
            {losses}
          </p>
        </div>

        {/* Draws (if applicable) */}
        {hasDraws ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Draws
            </span>
            <p
              className="mt-0.5 text-lg font-extrabold text-amber-600 dark:text-amber-400"
              data-testid="player-record-draws"
            >
              {draws}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PlayerRecordStrip;
