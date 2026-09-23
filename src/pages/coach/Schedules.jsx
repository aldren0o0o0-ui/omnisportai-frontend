import { useCallback } from "react";
import { Calendar, Eye, Focus } from "lucide-react";
import RoleSchedulePage from "../../components/schedule/RoleSchedulePage";
import TournamentModeFallback from "../../components/tournament/TournamentModeFallback";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import {
  shouldShowCoachTools,
} from "../../utils/tournamentAccess";

const toPositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
};

const CoachSchedules = () => {
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

  const buildScopeFilter = useCallback((dashboard) => {
    if (!showCoachTools && !showAssistantMode) return null;
    const dashboardTeamIds = Array.isArray(dashboard?.scope?.team_ids)
      ? dashboard.scope.team_ids
      : [];
    const contextTeamIds = tournamentAccess.roleContexts
      .filter((context) => ["coach", "assistant_coach"].includes(context?.role))
      .map((context) => context?.team_id);
    const set = new Set(
      [...dashboardTeamIds, ...contextTeamIds]
        .map((id) => toPositiveInt(id))
        .filter((id) => id > 0)
    );
    return set.size > 0 ? set : null;
  }, [showAssistantMode, showCoachTools, tournamentAccess.roleContexts]);

  let pageTitle = "Coach Schedule";
  let pageSubtitle =
    "View your team's match schedule, calendar, and venue assignments.";
  let focusModes = [
    { key: "SCOPED", label: "My Teams", icon: Focus },
    { key: "ALL", label: "All Schedules", icon: Eye },
  ];
  let readOnlyNote =
    "Read-only view. Shows matches for your registered teams by default. Use 'All Schedules' to view tournament-wide matches.";
  let introContent = null;

  if (!tournamentAccess.hasSelectedTournament) {
    pageTitle = "Tournament Schedules";
    pageSubtitle =
      "Choose a tournament to see your access and available schedule tools.";
    focusModes = null;
    readOnlyNote = null;
    // introContent = (
    //   <TournamentModeFallback
    //     title="Select a tournament"
    //     message="Choose a tournament to see your access and available tools."
    //   />
    // );
  } else if (tournamentAccess.loading) {
    pageTitle = "Tournament Schedules";
    pageSubtitle = "Checking your tournament access before loading schedules.";
    focusModes = null;
    readOnlyNote = null;
    introContent = (
      <TournamentModeFallback
        title="Checking tournament access"
        message="Loading your selected-tournament access before opening schedule tools."
      />
    );
  } else if (showAssistantMode) {
    pageTitle = "Tournament Schedules";
    pageSubtitle =
      "Read-only schedule access for your assigned tournament context.";
    readOnlyNote =
      "Assistant Coach Mode is read-only in this phase. Tournament schedules remain visible.";
  } else if (showViewerSafeMode) {
    pageTitle = "Tournament Schedules";
    pageSubtitle =
      "Public tournament schedules remain available for the selected tournament.";
    focusModes = null;
    readOnlyNote =
      "Viewer-safe schedule view. Public tournament matches remain visible.";
  }

  return (
    <RoleSchedulePage
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      pageIcon={Calendar}
      focusModes={focusModes}
      defaultFocusMode={showCoachTools || showAssistantMode ? "SCOPED" : "ALL"}
      buildScopeFilter={buildScopeFilter}
      scopeFilterField="team_ids"
      showVenuePanel
      readOnlyNote={readOnlyNote}
      introContent={introContent}
    />
  );
};

export default CoachSchedules;
