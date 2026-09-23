import CoordinatorBrackets from "../coordinator/Brackets";
import TournamentModeFallback from "../../components/tournament/TournamentModeFallback";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import {
  shouldShowCoachTools,
} from "../../utils/tournamentAccess";

const CoachBrackets = () => {
  const tournamentAccess = useTournamentAccess();
  const showCoachTools = shouldShowCoachTools(tournamentAccess);
  const allowLiveScoringActions =
    tournamentAccess.hasSelectedTournament &&
    !tournamentAccess.loading &&
    tournamentAccess.hasPermission("live_score_assigned_matches");
  const showAssistantMode =
    tournamentAccess.hasSelectedTournament &&
    !tournamentAccess.loading &&
    tournamentAccess.isReadOnlyAssistantMode;
  const showViewerSafeMode =
    tournamentAccess.hasSelectedTournament &&
    !tournamentAccess.loading &&
    !showCoachTools &&
    !showAssistantMode;

  let pageTitle = "Tournament Brackets";
  let pageSubtitle =
    "Unified bracket view with read-only access for this role.";
  let introContent = null;

  if (!tournamentAccess.hasSelectedTournament) {
    pageSubtitle =
      "Choose a tournament to see your access and available bracket tools.";
    // introContent = (
    //   <TournamentModeFallback
    //     title="Select a tournament"
    //     message="Choose a tournament to see your access and available tools."
    //   />
    // );
  } else if (tournamentAccess.loading) {
    pageSubtitle =
      "Checking your tournament access before loading bracket information.";
    // introContent = (
    //   <TournamentModeFallback
    //     title="Checking tournament access"
    //     message="Loading your selected-tournament access before opening bracket tools."
    //   />
    // );
  } else if (showAssistantMode) {
    pageSubtitle =
      "Read-only bracket access for your assigned tournament context.";
  } else if (showViewerSafeMode) {
    pageTitle = tournamentAccess.isPlayerMode ? "Tournament Brackets" : "Public Brackets";
    pageSubtitle =
      "Read-only tournament brackets remain visible for the selected tournament.";
  }

  return (
    <CoordinatorBrackets
      readOnly
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      introContent={introContent}
      allowLiveScoringActions={allowLiveScoringActions}
      liveScoringBasePath="/coach"
      matchViewerBasePath="/coach"
    />
  );
};

export default CoachBrackets;
