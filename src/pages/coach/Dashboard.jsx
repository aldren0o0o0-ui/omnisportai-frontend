import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { CalendarDays, ClipboardList, RefreshCcw, Trophy, UserPlus } from "lucide-react";
import CoachDashboardLayout from "../../components/dashboard/role_dashboard/layouts/CoachDashboardLayout";
import TournamentModeFallback from "../../components/tournament/TournamentModeFallback";
import { RoleDashboardShell } from "../../components/intramural";
import useRoleDashboardData from "../../hooks/useRoleDashboardData";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import { shouldShowCoachTools } from "../../utils/tournamentAccess";
import { getSports } from "../../services/sportService";
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
  const [ownedParticipantState, setOwnedParticipantState] = useState({ tournamentId: null, rows: [] });

  const isCoachManagementMode = shouldShowCoachTools(tournamentAccess);
  const isAssistantCoachMode = tournamentAccess.isReadOnlyAssistantMode;
  const isNoTournamentSelected = !tournamentAccess.hasSelectedTournament;
  const isTournamentViewerFallback =
    tournamentAccess.hasSelectedTournament &&
    !tournamentAccess.loading &&
    !isCoachManagementMode &&
    !isAssistantCoachMode;

  const isViewer =
    isTournamentViewerFallback ||
    (tournamentAccess.hasSelectedTournament &&
      !tournamentAccess.loading &&
      tournamentAccess.effectiveMode === "viewer") ||
    dashboard?.dashboard_type === "VIEWER";

  if (isViewer) {
    return <Navigate to="/viewer/dashboard" replace />;
  }

  const operationalMode = Boolean(
    Array.isArray(dashboard?.schedule?.events) && dashboard.schedule.events.length > 0
  );

  useEffect(() => {
    let active = true;
    getSports().then((rows) => active && setSportsList(Array.isArray(rows) ? rows : [])).catch((apiError) => {
      console.error(apiError);
      if (active) setSportsList([]);
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

  // const headerTournamentName = ownedParticipantNames.length > 0 ? ownedParticipantNames.join(" • ") : "My Entry";
  const dateRange = getTournamentDateRange(tournamentObj);
  const intramuralName = [selectedTournamentName || tournamentObj?.tournament_name || tournamentObj?.name, dateRange]
    .filter(Boolean)
    .join(" • ");
  let content = null;
  if (isNoTournamentSelected) {
    // content = (
    // <TournamentModeFallback
    //   title="Select a tournament"
    //   message="Choose a tournament to see your access and available tools."
    // />
    // );
  } else if (isTournamentViewerFallback) {
    content = (
      <div className="flex flex-wrap gap-2">
        <Link to="/coach/schedules" className="os-btn-ghost-soft inline-flex min-h-[var(--control-height-md)] flex-1 items-center justify-center gap-2 px-3 text-sm font-semibold sm:flex-none">
          View Schedules
        </Link>
        <Link to="/coach/brackets" className="os-btn-ghost-soft inline-flex min-h-[var(--control-height-md)] flex-1 items-center justify-center gap-2 px-3 text-sm font-semibold sm:flex-none">
          View Brackets
        </Link>
      </div>
    );
  } else if (isAssistantCoachMode) {
    content = null;
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

  return (
    <RoleDashboardShell
      role="coach"
      eyebrow={intramuralName}
      title={headerEntryTitle}
      subtitle={""}
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
              <>
                <div></div>
              </>
            )}
          </div>
        ) : null
      }
    >
      {content}
    </RoleDashboardShell>
  );
};

export default CoachDashboard;
