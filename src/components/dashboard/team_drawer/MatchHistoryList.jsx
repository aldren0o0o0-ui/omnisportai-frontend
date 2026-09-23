import { Calendar, CheckCircle2, Trophy, XCircle } from "lucide-react";
import { formatMatchHistoryItem } from "./teamDrawerUtils";

export const MatchHistoryList = ({
  matches = [],
  context = {},
}) => {
  const formattedMatches = matches.map((m) => formatMatchHistoryItem(m, context));

  if (formattedMatches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-soft)] p-6 text-center text-xs text-[var(--text-muted)]">
        No recorded match fixtures or results yet.
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label="Match History">
      {formattedMatches.map((match, idx) => {
        const isWin = match.outcome === "WIN";
        const isLoss = match.outcome === "LOSS";
        const isCompleted = ["WIN", "LOSS", "DRAW"].includes(match.outcome);

        return (
          <div
            key={match.id || idx}
            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3 transition hover:border-[var(--border-strong)]"
          >
            {/* Left: Opponent & Stage */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[var(--text-muted)]">vs</span>
                <p className="truncate text-xs font-bold text-[var(--text-main)]">
                  {match.opponentName}
                </p>
                {match.opponentDepartment ? (
                  <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.2 text-[9px] font-semibold text-[var(--text-muted)]">
                    {match.opponentDepartment}
                  </span>
                ) : null}
              </div>

              <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                {match.date ? <span>{match.date}</span> : null}
                {match.stage ? (
                  <>
                    <span>•</span>
                    <span className="truncate">{match.stage}</span>
                  </>
                ) : null}
              </div>
            </div>

            {/* Right: Outcome badge & Score */}
            <div className="flex items-center gap-2.5 shrink-0">
              {match.scoreDisplay ? (
                <span className="font-mono text-xs font-black tabular-nums text-[var(--text-main)]">
                  {match.scoreDisplay}
                </span>
              ) : null}

              {isCompleted ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                    isWin
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : isLoss
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      : "bg-slate-500/10 text-slate-300 border border-slate-500/20"
                  }`}
                >
                  {isWin ? "Win" : isLoss ? "Loss" : "Draw"}
                </span>
              ) : (
                <span className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                  {match.status || "Scheduled"}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MatchHistoryList;
