import React from "react";
import { Compass, Shield, CheckCircle2 } from "lucide-react";

/**
 * CoordinatorSection
 * Sports Coordinator institutional governance and intramural tournament oversight.
 */
export const CoordinatorSection = ({
  operational = {},
  roles = [],
}) => {
  return (
    <div
      className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 space-y-3"
      data-testid="coordinator-management-section"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-purple-500" aria-hidden="true" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
            Tournament Coordination & Governance
          </h4>
        </div>
        <span className="rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[11px] font-bold text-purple-600 dark:text-purple-400">
          Sports Coordinator
        </span>
      </div>

      <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-3 text-xs space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-purple-500" />
          <span className="font-bold text-[var(--text-main)]">
            Institutional Oversight
          </span>
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">
          Responsible for tournament rule governance, bracket management, venue scheduling, and sports administration across all intramural programs.
        </p>
      </div>
    </div>
  );
};

export default CoordinatorSection;
