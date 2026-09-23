import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getSportById } from "../../services/sportService";
import { getTeamRoster, getViewerApplicationTeams } from "../../services/teamService";
import { submitApplication } from "../../services/teamApplicationService";
import { applyToEntryPool, getVisibleEntryPools } from "../../services/entryPoolService";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import DashboardCard from "../../components/common/DashboardCard";
import LoadingState from "../../components/common/LoadingState";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";

const getPositionOptions = (sportName) => {
  const key = String(sportName || "").trim().toLowerCase();
  if (key.includes("basketball")) {
    return ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center", "Other"];
  }
  if (key.includes("volleyball")) {
    return ["Setter", "Libero", "Outside Hitter", "Middle Blocker", "Opposite Hitter", "Other"];
  }
  if (key.includes("badminton")) {
    return ["Singles Player", "Doubles Player", "Other"];
  }
  if (key.includes("chess")) {
    return ["Board Player", "Other"];
  }
  return ["Player", "Substitute", "Captain Candidate", "Other"];
};

const chipBaseClass =
  "rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400";
const chipActiveClass =
  "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-200";
const chipInactiveClass =
  "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800";

const TeamApplicationWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { teamId } = useParams();
  const [searchParams] = useSearchParams();
  const numericTeamId = Number(teamId);
  const routeTournamentId = Number(searchParams.get("tournament_id") || "");
  const targetType = searchParams.get("target") || "team";
  const stateTournamentId = Number(location?.state?.selectedTournamentId || "");
  const numericTournamentId = [routeTournamentId, stateTournamentId].find(
    (value) => Number.isInteger(value) && value > 0
  ) || 0;
  const hasValidTournamentId = Number.isInteger(numericTournamentId) && numericTournamentId > 0;
  const initialTeamSnapshot = location?.state?.teamSnapshot || null;
  const initialPoolSnapshot = location?.state?.poolSnapshot || null;

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [team, setTeam] = useState(
    initialTeamSnapshot && Number(initialTeamSnapshot?.id) === numericTeamId
      ? initialTeamSnapshot
      : null
  );
  const [currentPlayers, setCurrentPlayers] = useState(null);
  const [maxPlayers, setMaxPlayers] = useState(null);

  const [position, setPosition] = useState("");
  const [otherPosition, setOtherPosition] = useState("");
  const [formError, setFormError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const positionOptions = useMemo(() => getPositionOptions(team?.sport_name), [team?.sport_name]);

  useEffect(() => {
    if (!Number.isFinite(numericTeamId) || numericTeamId <= 0) {
      setLoadError("Invalid team ID.");
      setIsLoading(false);
      return;
    }
    if (!hasValidTournamentId) {
      setLoadError("Please select a tournament before applying.");
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const loadTeam = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        if (targetType === "entry_pool") {
          const poolRows = await getVisibleEntryPools(numericTournamentId);
          const poolList = Array.isArray(poolRows) ? poolRows : [];
          const selectedPool =
            poolList.find((row) => Number(row.id) === numericTeamId) ||
            (initialPoolSnapshot && Number(initialPoolSnapshot?.id) === numericTeamId
              ? initialPoolSnapshot
              : null);

          if (!selectedPool) {
            throw new Error("Entry pool not found.");
          }

          if (!mounted) return;
          setTeam({
            ...selectedPool,
            team_name: selectedPool.pool_name,
          });
          setCurrentPlayers(selectedPool.selected_entries_count || 0);
          const max = selectedPool.max_entries_allowed;
          setMaxPlayers(Number.isFinite(Number(max)) ? Number(max) : null);
        } else {
          const teamRows = await getViewerApplicationTeams(numericTournamentId);
          const teamList = Array.isArray(teamRows) ? teamRows : [];
          const selectedTeam =
            teamList.find((row) => Number(row.id) === numericTeamId) ||
            (initialTeamSnapshot && Number(initialTeamSnapshot?.id) === numericTeamId
              ? initialTeamSnapshot
              : null);

          if (!selectedTeam) {
            throw new Error("Team not found.");
          }

          const [roster, sport] = await Promise.all([
            getTeamRoster(selectedTeam.id, numericTournamentId).catch(() => null),
            getSportById(selectedTeam.sport_id).catch(() => null),
          ]);

          if (!mounted) return;
          setTeam(selectedTeam);
          setCurrentPlayers(Array.isArray(roster?.players) ? roster.players.length : null);
          const max =
            sport?.max_players ??
            sport?.configuration?.max_players ??
            sport?.sport_configuration?.max_players ??
            null;
          setMaxPlayers(Number.isFinite(Number(max)) ? Number(max) : null);
        }
      } catch (error) {
        if (!mounted) return;
        setLoadError(
          error?.response?.data?.detail ||
            error?.message ||
            "Unable to load team details for this application."
        );
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadTeam();

    return () => {
      mounted = false;
    };
  }, [hasValidTournamentId, initialPoolSnapshot, initialTeamSnapshot, numericTeamId, numericTournamentId, targetType]);

  const mapSubmitError = (error) => {
    const detail = error?.response?.data?.detail || "";
    const message = String(detail).toLowerCase();
    if (message.includes("already") && message.includes("application")) {
      return "You already have an active application for this team or sport.";
    }
    if (message.includes("outside your department") || message.includes("department")) {
      return "You cannot apply to a team outside your department.";
    }
    if (message.includes("full") || message.includes("roster")) {
      return "This team is already full.";
    }
    if (message.includes("not found")) {
      return "Team not found.";
    }
    if (message.includes("select a tournament") || message.includes("tournament")) {
      return "Please select a tournament before applying.";
    }
    if (message.includes("unauthorized") || error?.response?.status === 401 || error?.response?.status === 403) {
      return "You are not authorized to submit this application.";
    }
    return detail || "Failed to submit application.";
  };

  const handleSubmit = async () => {
    if (!team?.id) {
      setFormError("Team must be loaded before submitting.");
      return;
    }
    if (!String(position || "").trim()) {
      setFormError("Position / role is required.");
      return;
    }
    if (position === "Other" && !String(otherPosition || "").trim()) {
      setFormError("Please provide your role in the Other field.");
      return;
    }

    const finalPosition = position === "Other" ? String(otherPosition || "").trim() : position;

    setFormError("");
    setSubmitError("");
    setIsSubmitting(true);
    try {
      if (targetType === "entry_pool") {
        await applyToEntryPool(numericTeamId, { position: finalPosition || null });
      } else {
        await submitApplication({
          team_id: team.id,
          tournament_id: numericTournamentId,
          sport_id: team.sport_id,
          position: finalPosition || null,
        });
      }
      navigate(`/viewer/teams?tournament_id=${numericTournamentId}`, {
        state: {
          applicationSubmitted: true,
          message:
            "Your application has been submitted. You are now eligible for tryout. The coach will notify you about the tryout schedule and next steps.",
        },
      });
    } catch (errorObj) {
      setSubmitError(mapSubmitError(errorObj));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <LoadingState message="Loading application..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          <p className="font-semibold">Unable to start application</p>
          <p className="mt-1 text-sm">{loadError}</p>
        </div>
        <Link
          to={hasValidTournamentId ? `/viewer/teams?tournament_id=${numericTournamentId}` : "/viewer/teams"}
          className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Back to Teams
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6 lg:py-8">
      <PageHeaderCard
        title="Apply to Team"
        breadcrumbs="Viewer / Teams / Apply"
        action={
          <Link
            to={hasValidTournamentId ? `/viewer/teams?tournament_id=${numericTournamentId}` : "/viewer/teams"}
            className="os-btn-ghost text-sm font-semibold text-blue-700 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
          >
            Cancel & Back to Teams
          </Link>
        }
      />

      <DashboardCard className="mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Team Details</h3>
        <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-xs uppercase tracking-wide text-slate-500">Team Name</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{team?.team_name || "-"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-xs uppercase tracking-wide text-slate-500">Sport</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{getSportDisplayName(team, "-")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-xs uppercase tracking-wide text-slate-500">Department</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{team?.department_name || "-"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-xs uppercase tracking-wide text-slate-500">Coach</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{team?.coach_name || team?.coach_email || "-"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tournament</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{team?.tournament_name || "Unnamed tournament"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-xs uppercase tracking-wide text-slate-500">Current Roster / Max</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
              {(currentPlayers ?? "-") + " / " + (maxPlayers ?? "-")}
            </p>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard className="mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Preferred Playing Position / Role</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Select the role you want to take in this team. After applying, you will be eligible for tryout and the
          coach will notify you of the tryout schedule.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {positionOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setFormError("");
                setPosition(option);
              }}
              className={`${chipBaseClass} ${position === option ? chipActiveClass : chipInactiveClass}`}
            >
              {option}
            </button>
          ))}
        </div>
        {position === "Other" ? (
          <label className="mt-4 block text-sm text-slate-700 dark:text-slate-300">
            Other Role
            <input
              value={otherPosition}
              onChange={(event) => setOtherPosition(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              placeholder="Enter your preferred role"
            />
          </label>
        ) : null}

        {formError ? (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
            {formError}
          </div>
        ) : null}
        {submitError ? (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
            {submitError}
          </div>
        ) : null}
      </DashboardCard>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Link
          to={hasValidTournamentId ? `/viewer/teams?tournament_id=${numericTournamentId}` : "/viewer/teams"}
          className="w-full rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:w-auto"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full rounded-xl bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </button>
      </div>
    </div>
  );
};

export default TeamApplicationWizard;
