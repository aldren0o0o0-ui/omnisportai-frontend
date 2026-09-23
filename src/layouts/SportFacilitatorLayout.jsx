import { useMemo } from "react";
import { sportFacilitatorSidebarGroups } from "../components/Sidebar/sportFacilitatorSidebarConfig";
import { filterGroupsByPaths } from "../components/Sidebar/sidebarTypes";
import useRoleDashboardData from "../hooks/useRoleDashboardData";
import useTournamentAccess from "../hooks/useTournamentAccess";
import BaseRoleLayout from "./BaseRoleLayout";

const READ_ONLY_PATHS = new Set([
  "/sport-facilitator/dashboard",
  "/sport-facilitator/sports",
  "/sport-facilitator/rule-standards",
  "/sport-facilitator/intramurals",
  "/sport-facilitator/schedules",
  "/sport-facilitator/brackets",
  "/sport-facilitator/standings",
  "/sport-facilitator/announcements",
]);

const SportFacilitatorLayout = () => {
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
    const baseGroups = hasOperationalScope
      ? sportFacilitatorSidebarGroups
      : filterGroupsByPaths(sportFacilitatorSidebarGroups, READ_ONLY_PATHS);
    if (!hasOperationalScope || pendingApprovalCount <= 0) return baseGroups;
    return baseGroups.map((group) => ({
      ...group,
      items: group.items.map((item) =>
        item.path === "/sport-facilitator/teams-and-players"
          ? { ...item, badge: pendingApprovalCount }
          : item
      ),
    }));
  }, [hasOperationalScope, pendingApprovalCount]);
  return <BaseRoleLayout groups={groups} />;
};

export default SportFacilitatorLayout;
