import React from "react";
import { Activity, Shield, Calendar, CheckCircle2 } from "lucide-react";

/**
 * FacilitatorSection
 * Operational assignments and officiating responsibilities in the selected intramural.
 */
export const FacilitatorSection = ({
  staffAssignments = [],
  operational = {},
}) => {
  const assignments = Array.isArray(staffAssignments) && staffAssignments.length > 0
    ? staffAssignments
    : Array.isArray(operational?.staff_assignments)
    ? operational.staff_assignments
    : [];

  return (
    <div
      className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 space-y-3"
      data-testid="facilitator-operational-section"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
            Officiating & Facilitation
          </h4>
        </div>
        <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
          Sports Facilitator
        </span>
      </div>

      {assignments.length > 0 ? (
        <div className="space-y-1.5" data-testid="facilitator-assignments-list">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Active Sport Assignments
          </span>
          <div className="space-y-1">
            {assignments.map((asgn, idx) => (
              <div
                key={asgn.assignment_id || idx}
                className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-xs"
                data-testid={`facilitator-row-${asgn.assignment_id || idx}`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-[var(--text-main)] truncate block">
                    {asgn.sport_name || asgn.sport || "Sport Assignment"}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {asgn.role_title || asgn.assignment_type || "Facilitator"}
                    {asgn.tournament_name ? ` · ${asgn.tournament_name}` : ""}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={10} /> Active
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)] text-center py-1">
          No officiating or facilitator assignments in this intramural.
        </p>
      )}
    </div>
  );
};

export default FacilitatorSection;
