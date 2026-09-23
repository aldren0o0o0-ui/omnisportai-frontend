import { AlertTriangle, ShieldCheck } from "lucide-react";
import { extractDisciplineRecords, detectSportCategory } from "./teamDrawerUtils";

export const DisciplineSummary = ({
  playerAnalyticsRows = [],
  sportName = "",
}) => {
  const sportCategory = detectSportCategory(sportName);
  const { counters, totalViolations, hasDisciplineData } = extractDisciplineRecords(
    sportCategory,
    playerAnalyticsRows
  );

  if (!hasDisciplineData) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] p-6 text-center">
        <ShieldCheck className="text-emerald-400" size={28} />
        <p className="mt-2 text-xs font-bold text-[var(--text-main)]">
          Clean Discipline Record
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
          No rule violations, fouls, or disciplinary sanctions recorded for this entry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" aria-label="Discipline & Violations">
      {/* Violation Counters Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {counters.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3 text-center"
          >
            <p className="text-lg font-black tabular-nums text-[var(--text-main)]">
              {c.value}
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {c.label}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-[var(--text-muted)] flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={16} />
        <div>
          <p className="font-bold text-[var(--text-main)]">
            Disciplinary Standing
          </p>
          <p className="mt-0.5 text-[11px]">
            Total of {totalViolations} rule-related incident{totalViolations === 1 ? "" : "s"} tracked across official match events.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DisciplineSummary;
