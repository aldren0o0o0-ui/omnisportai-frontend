import CoordinatorBrackets from "../coordinator/Brackets";
import TournamentModeFallback from "../../components/tournament/TournamentModeFallback";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import { useMemo } from "react";

const FacilitatorBrackets = () => {
  const access = useTournamentAccess();
  const hasAssignedSport =
    access.hasSelectedTournament &&
    !access.loading &&
    !access.error &&
    (access.isFacilitatorMode || access.isCoordinatorMode);
  const canOpenTallyBoard =
    hasAssignedSport && access.hasPermission("manage_assigned_live_scoring");
  const assignedSportIds = useMemo(
    () => Array.from(new Set(
      access.roleContexts
        .filter((context) => context?.role === "sports_facilitator")
        .map((context) => Number(context?.sport_id || 0))
        .filter((sportId) => sportId > 0)
    )),
    [access.roleContexts]
  );

  let introContent = null;
  if (!access.hasSelectedTournament) {
    // introContent = (
    // <TournamentModeFallback
    //   title="Select an intramural event"
    //   message="Choose an intramural event to view the brackets for your assigned sports."
    // />
    // );
  } else if (access.loading) {
    introContent = (
      <TournamentModeFallback
        title="Checking facilitator assignment"
        message="Loading your assigned sports for the selected intramural."
      />
    );
  } else if (!hasAssignedSport) {
    introContent = (
      <TournamentModeFallback
        title="Read-only bracket view"
        message="Tally Board access is available only for sports assigned to you in this intramural."
        tone={access.error ? "warning" : "neutral"}
      />
    );
  }

  return (
    <CoordinatorBrackets
      readOnly={!hasAssignedSport}
      targetScopedManagement
      pageTitle="Tournament Brackets"
      pageSubtitle="Choose a supported format, generate assigned brackets, and monitor authorized Matches."
      introContent={introContent}
      allowLiveScoringActions={canOpenTallyBoard}
      liveScoringSportIds={assignedSportIds}
      liveScoringBasePath="/sport-facilitator"
      matchViewerBasePath="/sport-facilitator"
    />
  );
};

export default FacilitatorBrackets;
