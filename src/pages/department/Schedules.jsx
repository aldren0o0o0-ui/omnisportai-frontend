import { useCallback } from "react";
import { Calendar, Eye, Focus } from "lucide-react";
import RoleSchedulePage from "../../components/schedule/RoleSchedulePage";

const toPositiveInt = (v) => {
  const p = Number(v);
  return Number.isFinite(p) && p > 0 ? Math.trunc(p) : 0;
};

const DepartmentSchedules = () => {
  // Department managers filter by department_ids → need to match team_ids
  // belonging to their department. The backend dashboard.schedule.events are
  // already scoped, so "My Schedule" uses those scoped team_ids.
  const buildScopeFilter = useCallback((dashboard) => {
    // Use team_ids derived from department scope — the backend builds these
    // from department_ids already. We also collect team_ids from scoped events.
    const scopeTeamIds = Array.isArray(dashboard?.scope?.team_ids)
      ? dashboard.scope.team_ids
      : [];

    // Also extract team_ids from the scoped schedule events (backend pre-filtered)
    const eventTeamIds = new Set();
    const events = Array.isArray(dashboard?.schedule?.events)
      ? dashboard.schedule.events
      : [];
    events.forEach((event) => {
      (Array.isArray(event?.team_ids) ? event.team_ids : []).forEach((id) => {
        const parsed = toPositiveInt(id);
        if (parsed > 0) eventTeamIds.add(parsed);
      });
    });

    // Merge both sources
    const combined = new Set([
      ...scopeTeamIds.map((id) => toPositiveInt(id)).filter((id) => id > 0),
      ...eventTeamIds,
    ]);
    return combined.size > 0 ? combined : null;
  }, []);

  return (
    <RoleSchedulePage
      pageTitle="Department Schedule"
      pageSubtitle="View tournament match schedules for your department's teams and sports."
      pageIcon={Calendar}
      focusModes={[
        { key: "SCOPED", label: "My Schedule", icon: Focus },
        { key: "ALL", label: "All Schedules", icon: Eye },
      ]}
      defaultFocusMode="SCOPED"
      buildScopeFilter={buildScopeFilter}
      scopeFilterField="team_ids"
      showVenuePanel={true}
      readOnlyNote="Department view. Shows matches for your department's teams by default. Use 'All Schedules' to view tournament-wide matches."
    />
  );
};

export default DepartmentSchedules;
