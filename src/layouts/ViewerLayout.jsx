import { viewerSidebarGroups } from "../components/Sidebar/viewerSidebarConfig";
import { playerSidebarGroups } from "../components/Sidebar/playerSidebarConfig";
import useTournamentAccess from "../hooks/useTournamentAccess";
import BaseRoleLayout from "./BaseRoleLayout";
import { useAuth } from "../context/AuthContext";

const ViewerLayout = () => {
  const tournamentAccess = useTournamentAccess();
  const { user } = useAuth();
  const hasPlayerProfile = (user?.assignment_contexts || []).some((row) => String(row?.type || "").toUpperCase() === "PLAYER");
  const usePlayerSidebar =
    tournamentAccess.hasSelectedTournament &&
    !tournamentAccess.loading &&
    !tournamentAccess.error &&
    tournamentAccess.isPlayerMode;
  const activeGroups = usePlayerSidebar ? playerSidebarGroups : viewerSidebarGroups;
  const roleLabelOverride = usePlayerSidebar || hasPlayerProfile ? "Player" : "Viewer";

  return (
    <BaseRoleLayout
      groups={activeGroups}
      roleLabelOverride={roleLabelOverride}
    />
  );
};

export default ViewerLayout;
