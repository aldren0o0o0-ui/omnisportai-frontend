import { useMemo } from "react";
import { sportFacilitatorSidebarGroups } from "../components/Sidebar/sportFacilitatorSidebarConfig";
import TournamentModeFallback from "../components/tournament/TournamentModeFallback";
import { useAuth } from "../context/AuthContext";
import useRoleDashboardData from "../hooks/useRoleDashboardData";
import useTournamentAccess from "../hooks/useTournamentAccess";
import BaseRoleLayout from "./BaseRoleLayout";

const SportFacilitatorLayout = () => {
  const { roleNames = [] } = useAuth();
  const access = useTournamentAccess();
  const hasOperationalScope =
    access.hasSelectedTournament &&
    !access.loading &&
    !access.error &&
    (access.isFacilitatorMode || access.isCoordinatorMode);
  const { dashboard } = useRoleDashboardData({
    autoLoad: hasOperationalScope,
    autoRefreshOnTournamentChange: true,
    liveRefresh: false,
  });
  const pendingApprovalCount = Number(dashboard?.meta?.pending_approval_count || 0);

  const groups = useMemo(() => {
    if (!hasOperationalScope || pendingApprovalCount <= 0) return sportFacilitatorSidebarGroups;
    return sportFacilitatorSidebarGroups.map((group) => ({
      ...group,
      items: group.items.map((item) =>
        item.path === "/sport-facilitator/teams-and-players"
          ? { ...item, badge: pendingApprovalCount }
          : item
      ),
    }));
  }, [hasOperationalScope, pendingApprovalCount]);

  const isGlobalCoordinator = roleNames.includes("SPORTS_COORDINATOR");
  const roleLabelOverride = useMemo(() => {
    if (isGlobalCoordinator) return "Coordinator (Facilitator View)";
    if (!hasOperationalScope && !access.loading) return "Viewer";
    return "Sports Facilitator";
  }, [isGlobalCoordinator, hasOperationalScope, access.loading]);

  const shellNotice = useMemo(() => {
    if (hasOperationalScope) return null;
    if (access.loading) {
      return (
        <TournamentModeFallback
          title="Checking intramural access"
          message="Loading your sport assignments for this intramural..."
          className="mb-6"
        />
      );
    }
    // if (access.hasSelectedTournament && !hasOperationalScope) {
    //   return (
    //     <TournamentModeFallback
    //       title="Viewing as Spectator"
    //       message="You do not have assigned sports in this intramural event. Showing tournament information."
    //       tone={access.error ? "warning" : "neutral"}
    //       className="mb-6"
    //     />
    //   );
    // }
    return null;
  }, [hasOperationalScope, access]);

  return (
    <BaseRoleLayout
      groups={groups}
      roleLabelOverride={roleLabelOverride}
      shellNotice={shellNotice}
    />
  );
};

export default SportFacilitatorLayout;

