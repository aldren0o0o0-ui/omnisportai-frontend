import { useCallback } from "react";
import { Calendar, Eye, Focus } from "lucide-react";
import RoleSchedulePage from "../../components/schedule/RoleSchedulePage";
import useTournamentAccess from "../../hooks/useTournamentAccess";

const toPositiveInt = (v) => {
  const p = Number(v);
  return Number.isFinite(p) && p > 0 ? Math.trunc(p) : 0;
};

const ViewerSchedules = () => {
  const tournamentAccess = useTournamentAccess();
  const hasPlayerTeamContext = tournamentAccess.roleContexts.some(
    (context) =>
      String(context?.role || "").toLowerCase() === "player" &&
      toPositiveInt(context?.team_id) > 0
  );
  const isPlayer =
    tournamentAccess.hasSelectedTournament &&
    !tournamentAccess.loading &&
    (tournamentAccess.isPlayerMode || hasPlayerTeamContext);
  const buildScopeFilter = useCallback((dashboard) => {
    const dashboardIsPlayer = String(dashboard?.dashboard_type || "").toUpperCase() === "PLAYER";
    if (!isPlayer && !dashboardIsPlayer) return null;
    const dashboardTeamIds = Array.isArray(dashboard?.scope?.team_ids)
      ? dashboard.scope.team_ids
      : [];
    const contextTeamIds = tournamentAccess.roleContexts
      .filter((context) => context?.role === "player")
      .map((context) => context?.team_id);
    const set = new Set(
      [...dashboardTeamIds, ...contextTeamIds]
        .map((id) => toPositiveInt(id))
        .filter((id) => id > 0)
    );
    return set.size > 0 ? set : null;
  }, [isPlayer, tournamentAccess.roleContexts]);

  const resolveFocusModes = useCallback((dashboard) => {
    const dashboardIsPlayer = String(dashboard?.dashboard_type || "").toUpperCase() === "PLAYER";
    if (!isPlayer && !dashboardIsPlayer) return null;
    return [
      { key: "SCOPED", label: "My Team", icon: Focus },
      { key: "ALL", label: "All Schedules", icon: Eye },
    ];
  }, [isPlayer]);

  const resolveDefaultFocusMode = useCallback(
    (dashboard) => (
      isPlayer || String(dashboard?.dashboard_type || "").toUpperCase() === "PLAYER"
        ? "SCOPED"
        : "ALL"
    ),
    [isPlayer]
  );

  return (
    <RoleSchedulePage
      pageTitle={isPlayer ? "My Schedule" : "Tournament Schedule"}
      pageSubtitle={
        isPlayer
          ? "Track your team fixtures, calendar, and venue assignments for the selected tournament."
          : "View match schedules, calendar, and venue assignments for the tournament."
      }
      pageIcon={Calendar}
      focusModes={resolveFocusModes}
      defaultFocusMode={resolveDefaultFocusMode}
      buildScopeFilter={buildScopeFilter}
      scopeFilterField="team_ids"
      showVenuePanel={true}
    />
  );
};

export default ViewerSchedules;
