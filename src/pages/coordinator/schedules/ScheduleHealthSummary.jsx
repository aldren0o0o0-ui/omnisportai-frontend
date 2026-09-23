const CHIP_TONE = {
  rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
  amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
  slate: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-[var(--surface-soft)]/70 dark:text-slate-300",
};

const SummaryChip = ({ label, value, tone = "slate", onClick = null }) => {
  const classes = CHIP_TONE[tone] || CHIP_TONE.slate;
  const sharedClassName = `rounded-xl border px-3 py-2 text-left ${classes} ${onClick ? "transition hover:opacity-90" : ""}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={sharedClassName}>
        <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-lg font-bold">{value}</p>
      </button>
    );
  }
  return (
    <div className={sharedClassName}>
      <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
};

const ScheduleHealthSummary = ({
  summary = null,
  canFinalize = false,
  validForFinalize = false,
  hasBlockingIssues = false,
  validating = false,
  onValidate = null,
  onOpenSection = null,
}) => {
  if (!summary) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-[var(--surface)]/95">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Schedule Validation
            </p>
            <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">Current schedule quality</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Validation has not been run yet.
            </p>
          </div>
          {typeof onValidate === "function" ? (
            <button
              type="button"
              onClick={onValidate}
              disabled={validating}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {validating ? "Validating..." : "Validate Schedule"}
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  const summaryChips = [
    { label: "Missing Slots", value: summary.missing_schedule_slots || 0, tone: "rose", target: "unscheduled-matches" },
    { label: "Venue Conflicts", value: summary.venue_conflicts || 0, tone: "rose", target: "calendar-conflicts" },
    { label: "Team Conflicts", value: summary.team_conflicts || 0, tone: "amber", target: "calendar-conflicts" },
    { label: "Player Conflicts", value: summary.player_conflicts || 0, tone: "amber", target: "calendar-conflicts" },
    { label: "Program Blocks", value: summary.program_block_conflicts || 0, tone: "blue", target: "calendar-conflicts" },
    { label: "Placeholders", value: summary.placeholder_future_rounds || 0, tone: "slate", target: "info-placeholders" },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-[var(--surface)]/95">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Schedule Validation
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">Current schedule quality</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Review schedule quality and readiness.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(canFinalize || validForFinalize) && !hasBlockingIssues ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              Ready to Finalize
            </span>
          ) : (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              Needs Review
            </span>
          )}
          {typeof onValidate === "function" ? (
            <button
              type="button"
              onClick={onValidate}
              disabled={validating}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {validating ? "Validating..." : "Validate Again"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {summaryChips.map((chip) => (
          <SummaryChip
            key={chip.label}
            label={chip.label}
            value={chip.value}
            tone={chip.value > 0 ? chip.tone : "slate"}
            onClick={typeof onOpenSection === "function" ? () => onOpenSection(chip.target) : null}
          />
        ))}
      </div>
    </section>
  );
};

export default ScheduleHealthSummary;
