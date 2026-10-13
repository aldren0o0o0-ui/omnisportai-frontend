import { useMemo } from "react";
import { coachSidebarGroups } from "../components/Sidebar/coachSidebarConfig";
import TournamentModeFallback from "../components/tournament/TournamentModeFallback";
import { useAuth } from "../context/AuthContext";
import useRoleDashboardData from "../hooks/useRoleDashboardData";
import useTournamentAccess from "../hooks/useTournamentAccess";
import { shouldShowCoachTools } from "../utils/tournamentAccess";
import BaseRoleLayout from "./BaseRoleLayout";

const CoachLayout = () => {
  const { roleNames = [] } = useAuth();
  const tournamentAccess = useTournamentAccess();
  const showCoachTools = shouldShowCoachTools(tournamentAccess);
  const showAssistantMode =
    tournamentAccess.hasSelectedTournament &&
    !tournamentAccess.loading &&
    tournamentAccess.isReadOnlyAssistantMode;
  const showViewerSafeMode =
    tournamentAccess.hasSelectedTournament &&
    !tournamentAccess.loading &&
    !showCoachTools &&
    !showAssistantMode;
  const { dashboard } = useRoleDashboardData({
    autoLoad: showCoachTools,
    autoRefreshOnTournamentChange: true,
    liveRefresh: false,
  });
  const pendingApplicationCount = Number(dashboard?.meta?.pending_coach_application_count || 0);

  const sidebarGroups = useMemo(() => {
    if (!showCoachTools || pendingApplicationCount <= 0) {
      return coachSidebarGroups;
    }
    return coachSidebarGroups.map((group) => ({
      ...group,
      items: group.items.map((item) =>
        item.path === "/coach/player-applications"
          ? { ...item, badge: pendingApplicationCount }
          : item
      ),
    }));
  }, [pendingApplicationCount, showCoachTools]);

  const isGlobalCoordinator = roleNames.includes("SPORTS_COORDINATOR");
  const roleLabelOverride = useMemo(() => {
    if (showAssistantMode) return "Assistant Coach";
    if (isGlobalCoordinator) return "Coordinator (Coach View)";
    return "Coach";
  }, [showAssistantMode, isGlobalCoordinator]);

  const shellNotice = useMemo(() => {
    if (showCoachTools) return null;
    // if (!tournamentAccess.hasSelectedTournament) {
    //   return (
    //     <TournamentModeFallback
    //       title="Select an intramural event"
    //       message="Choose an intramural event to see your available tools."
    //       className="mb-6"
    //     />
    //   );
    // }
    if (tournamentAccess.loading) {
      return (
        <TournamentModeFallback
          title="Checking intramural access"
          message="Loading your selected-event access before opening coach tools."
          className="mb-6"
        />
      );
    }
    if (showAssistantMode) {
      return (
        <TournamentModeFallback
          title="Assistant Coach Mode"
          message="You have read-only support access for this tournament. Head coach management tools remain hidden."
          tone="info"
          className="mb-6"
        />
      );
    }
    return null;
  }, [showAssistantMode, showCoachTools, tournamentAccess]);

  return (
    <BaseRoleLayout
      groups={sidebarGroups}
      roleLabelOverride={roleLabelOverride}
      shellNotice={shellNotice}
    />
  );
};

export default CoachLayout;
