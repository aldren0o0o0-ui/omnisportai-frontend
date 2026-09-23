import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardList, Users } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import DashboardCard from "../../components/common/DashboardCard";
import DepartmentDashboardLayout from "../../components/dashboard/role_dashboard/layouts/DepartmentDashboardLayout";
import { RoleDashboardShell } from "../../components/intramural";
import { useWorkspace } from "../../context/WorkspaceContext";
import useRoleDashboardData from "../../hooks/useRoleDashboardData";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import { getSports } from "../../services/sportService";
import {
  getDepartmentCoachAssignments,
  getTournaments,
} from "../../services/tournamentService";

const getErrorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  if (typeof error?.message === "string" && error.message.trim()) return error.message;
  return fallback;
};

const buildCoachAssignmentHref = (workspaceId) => {
  const params = new URLSearchParams();
  if (workspaceId) params.set("workspace_id", String(workspaceId));
  const query = params.toString();
  return query ? `/department/coach-assignments?${query}` : "/department/coach-assignments";
};

const SetupMetric = ({ label, value, helper, tone = "neutral" }) => {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
        : "border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-main)]";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {helper ? <p className="mt-1 text-xs opacity-80">{helper}</p> : null}
    </div>
  );
};

const DepartmentSetupPanel = ({ workspaceId, operationalMode = false }) => {
  const [tournamentName, setTournamentName] = useState("");
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);

  const loadSetup = useCallback(async () => {
    if (!workspaceId) {
      setTargets([]);
      setTournamentName("");
      setNotConfigured(false);
      return;
    }

    setLoading(true);
    setError("");
    setNotConfigured(false);
    try {
      const tournaments = await getTournaments({ workspaceId });
      const rows = Array.isArray(tournaments) ? tournaments : [];
      const active =
        rows.find((row) => row?.is_started && !row?.is_archived) ||
        rows.find((row) => !row?.is_archived) ||
        rows[0] ||
        null;

      if (!active?.id) {
        setTargets([]);
        setTournamentName("");
        setNotConfigured(true);
        return;
      }

      setTournamentName(active.tournament_name || active.name || "Selected Intramural");
      const data = await getDepartmentCoachAssignments(Number(active.id));
      setTargets(Array.isArray(data) ? data : []);
    } catch (err) {
      setTargets([]);
      setError(getErrorMessage(err, "Unable to load your department setup status."));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadSetup();
  }, [loadSetup]);

  const summary = useMemo(() => {
    const sports = new Map();
    let assigned = 0;
    let missing = 0;
    let appsOpen = 0;
    for (const target of targets) {
      if (target?.sport_id) {
        sports.set(String(target.sport_id), target.sport_name || "Sport");
      }
      if (target?.current_coach) assigned += 1;
      else missing += 1;
      if (target?.applications_open) appsOpen += 1;
    }
    return {
      total: targets.length,
      assigned,
      missing,
      appsOpen,
      sports: Array.from(sports.values()),
    };
  }, [targets]);

  const setupHref = buildCoachAssignmentHref(workspaceId);
  const isComplete = summary.total > 0 && summary.missing === 0;

  if (operationalMode && isComplete) return null;

  return (
    <DashboardCard className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
            <ClipboardList className="h-3.5 w-3.5" />
            Department setup
          </div>
          <h2 className="mt-3 text-xl font-bold text-[var(--text-main)]">
            Coach assignments for your department
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            {tournamentName
              ? `Current Intramural: ${tournamentName}. Assign coaches for each sport or event category assigned to your department.`
              : "Select an Intramural to see what your department needs to set up."}
          </p>
        </div>
        <Link
          to={setupHref}
          className="os-btn-primary-soft inline-flex min-h-[var(--control-height-md)] items-center justify-center gap-2 px-4 text-sm font-semibold"
        >
          Open Coach Assignments
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)]"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Setup status could not be loaded.</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={loadSetup}
              className="mt-3 rounded-xl border border-rose-500/30 px-3 py-1.5 text-xs font-semibold"
            >
              Try again
            </button>
          </div>
        </div>
      ) : notConfigured ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          This Intramural is not fully configured yet. Once the coordinator finishes setup, your coach assignment tasks will appear here.
        </div>
      ) : summary.total === 0 ? (
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-muted)]">
          No coach assignment targets are ready for your department yet. If setup was just changed, ask the coordinator to refresh registration targets in Intramural Setup.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <SetupMetric
              label="Coach assignments"
              value={`${summary.assigned} / ${summary.total}`}
              helper={summary.missing > 0 ? `${summary.missing} still need a coach` : "All targets have coaches"}
              tone={summary.missing > 0 ? "warning" : "success"}
            />
            <SetupMetric
              label="Sports covered"
              value={summary.sports.length}
              helper={summary.sports.slice(0, 3).join(", ") || "No selected sport yet"}
            />
            <SetupMetric
              label="Open applications"
              value={summary.appsOpen}
              helper="Targets visible for student registration"
            />
          </div>

          <div className={`rounded-2xl border p-4 text-sm ${
            isComplete
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          }`}>
            <div className="flex items-start gap-3">
              {isComplete ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <Users className="mt-0.5 h-5 w-5 shrink-0" />}
              <div>
                <p className="font-semibold">
                  {isComplete ? "Your department coach setup is complete." : "Your next task: assign missing coaches."}
                </p>
                <p className="mt-1">
                  {isComplete
                    ? "You can continue monitoring teams, applications, and schedules for this Intramural."
                    : `Assign coaches to ${summary.missing} remaining target${summary.missing === 1 ? "" : "s"} so teams and entries can move smoothly into registration.`}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardCard>
  );
};

