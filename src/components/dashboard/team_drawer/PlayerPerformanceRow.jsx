import { ChevronRight } from "lucide-react";
import { formatMetricBadge } from "./teamDrawerUtils";

export const PlayerPerformanceRow = ({
  player,
  rank,
  primaryConfig,
  maxValue = 1,
  onSelect,
}) => {
  const metrics = player.metrics || {};
  const primaryKey = primaryConfig.key;
  const primaryValue = Number(metrics[primaryKey] || 0);

  // Bar fill calculation: min 6% width for visibility if value > 0
  const percent = maxValue > 0 && primaryValue > 0
    ? Math.max(6, Math.min(100, Math.round((primaryValue / maxValue) * 100)))
    : 0;

  // Secondary metrics (up to 3-4 key attributes)
  const secondaryItems = (primaryConfig.secondary || [])
    .map((code) => formatMetricBadge(code, metrics[code]))
    .filter(Boolean)
    .slice(0, 3);

  const playerName = player.participant_name || player.name || player.display_name || "Player";
  const position = player.position || player.role || null;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(player)}
      className="group w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {/* Top line: Rank, Name, Position, Value */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--surface-muted)] text-[10px] font-black text-[var(--text-muted)] group-hover:bg-blue-500/20 group-hover:text-blue-400">
            {rank}
          </span>
          <span className="truncate text-xs font-bold text-[var(--text-main)]">
            {playerName}
          </span>
          {position ? (
            <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--text-muted)]">
              {position}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-black tabular-nums text-[var(--text-main)]">
            {primaryValue} {primaryConfig.shortLabel}
          </span>
          <ChevronRight size={14} className="text-[var(--text-soft)] transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>

      {/* Horizontal Bar */}
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Secondary metrics subrow */}
      {secondaryItems.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-[var(--text-muted)]">
          {secondaryItems.map((item, idx) => (
            <span key={idx} className="rounded-md bg-[var(--surface)] px-1.5 py-0.5 border border-[var(--border-soft)]">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
};

export default PlayerPerformanceRow;
