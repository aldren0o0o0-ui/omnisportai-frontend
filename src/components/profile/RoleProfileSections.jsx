import React from "react";
import {
  Users,
  Briefcase,
  Activity,
  Building,
  Calendar,
  Shield,
  Compass,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatProfileDate } from "./profileUtils";

/**
 * Compact recent audit/operational activity list.
 */
export const RecentActivityList = ({ activities = [], maxItems = 4 }) => {
  if (!Array.isArray(activities) || activities.length === 0) return null;

  const items = activities.slice(0, maxItems);

  return (
    <div className="space-y-1.5 pt-2 border-t border-[var(--border-soft)]" data-testid="recent-activity-list">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        <Clock size={12} aria-hidden="true" />
        <span>Recent Operational Activity</span>
      </div>
      <div className="space-y-1">
        {items.map((act, idx) => {
          const actionLabel = (act.action || "ACTIVITY").replace(/_/g, " ");
          const dateLabel = formatProfileDate(act.created_at);

          return (
            <div
              key={act.id || idx}
              className="flex items-start justify-between gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-2.5 py-1.5 text-xs"
              data-testid={`activity-item-${act.id || idx}`}
            >
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-[var(--text-main)] truncate block">
                  {actionLabel}
                </span>
                {act.reason ? (
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    {act.reason}
                  </p>
                ) : null}
              </div>
              {dateLabel ? (
                <span className="text-[10px] text-[var(--text-soft)] shrink-0">
                  {dateLabel}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Coach Profile Experience.
 * Uses only backend data from team_management and operational activity.
 * Never calculates team wins/losses or aggregate points in React.
 */
export const CoachSection = ({
  teamManagement = {},
  recentActivity = [],
}) => {
  const count = teamManagement?.managed_team_count ?? 0;
  const rosterCount = teamManagement?.managed_roster_count ?? 0;
  const teams = Array.isArray(teamManagement?.managed_teams) ? teamManagement.managed_teams : [];

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
            Roster Athletes
          </span>
          <p className="mt-0.5 text-base font-extrabold text-[var(--text-main)]" data-testid="coach-roster-count">
            {rosterCount}
          </p>
        </div>
      </div>

      {teams.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-semibold text-[var(--text-muted)]">
            Assigned Team Rosters
          </span>
          <div className="space-y-1">
            {teams.map((t, idx) => (
              <div
                key={t.id || t.team_id || idx}
                className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-2.5 py-1.5 text-xs"
                data-testid={`coach-team-item-${t.id || t.team_id || idx}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Shield size={13} className="text-amber-500 shrink-0" aria-hidden="true" />
                  <span className="font-semibold text-[var(--text-main)] truncate">
                    {t.name || t.team_name || `Team #${t.id || t.team_id || idx + 1}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[11px] text-[var(--text-muted)]">
                  {t.sport ? <span>{t.sport}</span> : null}
                  {t.roster_count !== undefined ? (
                    <span className="font-medium text-[var(--text-soft)]">
                      · {t.roster_count} athletes
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p
          className="text-xs text-[var(--text-muted)] italic"
          data-testid="coach-empty-management"
        >
          No active team rosters currently assigned under coach management.
        </p>
      )}

      {/* Operational recent activity if present */}
      <RecentActivityList activities={recentActivity} />
    </div>
  );
};

/**
 * Sports Facilitator Experience.
 * Uses backend staff_assignments and operational activity.
 * Never fabricates matches officiated, completion percentages, or venue utilization.
 */
export const StaffSection = ({
  staffAssignments = [],
  recentActivity = [],
  title = "Sports Facilitator Operations",
}) => {
  const assignments = Array.isArray(staffAssignments) ? staffAssignments : [];

  return (
    <div
      className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 space-y-3"
      data-testid="staff-operations-section"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-500" aria-hidden="true" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
            {title}
          </h4>
        </div>
        <span className="rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[11px] font-bold text-purple-600 dark:text-purple-400">
          Facilitator
        </span>
      </div>

      {assignments.length > 0 ? (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-[var(--text-muted)]">
            Active Staff & Field Assignments
          </span>
          <div className="space-y-1">
            {assignments.map((assign, idx) => {
              const assignedDate = formatProfileDate(assign.assigned_at);

              return (
                <div
                  key={assign.id || idx}
                  className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-xs"
                  data-testid={`staff-assignment-item-${idx}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--text-main)] truncate">
                      {assign.role_name || assign.role || "Operational Staff"}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      {[assign.sport, assign.tournament_name || assign.tournament]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                      {assign.status || "Active"}
                    </span>
                    {assignedDate ? (
                      <span className="text-[10px] text-[var(--text-soft)]">
                        {assignedDate}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p
          className="text-xs text-[var(--text-muted)] italic"
          data-testid="facilitator-empty-assignments"
        >
          No active tournament operational assignments recorded.
        </p>
      )}

      {/* Operational recent activity if present */}
      <RecentActivityList activities={recentActivity} />
    </div>
  );
};

/**
 * Department Manager Experience.
 * Uses department identity and participation delegation.
 * Never calculates championship points or medal tables in React.
 */
export const DepartmentManagerSection = ({
  department = {},
  departmentName = null,
  participation = [],
  recentActivity = [],
}) => {
  const deptName = departmentName || department?.name || "Department";
  const deptEntries = Array.isArray(participation) ? participation : [];

  return (
    <div
      className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 space-y-3"
      data-testid="dept-manager-section"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-teal-500" aria-hidden="true" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
            Department Delegation
          </h4>
        </div>
        <span className="rounded-md border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-[11px] font-bold text-teal-600 dark:text-teal-400">
          Dept. Manager
        </span>
      </div>

      <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-3 text-xs space-y-1">
        <p className="text-[var(--text-main)]">
          Official representative for <strong className="text-[var(--primary)]">{deptName}</strong>.
        </p>
        <p className="text-[11px] text-[var(--text-muted)]">
          Department standings and official medals are finalized and awarded across tournament events by tournament officials.
        </p>
      </div>

      {deptEntries.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-semibold text-[var(--text-muted)]">
            Registered Delegation Entries ({deptEntries.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {deptEntries.slice(0, 6).map((item, idx) => (
              <span
                key={item.entry_id || idx}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text-main)] font-medium"
              >
                <Shield size={11} className="text-teal-500" aria-hidden="true" />
                <span>{item.entry_name || item.team || item.sport}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Operational recent activity if present */}
      <RecentActivityList activities={recentActivity} />
    </div>
  );
};

/**
 * Sports Coordinator Experience.
 * Intentionally restrained. Displays general coordination oversight.
 * Never duplicates coordinator dashboards or embeds live scoreboards/standings.
 */
export const CoordinatorSection = ({
  staffAssignments = [],
  recentActivity = [],
}) => {
  const assignments = Array.isArray(staffAssignments) ? staffAssignments : [];

  return (
    <div
      className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 space-y-3"
      data-testid="coordinator-oversight-section"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-indigo-500" aria-hidden="true" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
            Tournament Coordination
          </h4>
        </div>
        <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
          Coordinator
        </span>
      </div>

      <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-3 text-xs space-y-1">
        <div className="flex items-center gap-2 text-[var(--text-main)] font-semibold">
          <CheckCircle2 size={14} className="text-indigo-500" aria-hidden="true" />
          <span>Active Tournament Governance</span>
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">
          Oversees tournament schedules, bracket lifecycles, and institutional rule enforcement.
        </p>
      </div>

      {assignments.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-semibold text-[var(--text-muted)]">
            Direct Coordination Assignments
          </span>
          <div className="space-y-1">
            {assignments.map((assign, idx) => (
              <div
                key={assign.id || idx}
                className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-2.5 py-1.5 text-xs"
              >
                <span className="font-semibold text-[var(--text-main)]">
                  {assign.role_name || assign.role || "Tournament Coordinator"}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-medium">
                  {assign.sport || "All Sports"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Operational recent activity if present */}
      <RecentActivityList activities={recentActivity} />
    </div>
  );
};

/**
 * Pure Viewer / Community Member Profile.
 * Strictly conceals operational data, private email, student ID, and administrative statistics.
 */
export const ViewerMinimalSection = ({ publicProfile = {}, user = {} }) => {
  const headline =
    publicProfile?.headline ||
    user?.bio ||
    "Registered participant in the OmniSport AI athletic community.";

  return (
    <div
      className="rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] p-6 text-center space-y-2"
      data-testid="viewer-minimal-section"
    >
      <Users className="mx-auto h-7 w-7 text-[var(--text-soft)]" aria-hidden="true" />
      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
        Community Participant
      </h4>
      <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
        "{headline}"
      </p>
      <p className="text-[10px] text-[var(--text-soft)] pt-1">
        Public community member profile.
      </p>
    </div>
  );
};
