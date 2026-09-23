import { Filter } from "lucide-react";

const toCount = (value) => {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
};

const CollapsibleFilterPanel = ({
  title = "Filters",
  activeCount = 0,
  children,
  onClear = null,
  compact = false,
  className = "",
}) => {
  const normalizedCount = toCount(activeCount);

  return (
    <section
      className={`rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] p-3 ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[var(--text-muted)]" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {title}
          </p>
          {normalizedCount > 0 && (
            <span className="rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {normalizedCount}
            </span>
          )}
        </div>
        {onClear && normalizedCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-sm text-xs font-semibold text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--text-main)] motion-reduce:transition-none"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className={compact ? "mt-3 space-y-2" : "mt-3 space-y-3"}>{children}</div>
    </section>
  );
};

export default CollapsibleFilterPanel;
