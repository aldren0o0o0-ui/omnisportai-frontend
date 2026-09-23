import Sports from "../coordinator/Sports";
import TournamentModeFallback from "../../components/tournament/TournamentModeFallback";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import {
  shouldShowCoachTools,
} from "../../utils/tournamentAccess";

const CoachSports = () => {
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

  let directoryTitle = "Assigned Sports and Event Categories";
  let directorySubtitle =
    "Read-only tournament sport information for your coaching scope.";
  let introContent = null;

  if (!tournamentAccess.hasSelectedTournament) {
    directoryTitle = "Tournament Sports";
    directorySubtitle =
      "Choose a tournament to see your access and available tools.";
    introContent = (
      <TournamentModeFallback
        title="Select a tournament"
        message="Choose a tournament to see your access and available tools."
      />
    );
  } else if (tournamentAccess.loading) {
    directoryTitle = "Tournament Sports";
    directorySubtitle =
      "Checking your tournament access before loading sports information.";
    introContent = (
      <TournamentModeFallback
        title="Checking tournament access"
        message="Loading your selected-tournament access before opening sport details."
      />
    );
  } else if (showAssistantMode) {
    directorySubtitle =
      "Read-only sport and event-category information for your assigned tournament context.";
  } else if (showViewerSafeMode) {
    directoryTitle = "Tournament Sports";
    directorySubtitle =
      "Public tournament sport information remains available for the selected tournament.";
  }

  return (
    <Sports
      readOnly
      directoryTitle={directoryTitle}
      directorySubtitle={directorySubtitle}
      introContent={introContent}
    />
  );
};

export default CoachSports;
