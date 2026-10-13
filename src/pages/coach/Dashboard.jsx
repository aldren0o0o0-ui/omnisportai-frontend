import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { CalendarDays, ClipboardList, RefreshCcw, Trophy, UserPlus } from "lucide-react";
import CoachDashboardLayout from "../../components/dashboard/role_dashboard/layouts/CoachDashboardLayout";
import ViewerDashboardLayout from "../../components/dashboard/role_dashboard/layouts/ViewerDashboardLayout";
import TournamentModeFallback from "../../components/tournament/TournamentModeFallback";
import { RoleDashboardShell } from "../../components/intramural";
import useRoleDashboardData from "../../hooks/useRoleDashboardData";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import { shouldShowCoachTools } from "../../utils/tournamentAccess";
import { getSports } from "../../services/sportService";
import { getBrackets } from "../../services/bracketService";
import { getTournamentDateRange } from "../../components/dashboard/role_dashboard/layouts/dashboardLayoutUtils";
import { getManagedCompetitionParticipants } from "../../services/competitionParticipantService";
import { useWorkspace } from "../../context/WorkspaceContext";

const CoachDashboard = () => {
  const { selectedIntramural, workspace } = useWorkspace();
  const {
    dashboard,
    tournaments,
    selectedTournamentId,
    selectedTournamentName,
    loading,
    error,
  } = useRoleDashboardData({ autoRefreshOnTournamentChange: true });
  const tournamentAccess = useTournamentAccess(selectedTournamentId);
  const [sportsList, setSportsList] = useState([]);
  const [brackets, setBrackets] = useState([]);
  const [ownedParticipantState, setOwnedParticipantState] = useState({ tournamentId: null, rows: [] });

  const isCoachManagementMode = shouldShowCoachTools(tournamentAccess);
  const isAssistantCoachMode = tournamentAccess.isReadOnlyAssistantMode;
  const isNoTournamentSelected = !tournamentAccess.hasSelectedTournament;
  const isTournamentViewerFallback =
    !isCoachManagementMode && !isAssistantCoachMode;

  useEffect(() => {
    let active = true;
    getSports()
      .then((rows) => active && setSportsList(Array.isArray(rows) ? rows : []))
      .catch((apiError) => {
        console.error(apiError);
        if (active) setSportsList([]);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getBrackets()
      .then((rows) => active && setBrackets(Array.isArray(rows) ? rows : []))
      .catch((apiError) => {
        console.error(apiError);
        if (active) setBrackets([]);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const tournamentId = Number(selectedTournamentId || 0);
    if (!tournamentId || !isCoachManagementMode) return undefined;
    const workspaceId = Number(selectedIntramural?.id || workspace?.id || 0);
    if (!workspaceId) return undefined;
    getManagedCompetitionParticipants({ workspaceId, tournamentId })
      .then((rows) => {
        if (!active) return;
        setOwnedParticipantState({ tournamentId, rows: Array.isArray(rows) ? rows : [] });
      })
      .catch(() => active && setOwnedParticipantState({ tournamentId, rows: [] }));
    return () => { active = false; };
  }, [isCoachManagementMode, selectedIntramural?.id, selectedTournamentId, workspace?.id]);

  const bracketSummaryRows = useMemo(() => {
    const selectedId = Number(selectedTournamentId || 0);
    return (Array.isArray(brackets) ? brackets : []).filter((bracket) => {
      if (!selectedId) return true;
      return Number(bracket?.tournament_id || 0) === selectedId;
    });
  }, [brackets, selectedTournamentId]);

  const operationalMode = Boolean(
    Array.isArray(dashboard?.schedule?.events) && dashboard.schedule.events.length > 0
  );

  const ownedParticipants = ownedParticipantState.tournamentId === Number(selectedTournamentId || 0) ? ownedParticipantState.rows : [];

  const tournamentObj =
    (Array.isArray(tournaments)
      ? tournaments.find((t) => String(t.id) === String(selectedTournamentId))
      : null) || dashboard?.tournament || null;

  const ownedParticipantNames = [...new Set(ownedParticipants.map((participant) => participant?.display_name || participant?.entry_name).filter(Boolean))];

  // 2. Fallback to assigned sport/event/department labels from tournamentAccess
  const coachContexts = tournamentAccess.roleContexts.filter(
    (ctx) => ctx?.role === "coach" || ctx?.role === "assistant_coach"
  );

  const assignedContextLabels = [
    ...new Set(
      coachContexts
        .map((ctx) => ctx?.sport_label || ctx?.sport_name || ctx?.department_name)
        .filter(Boolean)
    ),
  ];

  // 3. Tiered Title Resolution
  const headerEntryTitle =
    ownedParticipantNames.length > 0
      ? ownedParticipantNames.join(" • ")
      : assignedContextLabels.length > 0
        ? assignedContextLabels.join(" • ")
        : isAssistantCoachMode
          ? "Assistant Coach"
          : "My Entry";

  const dateRange = getTournamentDateRange(tournamentObj);
  const intramuralName = [selectedTournamentName || tournamentObj?.tournament_name || tournamentObj?.name, dateRange]
    .filter(Boolean)
    .join(" • ");

  let content = null;
  if (isAssistantCoachMode) {
    content = null;
  } else if (!isCoachManagementMode) {
    // When the user is NOT assigned as coach in this intramural, render the Viewer Dashboard
    content = (
      <ViewerDashboardLayout
        dashboard={dashboard}
        startedTournament={tournamentObj}
        brackets={bracketSummaryRows}
        sportsList={sportsList}
        viewerTeamsHref="/coach/teams-and-players"
        applications={[]}
        approvedApplicationsCount={0}
        totalApplicationsCount={0}
      />
    );
  } else {
    content = dashboard ? (
      <CoachDashboardLayout
        dashboard={dashboard}
        sportsList={sportsList}
        startedTournament={tournamentObj}
        workspaceId={Number(selectedIntramural?.id || workspace?.id || 0) || null}
        coachContexts={coachContexts}
      />
    ) : null;
  }

  const shellRole = isCoachManagementMode ? "coach" : "viewer";
  const shellTitle = isCoachManagementMode ? headerEntryTitle : "Live Intramural Hub";
  const shellSubtitle = isCoachManagementMode
    ? ""
    : "Viewing as Viewer • Public tournament matches, standings, and brackets.";

  return (
    <RoleDashboardShell
      role={shellRole}
      eyebrow={""}
      title={""}
      subtitle={shellSubtitle}
      showOverviewCard={false}
      loading={loading || (!dashboard && !isNoTournamentSelected)}
      error={error}
      headerAction={
        isCoachManagementMode ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {operationalMode ? (
              <>
                <Link to="/coach/standings" className="os-btn-ghost-soft inline-flex min-h-[var(--control-height-md)] flex-1 items-center justify-center gap-2 px-3 text-sm font-semibold sm:flex-none">
                  <Trophy size={15} aria-hidden="true" />
                  Standings
                </Link>
                <Link to="/coach/schedules" className="os-btn-primary-soft inline-flex min-h-[var(--control-height-md)] flex-1 items-center justify-center gap-2 px-4 text-sm font-semibold sm:flex-none">
                  <CalendarDays size={15} aria-hidden="true" />
                  My Matches
                </Link>
              </>
            ) : (
              <div></div>
            )}
          </div>
        ) : (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <Link to="/coach/standings" className="os-btn-ghost-soft inline-flex min-h-[var(--control-height-md)] flex-1 items-center justify-center gap-2 px-3 text-sm font-semibold sm:flex-none">
              <Trophy size={15} aria-hidden="true" />
              Standings
            </Link>
            <Link to="/coach/schedules" className="os-btn-primary-soft inline-flex min-h-[var(--control-height-md)] flex-1 items-center justify-center gap-2 px-4 text-sm font-semibold sm:flex-none">
              <CalendarDays size={15} aria-hidden="true" />
              View Schedules
            </Link>
          </div>
        )
      }
    >
      {content}
    </RoleDashboardShell>
  );
};

export default CoachDashboard;
