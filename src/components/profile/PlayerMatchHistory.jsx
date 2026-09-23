import React from "react";
import { History, Calendar, Swords } from "lucide-react";
import { formatProfileDate, formatOrientedScore } from "./profileUtils";

export const PlayerMatchHistory = ({
  matchHistory = [],
  title = "Match History",
}) => {
  if (!Array.isArray(matchHistory) || matchHistory.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] p-5 text-center"
        data-testid="player-matches-empty"
      >
        <History className="mx-auto h-6 w-6 text-[var(--text-soft)]" aria-hidden="true" />
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          No match history recorded for this sport.
        </p>
      </div>
    );
  }

  // Format player individual stats dynamically without assuming only points/assists
  const renderPlayerStats = (stats) => {
    if (!stats || typeof stats !== "object") return null;

    const statChips = [];

    // Points / Scoring
    if (stats.points !== undefined && stats.points !== null) {
      statChips.push(`${stats.points} pts`);
    }

    // Assists / Playmaking
    if (stats.assists !== undefined && stats.assists !== null) {
      statChips.push(`${stats.assists} ast`);
    }

    // Fouls / Penalties
    if (stats.fouls !== undefined && stats.fouls !== null && stats.fouls > 0) {
      statChips.push(`${stats.fouls} fls`);
    }

    // Dynamic additional stats if present in backend payload
    for (const [key, val] of Object.entries(stats)) {
      if (
        !["points", "assists", "fouls", "has_stats"].includes(key) &&
        val !== null &&
        val !== undefined
      ) {
        const shortKey = key.replace(/_/g, " ");
        statChips.push(`${val} ${shortKey}`);
      }
    }

    if (statChips.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-[var(--text-main)]">
        {statChips.map((chip, i) => (
          <span
            key={i}
            className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5"
          >
            {chip}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-2.5" data-testid="player-matches-container">
      {title ? (
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {title}
          </h4>
          <span className="text-xs text-[var(--text-muted)]">
            {matchHistory.length} {matchHistory.length === 1 ? "match" : "matches"}
          </span>
        </div>
      ) : null}

      <div className="space-y-2">
        {matchHistory.map((m, idx) => {
          const res = String(m.result || "PENDING").toUpperCase();
          const status = String(m.status || "").toUpperCase();
          const isWin = res === "WIN";
          const isLoss = res === "LOSS";
          const isDraw = res === "DRAW";
          const isOngoing = ["ONGOING", "LIVE", "IN_PROGRESS"].includes(status);
          const isWaiting = ["WAITING_OPPONENT", "WAITING_RESET"].includes(status);
          const isScheduled =
            ["SCHEDULED", "UPCOMING", "NOT_STARTED"].includes(status) ||
            (res === "PENDING" && !isOngoing && !isWaiting);

          let badgeLabel = res;
          let resultBadgeStyle =
            "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border-soft)]";

          if (isWin) {
            resultBadgeStyle =
              "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400";
          } else if (isLoss) {
            resultBadgeStyle =
              "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400";
          } else if (isDraw) {
            resultBadgeStyle =
              "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400";
          } else if (isOngoing) {
            badgeLabel = "LIVE";
            resultBadgeStyle =
              "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400 font-extrabold";
          } else if (isWaiting) {
            badgeLabel = "WAITING";
            resultBadgeStyle =
              "bg-[var(--surface-muted)] text-[var(--text-soft)] border-[var(--border-soft)]";
          } else if (isScheduled) {
            badgeLabel = "SCHEDULED";
            resultBadgeStyle =
              "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400";
          }

          const opponent = m.opponent || "Opponent unavailable";
          const score = m.score || null;
          const tournamentLabel = m.tournament || null;
          const sportLabel = m.sport || m.sport_name || null;
          const eventLabel = m.event_name || null;
          const dateFormatted = formatProfileDate(m.date);
          const stats = m.player_stats || null;

          return (
            <div
              key={m.match_id || idx}
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3 transition hover:border-[var(--primary)]/30"
              data-testid={`player-match-item-${m.match_id || idx}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Swords size={14} className="shrink-0 text-[var(--text-soft)]" aria-hidden="true" />
                    <span
                      className="truncate text-xs font-bold text-[var(--text-main)]"
                      title={opponent}
                    >
                      vs {opponent}
                    </span>
                  </div>

                  {tournamentLabel || sportLabel || eventLabel ? (
                    <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                      {[tournamentLabel, sportLabel, eventLabel].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${resultBadgeStyle}`}
                    data-testid="match-result-badge"
                  >
                    {badgeLabel}
                  </span>
                  {score ? (
                    <span className="text-xs font-extrabold text-[var(--text-main)] font-mono">
                      {score}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Player contribution or date footer */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-soft)] pt-2 text-[11px] text-[var(--text-muted)]">
                {dateFormatted || m.date ? (
                  <span className="flex items-center gap-1">
                    <Calendar size={11} aria-hidden="true" /> {dateFormatted || m.date}
                  </span>
                ) : (
                  <span />
                )}

                {renderPlayerStats(stats)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerMatchHistory;
