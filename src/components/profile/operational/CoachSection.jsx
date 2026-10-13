import React from "react";
import { Briefcase, Users, Shield } from "lucide-react";

/**
 * CoachSection
 * Concise operational coaching information for the selected intramural:
 * Managed teams, roster count, and team details.
 */
export const CoachSection = ({
  teamManagement = {},
  operational = {},
}) => {
  const tm = teamManagement || operational?.team_management || {};
  const count = tm?.managed_team_count ?? 0;
  const rosterCount = tm?.managed_roster_count ?? 0;
  const teams = Array.isArray(tm?.managed_teams) ? tm.managed_teams : [];

  return (
    <div
      className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 space-y-3"
      data-testid="coach-management-section"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-amber-500" aria-hidden="true" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
            Team Management & Coaching
          </h4>
        </div>
        <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
          Coach
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center" data-testid="coach-summary-tiles">
        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Managed Teams
          </span>
          <p className="mt-0.5 text-base font-extrabold text-[var(--text-main)]" data-testid="coach-managed-team-count">
            {count}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Total Rostered
          </span>
          <p className="mt-0.5 text-base font-extrabold text-[var(--text-main)]" data-testid="coach-managed-roster-count">
            {rosterCount}
          </p>
        </div>
      </div>

      {teams.length > 0 ? (
        <div className="space-y-1.5" data-testid="coach-managed-teams-list">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Assigned Rosters
          </span>
          <div className="space-y-1">
            {teams.map((t, idx) => (
              <div
                key={t.team_id || idx}
                className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-xs"
                data-testid={`coach-team-row-${t.team_id || idx}`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-[var(--text-main)] truncate block">
                    {t.team_name}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {t.sport_name || "Sport"}
                    {t.department_name ? ` · ${t.department_name}` : ""}
                  </span>
                </div>
                {typeof t.roster_count === "number" ? (
                  <span className="inline-flex items-center gap-1 rounded bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                    <Users size={11} /> {t.roster_count}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)] text-center py-1">
          No teams currently under direct management in this intramural.
        </p>
      )}
    </div>
  );
};

export default CoachSection;