const DepartmentDashboard = () => {
  const { selectedIntramural } = useWorkspace();
  const {
    dashboard,
    tournaments,
    selectedTournamentId,
    loading,
    error,
  } = useRoleDashboardData({ autoRefreshOnTournamentChange: true });
  const tournamentAccess = useTournamentAccess(selectedTournamentId);
  const [sportsList, setSportsList] = useState([]);

  const isViewer =
    (tournamentAccess.hasSelectedTournament &&
      !tournamentAccess.loading &&
      tournamentAccess.effectiveMode === "viewer") ||
    dashboard?.dashboard_type === "VIEWER";

  if (isViewer) {
    return <Navigate to="/viewer/dashboard" replace />;
  }

  useEffect(() => {
    let active = true;
    getSports()
      .then((rows) => {
        if (active) setSportsList(Array.isArray(rows) ? rows : []);
      })
      .catch((apiError) => {
        console.error(apiError);
        if (active) setSportsList([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const tournamentObj =
    (Array.isArray(tournaments)
      ? tournaments.find((t) => String(t.id) === String(selectedTournamentId))
      : null) || dashboard?.tournament || null;

  const workspaceId = selectedIntramural?.id ?? null;
  const operationalMode = Boolean(
    Array.isArray(dashboard?.schedule?.events) && dashboard.schedule.events.length > 0
  );

  return (
    <RoleDashboardShell
      role="department"
      eyebrow=""
      title=""
      subtitle=""
      showOverviewCard={false}
      loading={loading || !dashboard}
      error={error}
      headerAction={operationalMode ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <Link to="/department/standings" className="os-btn-ghost-soft inline-flex min-h-[var(--control-height-md)] flex-1 items-center justify-center gap-2 px-3 text-sm font-semibold sm:flex-none">
            View Standings
          </Link>
          <Link to="/department/schedules" className="os-btn-primary-soft inline-flex min-h-[var(--control-height-md)] flex-1 items-center justify-center gap-2 px-4 text-sm font-semibold sm:flex-none">
            View Matches
          </Link>
        </div>
      ) : null}
    >
      {dashboard ? (
        <DepartmentDashboardLayout
          dashboard={dashboard}
          sportsList={sportsList}
          startedTournament={tournamentObj}
          workspaceId={workspaceId}
        />
      ) : null}
    </RoleDashboardShell>
  );
};

export default DepartmentDashboard;
