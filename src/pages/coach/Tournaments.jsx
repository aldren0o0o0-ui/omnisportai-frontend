import { IntramuralGallery } from "../../components/intramural";
import TournamentModeFallback from "../../components/tournament/TournamentModeFallback";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import {
  shouldShowCoachTools,
} from "../../utils/tournamentAccess";

const CoachTournaments = () => {
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

  const title = "Intramurals";
  let subtitle = "Select an intramural event to view your assigned coach access.";
  let introContent = null;

  if (!tournamentAccess.hasSelectedTournament) {
    subtitle = "Select an intramural event to see your access and available tools.";
    // introContent = (
    //   <TournamentModeFallback
    //     title="Select an intramural event"
    //     message="Choose an intramural event to see your access and available tools."
    //     className="mb-6"
    //   />
    // );
  } else if (tournamentAccess.loading) {
    subtitle = "Checking your intramural access before loading event details.";
    introContent = (
      <TournamentModeFallback
        title="Checking intramural access"
        message="Loading your selected-event access before opening intramural details."
        className="mb-6"
      />
    );
  } else if (showAssistantMode) {
    subtitle = "Read-only intramural access for your assigned event context.";
  } else if (showViewerSafeMode) {
    subtitle = "Select an intramural event to view public information.";
  }

  return (
    <div className="os-themed-page space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">{title}</h1>
        <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>
      </div>

      {introContent}

      <IntramuralGallery />
    </div>
  );
};

export default CoachTournaments;
