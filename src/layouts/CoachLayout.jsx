import { useMemo } from "react";
import { Link } from "react-router-dom";
import { coachSidebarGroups } from "../components/Sidebar/coachSidebarConfig";
import { filterGroupsByPaths } from "../components/Sidebar/sidebarTypes";
import TournamentModeFallback from "../components/tournament/TournamentModeFallback";
import useRoleDashboardData from "../hooks/useRoleDashboardData";
import useTournamentAccess from "../hooks/useTournamentAccess";
import {
  getCoachFallbackMessage,
  getCoachFallbackTitle,
  getTournamentAccessModeLabel,
  shouldShowCoachTools,
} from "../utils/tournamentAccess";
import BaseRoleLayout from "./BaseRoleLayout";

const ASSISTANT_SAFE_PATHS = new Set([
  "/coach/dashboard",
  "/coach/team-registration",
  "/coach/sports",
  "/coach/intramurals",
  "/coach/brackets",
  "/coach/schedules",
  "/coach/standings",
]);

const VIEWER_SAFE_PATHS = new Set([
  "/coach/dashboard",
  "/coach/sports",
  "/coach/intramurals",
  "/coach/brackets",
  "/coach/schedules",
  "/coach/standings",
]);

const CoachLayout = () => {
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
    const withRecruitmentBadge = (groups) => {
      if (!showCoachTools || pendingApplicationCount <= 0) return groups;
      return groups.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.path === "/coach/player-applications"
            ? { ...item, badge: pendingApplicationCount }
            : item
        ),
      }));
    };
    if (showCoachTools) {
      return withRecruitmentBadge(coachSidebarGroups);
    }
    if (showAssistantMode) {
      return filterGroupsByPaths(coachSidebarGroups, ASSISTANT_SAFE_PATHS);
    }
    return filterGroupsByPaths(coachSidebarGroups, VIEWER_SAFE_PATHS);
  }, [pendingApplicationCount, showAssistantMode, showCoachTools]);

  const roleLabelOverride = !tournamentAccess.hasSelectedTournament
    ? "Select Tournament"
    : tournamentAccess.loading
      ? "Checking Access"
      : showCoachTools
        ? "Coach"
        : showAssistantMode
          ? "Assistant Coach"
          : tournamentAccess.isPlayerMode
            ? "Player Mode"
            : `${getTournamentAccessModeLabel(tournamentAccess)} View`;

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
    if (showViewerSafeMode) {
      return (
        <TournamentModeFallback
          title={getCoachFallbackTitle(tournamentAccess)}
          message={getCoachFallbackMessage(tournamentAccess, {
            unavailableLabel: "Coach tools",
          })}
          tone={tournamentAccess.error ? "warning" : "neutral"}
          className="mb-6"
        >
          {tournamentAccess.isPlayerMode ? (
            <div className="flex flex-wrap gap-2">
              <Link
                to="/viewer/dashboard"
                className="os-btn-ghost-soft inline-flex items-center gap-2 px-3 py-2.5 text-sm font-semibold"
              >
                Open Player Dashboard
              </Link>
            </div>
          ) : null}
        </TournamentModeFallback>
      );
    }
    return null;
  }, [showAssistantMode, showCoachTools, showViewerSafeMode, tournamentAccess]);

  return (
    <BaseRoleLayout
      groups={sidebarGroups}
      roleLabelOverride={roleLabelOverride}
      shellNotice={shellNotice}
    />
  );
};

export default CoachLayout;
