import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import FacilitatorDashboardLayout from "../../components/dashboard/role_dashboard/layouts/FacilitatorDashboardLayout";
import { RoleDashboardShell } from "../../components/intramural";
import useRoleDashboardData from "../../hooks/useRoleDashboardData";
import { getSports } from "../../services/sportService";
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

  useEffect(() => {
    let active = true;
    getSports().then((rows) => active && setSportsList(Array.isArray(rows) ? rows : [])).catch((apiError) => {
      console.error(apiError);
      if (active) setSportsList([]);
    });
    return () => { active = false; };
  }, []);

  const isViewer =
    (tournamentAccess.hasSelectedTournament &&
      !tournamentAccess.loading &&
      tournamentAccess.effectiveMode === "viewer") ||
    dashboard?.dashboard_type === "VIEWER";

  if (isViewer) {
    return <Navigate to="/viewer/dashboard" replace />;
  }

  const tournamentObj =
    (Array.isArray(tournaments)
      ? tournaments.find((t) => String(t.id) === String(selectedTournamentId))
      : null) || dashboard?.tournament || null;

  const facilitatorContexts = tournamentAccess.roleContexts.filter((context) => context?.role === "sports_facilitator");
  const assignedTypes = [...new Set(facilitatorContexts.map((context) => context?.competition_type_label).filter(Boolean))];
  const operationalMode = Boolean(
    Array.isArray(dashboard?.schedule?.events) && dashboard.schedule.events.length > 0
  );

  return (
    <RoleDashboardShell
      role="sport-facilitator"
      eyebrow=""
      title=""
      subtitle=""
      showOverviewCard={false}
      loading={loading || !dashboard}
      error={error}
      headerAction={
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          
          {assignedTypes.map((type) => (
            <span key={type} className="inline-flex min-h-[var(--control-height-sm)] items-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)]">
              {type}
            </span>
          ))}
          {operationalMode ? (
            <>
              <Link to="/sport-facilitator/standings" className="os-btn-ghost-soft inline-flex min-h-[var(--control-height-sm)] items-center px-3 text-xs font-semibold">
                Standings
              </Link>
              <Link to="/sport-facilitator/schedules" className="os-btn-primary-soft inline-flex min-h-[var(--control-height-sm)] items-center px-3 text-xs font-semibold">
                Assigned Matches
              </Link>
            </>
          ) : null}
        </div>
      }
    >
      {dashboard ? (
        <FacilitatorDashboardLayout
          dashboard={dashboard}
          sportsList={sportsList}
          startedTournament={tournamentObj}
        />
      ) : null}
    </RoleDashboardShell>
  );
};

export default FacilitatorDashboard;
