import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Trophy } from "lucide-react";
import FacilitatorDashboardLayout from "../../components/dashboard/role_dashboard/layouts/FacilitatorDashboardLayout";
import ViewerDashboardLayout from "../../components/dashboard/role_dashboard/layouts/ViewerDashboardLayout";
import { RoleDashboardShell } from "../../components/intramural";
import useRoleDashboardData from "../../hooks/useRoleDashboardData";
import { getSports } from "../../services/sportService";
import { getBrackets } from "../../services/bracketService";
import useTournamentAccess from "../../hooks/useTournamentAccess";

const FacilitatorDashboard = () => {
  const {
    dashboard,
    tournaments,
    selectedTournamentId,
    loading,
    error,
  } = useRoleDashboardData({ autoRefreshOnTournamentChange: true });
  const tournamentAccess = useTournamentAccess(selectedTournamentId);
  const [sportsList, setSportsList] = useState([]);
  const [brackets, setBrackets] = useState([]);

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
    getBrackets(selectedTournamentId || undefined)
      .then((rows) => active && setBrackets(Array.isArray(rows) ? rows : []))
      .catch((apiError) => {
        console.error(apiError);
        if (active) setBrackets([]);
      });
    return () => { active = false; };
  }, [selectedTournamentId]);

  const bracketSummaryRows = useMemo(() => {
    const selectedId = Number(selectedTournamentId || 0);
    return (Array.isArray(brackets) ? brackets : []).filter((bracket) => {
      if (!selectedId) return true;
      return Number(bracket?.tournament_id || 0) === selectedId;
    });
  }, [brackets, selectedTournamentId]);

  const tournamentObj =
    (Array.isArray(tournaments)
      ? tournaments.find((t) => String(t.id) === String(selectedTournamentId))
      : null) || dashboard?.tournament || null;

  const facilitatorContexts = tournamentAccess.roleContexts.filter(
    (context) => context?.role === "sports_facilitator"
  );
  const assignedTypes = [
    ...new Set(facilitatorContexts.map((context) => context?.competition_type_label).filter(Boolean)),
  ];

  const isFacilitatorMode = Boolean(
    tournamentAccess.isFacilitatorMode ||
    tournamentAccess.isCoordinatorMode ||
    tournamentAccess.hasRoleContext("sports_facilitator") ||
    (dashboard?.dashboard_type === "FACILITATOR" && facilitatorContexts.length > 0)
  );

  const operationalMode = Boolean(
    Array.isArray(dashboard?.schedule?.events) && dashboard.schedule.events.length > 0
  );

  return (
    <RoleDashboardShell
      role={isFacilitatorMode ? "sport-facilitator" : "viewer"}
      eyebrow=""
      title=""
      subtitle=""
      showOverviewCard={false}
      loading={loading || !dashboard}
      error={error}
      headerAction={
        isFacilitatorMode ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {assignedTypes.map((type) => (
              <span
                key={type}
                className="inline-flex min-h-[var(--control-height-sm)] items-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)]"
              >
                {type}
              </span>
            ))}
            {/* {operationalMode ? (
              <>
                <Link
                  to="/sport-facilitator/standings"
                  className="os-btn-ghost-soft inline-flex min-h-[var(--control-height-sm)] items-center px-3 text-xs font-semibold"
                >
                  Standings
                </Link>
                <Link
                  to="/sport-facilitator/schedules"
                  className="os-btn-primary-soft inline-flex min-h-[var(--control-height-sm)] items-center px-3 text-xs font-semibold"
                >
                  Assigned Matches
                </Link>
              </>
            ) : null} */}
          </div>
        ) : (
          <></>
          // <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          //   <Link
          //     to="/sport-facilitator/standings"
          //     className="os-btn-ghost-soft inline-flex min-h-[var(--control-height-md)] items-center gap-2 px-3 text-sm font-semibold"
          //   >
          //     <Trophy size={15} aria-hidden="true" />
          //     Standings
          //   </Link>
          //   <Link
          //     to="/sport-facilitator/schedules"
          //     className="os-btn-primary-soft inline-flex min-h-[var(--control-height-md)] items-center gap-2 px-4 text-sm font-semibold"
          //   >
          //     <CalendarDays size={15} aria-hidden="true" />
          //     View Schedules
          //   </Link>
          // </div>
        )
      }
    >
      {dashboard ? (
        isFacilitatorMode ? (
          <FacilitatorDashboardLayout
            dashboard={dashboard}
            sportsList={sportsList}
            startedTournament={tournamentObj}
          />
        ) : (
          <ViewerDashboardLayout
            dashboard={dashboard}
            startedTournament={tournamentObj}
            brackets={bracketSummaryRows}
            sportsList={sportsList}
            viewerTeamsHref="/sport-facilitator/teams-and-players"
            applications={[]}
            approvedApplicationsCount={0}
            totalApplicationsCount={0}
          />
        )
      ) : null}
    </RoleDashboardShell>
  );
};

export default FacilitatorDashboard;
