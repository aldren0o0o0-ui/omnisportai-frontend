import React from "react";
import { Building2, Users, Shield } from "lucide-react";

/**
 * DepartmentSection
 * Department delegation and team administration in the selected intramural.
 */
export const DepartmentSection = ({
  department = {},
  teamManagement = {},
  operational = {},
}) => {
  const dept = department || operational?.department || {};
  const deptName = dept?.name || dept?.department_name || "Department";
  const deptCode = dept?.code || dept?.department_code || null;

  const tm = teamManagement || operational?.team_management || {};
  const teams = Array.isArray(tm?.managed_teams) ? tm.managed_teams : [];
  const teamCount = tm?.managed_team_count ?? teams.length;

  return (
    <div
      className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 space-y-3"
      data-testid="department-manager-section"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-sky-500" aria-hidden="true" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
            Department Administration
          </h4>
        </div>
        <span className="rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-400">
          Department Manager
        </span>
      </div>

      <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[var(--text-main)]">{deptName}</span>
          {deptCode ? (
            <span className="rounded bg-[var(--surface-soft)] border border-[var(--border-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
              {deptCode}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
          {teamCount} registered {teamCount === 1 ? "team" : "teams"} under department delegation.
        </p>
      </div>

      {teams.length > 0 ? (
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Department Teams
          </span>
          <div className="space-y-1">
            {teams.map((t, idx) => (
              <div
                key={t.team_id || idx}
                className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-[var(--text-main)] truncate block">
                    {t.team_name}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {t.sport_name || "Sport"}
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
      ) : null}
    </div>
  );
};

export default DepartmentSection;
