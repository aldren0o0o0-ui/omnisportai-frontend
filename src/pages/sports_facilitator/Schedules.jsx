import { useCallback } from "react";
import { Calendar, Eye, Focus } from "lucide-react";
import RoleSchedulePage from "../../components/schedule/RoleSchedulePage";

const toPositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
};

const FacilitatorSchedules = () => {
  const buildScopeFilter = useCallback((dashboard) => {
    const sportIds = Array.isArray(dashboard?.scope?.sport_ids)
      ? dashboard.scope.sport_ids
      : [];
    const scoped = new Set(
      sportIds.map(toPositiveInt).filter((sportId) => sportId > 0)
    );
    return scoped.size > 0 ? scoped : null;
  }, []);

  return (
    <RoleSchedulePage
      pageTitle="Tournament Schedule"
      pageSubtitle="View match times, participants, and venues across the selected intramural."
      pageIcon={Calendar}
      focusModes={[
        { key: "SCOPED", label: "My Sports", icon: Focus },
        { key: "ALL", label: "All Schedules", icon: Eye },
      ]}
      defaultFocusMode="SCOPED"
      buildScopeFilter={buildScopeFilter}
      scopeFilterField="sport_ids"
      showVenuePanel
    />
  );
};

export default FacilitatorSchedules;
