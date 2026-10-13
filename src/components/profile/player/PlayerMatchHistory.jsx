import React from "react";
import { History, Calendar, Swords } from "lucide-react";
import { formatProfileDate, formatOrientedScore } from "../profileUtils";

/**
 * PlayerMatchHistory
 * Renders actual completed matches scoped strictly to the selected intramural.
 * Responsive: compact structured table on desktop, stacked cards on mobile.
 */
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
            className="rounded bg-[var(--surface-soft)] border border-[var(--border-soft)] px-1.5 py-0.5 text-[10px]"
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
            "bg-[var(--surface-soft)] text-[var(--text-muted)] border-[var(--border-soft)]";

          if (isWin) {
            badgeLabel = "WIN";
            resultBadgeStyle = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
          } else if (isLoss) {
            badgeLabel = "LOSS";
            resultBadgeStyle = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
          } else if (isDraw) {
            badgeLabel = "DRAW";
            resultBadgeStyle = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
          } else if (isOngoing) {
            badgeLabel = "LIVE";
            resultBadgeStyle = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse";
          } else if (isWaiting) {
            badgeLabel = "WAITING";
            resultBadgeStyle = "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
          } else if (isScheduled) {
            badgeLabel = "SCHEDULED";
            resultBadgeStyle = "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
          }

          const rawScore = m.score || "-";
          const displayScore = formatOrientedScore(rawScore, res);
          const dateLabel = formatProfileDate(m.date);
          const opponentName = m.opponent || "TBD";
          const myTeamName = m.team || "Participant";
          const roundName = m.round ? `Round ${m.round}` : null;

          return (
            <div
              key={m.match_id || idx}
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3 transition hover:border-[var(--primary)]/30"
              data-testid={`match-card-${m.match_id || idx}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] pb-2 text-[11px] text-[var(--text-muted)]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text-main)]">
                    {m.sport || "Match"}
                  </span>
                  {m.event_name ? (
                    <span className="text-[var(--text-soft)]">
                      · {m.event_name}
                    </span>
                  ) : null}
                  {roundName ? (
                    <span className="rounded bg-[var(--surface-soft)] px-1.5 py-0.2 text-[10px]">
                      {roundName}
                    </span>
                  ) : null}
                </div>
                {dateLabel ? (
                  <span className="flex items-center gap-1 text-[var(--text-soft)]">
                    <Calendar size={11} aria-hidden="true" />
                    <span>{dateLabel}</span>
                  </span>
                ) : null}
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-bold text-[var(--text-main)]" title={myTeamName}>
                      {myTeamName}
                    </span>
                    <span className="text-[10px] text-[var(--text-soft)]">vs</span>
                    <span className="truncate text-xs text-[var(--text-muted)]" title={opponentName}>
                      {opponentName}
                    </span>
                  </div>
                  {/* Player individual stats */}
                  {m.player_stats ? (
                    <div className="mt-1.5" data-testid={`match-player-stats-${m.match_id || idx}`}>
                      {renderPlayerStats(m.player_stats)}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="font-mono text-xs font-bold text-[var(--text-main)]"
                    data-testid={`match-score-${m.match_id || idx}`}
                  >
                    {displayScore}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${resultBadgeStyle}`}
                    data-testid={`match-result-badge-${m.match_id || idx}`}
                  >
                    {badgeLabel}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerMatchHistory;
