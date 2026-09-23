import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import { getSportById } from "../../services/sportService";
import { getTeamRoster, getViewerApplicationTeams } from "../../services/teamService";
import { getTournaments } from "../../services/tournamentService";
import { cancelEntryPoolApplication, getVisibleEntryPools } from "../../services/entryPoolService";
import {
  attachMedicalCertificate,
  cancelApplication,
  getMyApplications,
  uploadMedicalCertificate,
} from "../../services/teamApplicationService";
import AppModal from "../../components/common/AppModal";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import DashboardCard from "../../components/common/DashboardCard";
import MetricCard from "../../components/common/MetricCard";
import StatusBadge from "../../components/common/StatusBadge";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import { Users, CheckCircle, XCircle } from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceContext";
import { HistoricalBanner } from "../../components/intramural";
import { ApplicationQuotaBanner } from "../../components/dashboard/role_dashboard/layouts/dashboardLayoutUtils";
import { TeamLogo } from "../../components/common/IdentityImage";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";


const CANCELLABLE_STATUSES = new Set(["FOR_TRYOUT"]);
const ACTIVE_SLOT_STATUSES = new Set(["FOR_TRYOUT", "PENDING", "SUBMITTED", "ELIGIBLE", "TRYOUT_SCHEDULED", "ACCEPTED_AS_PLAYER", "APPROVED", "ACCEPTED"]);

const STATUS_META = {
  FOR_TRYOUT: {
    label: "For Tryout",
    hint: "Eligible for tryout",
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
  ACCEPTED_AS_PLAYER: {
    label: "Accepted",
    hint: "Official player",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: {
    label: "Rejected",
    hint: "Not accepted",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  CANCELLED: {
    label: "Cancelled",
    hint: "Application cancelled",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

const toUpper = (value) => String(value || "").trim().toUpperCase();
const participationSportKey = (row) => String(
  row?.sport_id || row?.sport_name || row?.sport_label || row?.sport || ""
).trim().toLowerCase();

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const statusInfo = (status) => {
  const normalized = toUpper(status);
  return STATUS_META[normalized] || {
    label: normalized || "Unknown",
    hint: "Status update",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };
};

const ViewerTeams = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedIntramural, isViewingHistorical } = useWorkspace();
  const selectedWorkspaceId = selectedIntramural?.id ?? null;

  const [teams, setTeams] = useState([]);
  const [entryPools, setEntryPools] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [sportCapsBySportId, setSportCapsBySportId] = useState({});
  const [rosterCountsByTeamId, setRosterCountsByTeamId] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState("");
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(
    searchParams.get("tournament_id") || ""
  );
  const tournamentAccess = useTournamentAccess(selectedTournamentId);

  const [cancelingApplicationId, setCancelingApplicationId] = useState(null);
  const [uploadingCertAppId, setUploadingCertAppId] = useState(null);
  const [cancelingPoolAppId, setCancelingPoolAppId] = useState(null);
  const [cancelModal, setCancelModal] = useState({
    open: false,
    applicationId: null,
    error: "",
  });

  const departmentLabel =
    user?.department_name || user?.department_code || user?.department_id || "Unknown";
  const selectedTournamentNumber = selectedTournamentId ? Number(selectedTournamentId) : null;
  const selectedTournament = useMemo(
    () => tournaments.find((row) => String(row?.id) === String(selectedTournamentId)) || null,
    [selectedTournamentId, tournaments]
  );
  const isPlayerMode =
    selectedTournamentId &&
    tournamentAccess.hasSelectedTournament &&
    !tournamentAccess.loading &&
    !tournamentAccess.error &&
    tournamentAccess.isPlayerMode;
  const pageTitle = isPlayerMode ? "My Team & Entries" : "Teams";
  const pageSubtitle = isPlayerMode
    ? "Apply to your department team, track roster status, and join visible entry pools."
    : "Apply to your department team and track your application status.";
  const pageBreadcrumbs = isPlayerMode ? "Player / My Team & Entries" : "Viewer / Teams";

  const scopedApplications = useMemo(() => {
    if (!selectedTournamentNumber) return [];
    return myApplications.filter((row) => Number(row?.tournament_id || 0) === selectedTournamentNumber);
  }, [myApplications, selectedTournamentNumber]);

  const applicationsByTeamId = useMemo(() => {
    const map = {};
    for (const row of scopedApplications) {
      if (!row?.team_id) continue;
      if (!map[row.team_id]) map[row.team_id] = row;
    }
    return map;
  }, [scopedApplications]);
  const teamById = useMemo(() => {
    const map = {};
    for (const row of teams) map[row.id] = row;
    return map;
  }, [teams]);
  const poolApplications = useMemo(
    () => entryPools.filter((pool) => pool?.my_application_id),
    [entryPools]
  );
  const activeSlotCount = useMemo(() => {
    return new Set([
      ...scopedApplications.filter((row) => ACTIVE_SLOT_STATUSES.has(toUpper(row?.application_status))),
      ...poolApplications.filter((row) => ACTIVE_SLOT_STATUSES.has(toUpper(row?.my_application_status || row?.application_status))),
    ].map(participationSportKey).filter(Boolean)).size;
  }, [poolApplications, scopedApplications]);
  const participationLimitReached = activeSlotCount >= 2;

  const summary = useMemo(() => {
    const counts = {
      forTryout: 0,
      accepted: 0,
      closed: 0,
    };
    for (const app of scopedApplications) {
      const status = toUpper(app?.application_status);
      if (status === "FOR_TRYOUT") counts.forTryout += 1;
      else if (status === "ACCEPTED_AS_PLAYER") counts.accepted += 1;
      else counts.closed += 1;
    }
    return counts;
  }, [scopedApplications]);

  const loadRosterAndCapData = useCallback(async (teamRows, tournamentId) => {
    const rosterPromises = (teamRows || []).map(async (team) => {
      try {
        const roster = await getTeamRoster(team.id, tournamentId || null);
        return [team.id, Array.isArray(roster?.players) ? roster.players.length : 0];
      } catch {
        return [team.id, null];
      }
    });

    const sportIdSet = new Set((teamRows || []).map((team) => Number(team.sport_id)).filter(Boolean));
    const sportPromises = [...sportIdSet].map(async (sportId) => {
      try {
        const sport = await getSportById(sportId);
        const max =
          sport?.max_players ??
          sport?.configuration?.max_players ??
          sport?.sport_configuration?.max_players ??
          null;
        return [sportId, Number.isFinite(Number(max)) ? Number(max) : null];
      } catch {
        return [sportId, null];
      }
    });

    const rosterResults = await Promise.all(rosterPromises);
    const capResults = await Promise.all(sportPromises);

    const rosterMap = {};
    for (const [teamId, count] of rosterResults) rosterMap[teamId] = count;
    setRosterCountsByTeamId(rosterMap);

    const capMap = {};
    for (const [sportId, max] of capResults) capMap[sportId] = max;
    setSportCapsBySportId(capMap);
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedTournamentNumber) {
      setTeams([]);
      setEntryPools([]);
      setMyApplications([]);
      setSportCapsBySportId({});
      setRosterCountsByTeamId({});
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setPageMessage("");
    try {
      const [teamRows, poolRows, myAppPayload] = await Promise.all([
        getViewerApplicationTeams(selectedTournamentNumber),
        getVisibleEntryPools(selectedTournamentNumber),
        getMyApplications(),
      ]);
      const normalizedTeams = Array.isArray(teamRows) ? teamRows : [];
      const normalizedPools = Array.isArray(poolRows) ? poolRows : [];
      const normalizedApps = Array.isArray(myAppPayload?.items) ? myAppPayload.items : [];
      setTeams(normalizedTeams);
      setEntryPools(normalizedPools);
      setMyApplications(normalizedApps);
      await loadRosterAndCapData(normalizedTeams, selectedTournamentNumber);
    } catch (error) {
      setPageMessage(error?.response?.data?.detail || "Failed to load team applications.");
    } finally {
      setIsLoading(false);
    }
  }, [loadRosterAndCapData, selectedTournamentNumber]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const queryTournamentId = searchParams.get("tournament_id") || "";
    if (queryTournamentId && queryTournamentId !== selectedTournamentId) {
      setSelectedTournamentId(queryTournamentId);
    }
  }, [searchParams, selectedTournamentId]);

  useEffect(() => {
    let mounted = true;
    const loadTournaments = async () => {
      try {
        const rows = await getTournaments(selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : {});
        if (!mounted) return;
        const items = Array.isArray(rows) ? rows : [];
        setTournaments(items);
        const currentValid = items.some(
          (row) => String(row?.id || "") === String(selectedTournamentId || "")
        );
        if ((!selectedTournamentId || !currentValid) && items.length > 0) {
          const active = items.find((row) => String(row?.status || "").toUpperCase() === "ONGOING");
          const fallback = active || items[0];
          if (fallback?.id) {
            const nextId = String(fallback.id);
            setSelectedTournamentId(nextId);
            const next = new URLSearchParams(searchParams);
            next.set("tournament_id", nextId);
            setSearchParams(next);
          }
        } else if (items.length === 0) {
          setSelectedTournamentId("");
        }
      } catch (error) {
        if (!mounted) return;
        setPageMessage(error?.response?.data?.detail || "Unable to load tournaments.");
      }
    };
    loadTournaments();
    return () => {
      mounted = false;
    };
  }, [searchParams, selectedTournamentId, selectedWorkspaceId, setSearchParams]);

  useEffect(() => {
    if (!location?.state?.applicationSubmitted) return;
    setPageMessage(
      location.state.message ||
        "Your application has been submitted. The coach will review your information and notify you about the next step."
    );
    navigate(`${location.pathname}${location.search || ""}`, { replace: true, state: null });
  }, [location, navigate]);

  const handleTournamentChange = (value) => {
    setSelectedTournamentId(value);
    const next = new URLSearchParams(searchParams);
    if (value) next.set("tournament_id", value);
    else next.delete("tournament_id");
    setSearchParams(next);
  };

  const handleCancelApplication = async (applicationId) => {
    setCancelingApplicationId(applicationId);
    try {
      await cancelApplication(applicationId);
      setPageMessage("Application cancelled.");
      setCancelModal({ open: false, applicationId: null, error: "" });
      await loadData();
    } catch (error) {
      const message = error?.response?.data?.detail || "Failed to cancel application.";
      setPageMessage(message);
      setCancelModal((prev) => ({ ...prev, error: message }));
    } finally {
      setCancelingApplicationId(null);
    }
  };

  const handleUploadCertificate = async (applicationId, file) => {
    if (!file) return;
    setUploadingCertAppId(applicationId);
    setPageMessage("");
    try {
      const uploadResult = await uploadMedicalCertificate(file);
      const fileUrl = String(uploadResult?.file_url || "").trim();
      if (!fileUrl) {
        throw new Error("Medical certificate upload failed.");
      }
      await attachMedicalCertificate(applicationId, fileUrl);
      setPageMessage("Medical certificate uploaded successfully.");
      await loadData();
    } catch (error) {
      setPageMessage(
        error?.response?.data?.detail ||
          error?.message ||
          "Failed to upload medical certificate. Please upload a valid file (PDF/JPG/PNG/WEBP)."
      );
    } finally {
      setUploadingCertAppId(null);
    }
  };

  const handleCancelPoolApplication = async (applicationId) => {
    setCancelingPoolAppId(applicationId);
    setPageMessage("");
    try {
      await cancelEntryPoolApplication(applicationId);
      setPageMessage("Entry pool application cancelled.");
      await loadData();
    } catch (error) {
      setPageMessage(error?.response?.data?.detail || "Failed to cancel entry pool application.");
    } finally {
      setCancelingPoolAppId(null);
    }
  };

  const handleApplyToPool = (poolId) => {
    if (!selectedTournamentId) {
      setPageMessage("Please select a tournament before applying.");
      return;
    }
    if (participationLimitReached) {
      setPageMessage("Both participation slots are currently used. A rejected, withdrawn, or cancelled application will release a slot.");
      return;
    }
    const pool = entryPools.find(p => p.id === poolId);
    if (!pool?.applications_open) {
      setPageMessage("Applications are currently closed for this entry pool.");
      return;
    }
    navigate(`/viewer/teams/${poolId}/apply?tournament_id=${selectedTournamentId}&target=entry_pool`, {
      state: {
        poolSnapshot: pool,
        selectedTournamentId: selectedTournamentId,
      },
    });
  };

  const handleApply = (team) => {
    if (!selectedTournamentId) {
      setPageMessage("Please select a tournament before applying.");
      return;
    }
    if (participationLimitReached) {
      setPageMessage("Both participation slots are currently used. A rejected, withdrawn, or cancelled application will release a slot.");
      return;
    }
    if (!team?.can_apply) {
      if (team?.latest_application_canonical_status || team?.latest_application_status) {
        setPageMessage("You already have an active application for this tournament team.");
      } else {
        setPageMessage("Applications are currently closed for this tournament team.");
      }
      return;
    }

    navigate(`/viewer/teams/${team.id}/apply?tournament_id=${selectedTournamentId}`, {
      state: {
        teamSnapshot: team,
        selectedTournamentId: selectedTournamentId,
      },
    });
  };

  return (
    <div className="os-page-shell max-w-7xl mx-auto">
      {isViewingHistorical && <HistoricalBanner />}
      <PageHeaderCard
        title={pageTitle}
        subtitle={pageSubtitle}
        breadcrumbs={pageBreadcrumbs}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedTournamentId}
              onChange={(event) => handleTournamentChange(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">Select Tournament</option>
              {tournaments.map((row) => (
                <option key={`viewer-team-tournament-${row.id}`} value={row.id}>
                  {row.tournament_name || "Unnamed tournament"}
                </option>
              ))}
            </select>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50">
              Department: <span className="font-bold text-slate-700 dark:text-slate-200">{departmentLabel}</span>
            </div>
          </div>
        }
      />

      {pageMessage ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200">
          {pageMessage}
        </div>
      ) : null}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="For Tryout" value={summary.forTryout} icon={Users} color="blue" />
        <MetricCard title="Accepted" value={summary.accepted} icon={CheckCircle} color="green" />
        <MetricCard title="Closed" value={summary.closed} icon={XCircle} color="slate" />
      </section>

      {selectedTournamentId ? (
        <div className="mb-6">
          <ApplicationQuotaBanner
            approvedCount={activeSlotCount}
            maxQuota={2}
            totalApplications={scopedApplications.length + poolApplications.length}
          />
        </div>
      ) : null}

      <DashboardCard className="mb-6">

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Available Teams</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Teams are shown for the selected tournament and your department only.
          </p>
        </div>
        {!selectedTournamentId ? (
          <EmptyState message="Select a tournament to view teams you can apply to." />
        ) : null}
        {selectedTournamentId && isLoading ? (
          <LoadingState message="Loading available teams..." />
        ) : selectedTournamentId && teams.length === 0 ? (
          <EmptyState message="No visible team registration slots are currently available for your department." />
        ) : selectedTournamentId ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => {
              const status = toUpper(team.latest_application_canonical_status || team.latest_application_status);
              const info = statusInfo(status);
              const currentPlayers = rosterCountsByTeamId[team.id];
              const maxPlayers = sportCapsBySportId[team.sport_id];
              const statusRow = applicationsByTeamId[team.id];

              return (
                <div key={team.id} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-blue-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <TeamLogo imageUrl={team.logo_url} label={team.team_name} scale="lg" className="shrink-0" />
                      <h3 className="min-w-0 break-words text-base font-bold text-slate-900 dark:text-white">{team.team_name}</h3>
                    </div>
                    {status ? <StatusBadge status={status} /> : null}
                  </div>
                  
                  <div className="mt-4 flex-1 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700/50">
                      <span className="text-slate-500">Sport</span>
                      <span className="font-medium">{getSportDisplayName(team, "-")}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700/50">
                      <span className="text-slate-500">Coach</span>
                      <span className="font-medium">{team.coach_name || team.coach_email || "Not assigned"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700/50">
                      <span className="text-slate-500">Roster</span>
                      <span className="font-medium">{currentPlayers ?? "-"} / {maxPlayers ?? "-"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700/50">
                      <span className="text-slate-500">Applications</span>
                      <span className="font-medium">{team.applications_open ? "Open" : "Closed"}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    {status ? (
                      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{info.hint}</p>
                    ) : !team.applications_open ? (
                      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Coach has not opened applications yet.</p>
                    ) : !team.coach_id ? (
                      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Coach assignment is still pending.</p>
                    ) : (
                      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">No application submitted yet.</p>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!team.can_apply || !selectedTournamentId || participationLimitReached}
                        onClick={() => handleApply(team)}
                        className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {participationLimitReached && !status ? "Participation Limit Reached" : team.can_apply ? "Apply for This Tournament" : status ? "Applied" : "Applications Closed"}
                      </button>
                      {statusRow && CANCELLABLE_STATUSES.has(toUpper(statusRow.application_status)) ? (
                        <button
                          type="button"
                          onClick={() => setCancelModal({ open: true, applicationId: statusRow.id, error: "" })}
                          disabled={cancelingApplicationId === statusRow.id}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          {cancelingApplicationId === statusRow.id ? "..." : "Cancel"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </DashboardCard>

      <DashboardCard className="mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Individual / Pair Entry Pools</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Apply to SOLO and DUO recruitment pools in your department before the coach finalizes actual entries.
          </p>
        </div>
        {!selectedTournamentId ? (
          <EmptyState message="Select a tournament to view entry pools you can apply to." />
        ) : selectedTournamentId && isLoading ? (
          <LoadingState message="Loading entry pools..." />
        ) : selectedTournamentId && entryPools.length === 0 ? (
          <EmptyState message="No visible SOLO or DUO entry pools are currently available for your department." />
        ) : selectedTournamentId ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {entryPools.map((pool) => {
              const status = toUpper(pool.my_application_status);
              const info = statusInfo(status);
              const canApply = Boolean(pool.applications_open) && !status && !participationLimitReached;
              return (
                <div key={`entry-pool-${pool.id}`} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-blue-700">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{pool.pool_name}</h3>
                    {status ? <StatusBadge status={status} /> : <StatusBadge status={pool.status} />}
                  </div>
                  <div className="mt-4 flex-1 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700/50">
                      <span className="text-slate-500">Sport</span>
                      <span className="font-medium">{getSportDisplayName(pool, "-")}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700/50">
                      <span className="text-slate-500">Shape</span>
                      <span className="font-medium">{pool.participant_shape}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700/50">
                      <span className="text-slate-500">Coach</span>
                      <span className="font-medium">{pool.coach_name || "Not assigned"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700/50">
                      <span className="text-slate-500">Applications</span>
                      <span className="font-medium">{pool.applications_open ? "Open" : "Closed"}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    {status ? (
                      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{info.hint}</p>
                    ) : !pool.applications_open ? (
                      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Coach has not opened applications yet.</p>
                    ) : !pool.coach_user_id ? (
                      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Coach assignment is still pending.</p>
                    ) : (
                      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">No application submitted yet.</p>
                    )}
                    <button
                      type="button"
                      disabled={!canApply}
                      onClick={() => handleApplyToPool(pool.id)}
                      className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {canApply
                        ? "Apply to Entry Pool"
                        : status
                            ? "Applied"
                            : participationLimitReached ? "Participation Limit Reached" : "Applications Closed"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </DashboardCard>

      <DashboardCard>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">My Applications</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          {selectedTournament
            ? `Applications for ${selectedTournament.tournament_name || "Selected tournament"}.`
            : "Select a tournament to review your application statuses."}
        </p>
        <DataTable
          emptyState={
            <EmptyState message="No applications found for the selected tournament." />
          }
          columns={[
            {
              header: "Team",
              accessor: "team_name",
              cellClassName: "font-medium text-slate-900 dark:text-white",
              render: (row) => {
                const team = teamById[row.team_id];
                const name = row.team_name || team?.team_name || "Unnamed team";
                return <span className="flex min-w-0 items-center gap-2"><TeamLogo imageUrl={team?.logo_url} label={name} scale="sm" className="shrink-0" /><span className="break-words">{name}</span></span>;
              },
            },
            { 
              header: "Sport", 
              accessor: "sport", 
              render: (row) => teamById[row.team_id]?.sport_name || "Unassigned sport"
            },
            { 
              header: "Status", 
              accessor: "status", 
              render: (row) => <StatusBadge status={row.application_status} />
            },
            { 
              header: "Applied", 
              accessor: "created_at", 
              render: (row) => formatDateTime(row.created_at)
            },
            { header: "Decision Note", accessor: "decision_note", render: (row) => row.decision_note || "-" },
            {
              header: "Action",
              accessor: "action",
              className: "text-right",
              cellClassName: "text-right",
              render: (row) => {
                const status = toUpper(row.application_status);
                const isCancellable = CANCELLABLE_STATUSES.has(status);
                if (isCancellable) {
                  return (
                    <button
                      type="button"
                      disabled={cancelingApplicationId === row.id}
                      onClick={() => setCancelModal({ open: true, applicationId: row.id, error: "" })}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {cancelingApplicationId === row.id ? "Cancelling..." : "Cancel"}
                    </button>
                  );
                }
                if (status === "ACCEPTED_AS_PLAYER") {
                  const hasCertificate = Boolean(String(row.health_notes || "").trim());
                  if (hasCertificate) {
                    return (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Certificate uploaded
                      </span>
                    );
                  }
                  return (
                    <label className="inline-flex cursor-pointer items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500">
                      {uploadingCertAppId === row.id ? "Uploading..." : "Upload Medical Certificate"}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                        disabled={uploadingCertAppId === row.id}
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          event.target.value = "";
                          handleUploadCertificate(row.id, file);
                        }}
                        className="hidden"
                      />
                    </label>
                  );
                }
                return <span className="text-xs text-slate-400">No actions</span>;
              }
            }
          ]}
          data={scopedApplications}
        />
      </DashboardCard>

      {selectedTournamentId ? (
        <DashboardCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">My Entry Pool Applications</h2>
          <DataTable
            emptyState={<EmptyState message="No entry pool applications found for the selected tournament." />}
            columns={[
              { header: "Pool", accessor: "pool_name", render: (row) => row.pool_name || "Unnamed pool" },
              { header: "Sport", accessor: "sport_name", render: (row) => getSportDisplayName(row, "-") },
              { header: "Shape", accessor: "participant_shape" },
              { header: "Status", accessor: "my_application_status", render: (row) => <StatusBadge status={row.my_application_status} /> },
              {
                header: "Action",
                accessor: "action",
                className: "text-right",
                cellClassName: "text-right",
                render: (row) => {
                  if (!CANCELLABLE_STATUSES.has(toUpper(row.my_application_status))) {
                    return <span className="text-xs text-slate-400">No actions</span>;
                  }
                  return (
                    <button
                      type="button"
                      disabled={cancelingPoolAppId === row.my_application_id}
                      onClick={() => handleCancelPoolApplication(row.my_application_id)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {cancelingPoolAppId === row.my_application_id ? "Cancelling..." : "Cancel"}
                    </button>
                  );
                },
              },
            ]}
            data={poolApplications}
          />
        </DashboardCard>
      ) : null}

      <AppModal
        open={cancelModal.open}
        onClose={() => {
          if (cancelingApplicationId) return;
          setCancelModal({ open: false, applicationId: null, error: "" });
        }}
        title="Cancel application?"
        subtitle="This will withdraw your current team application."
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Are you sure you want to cancel this application?
          </p>
          {cancelModal.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              {cancelModal.error}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCancelModal({ open: false, applicationId: null, error: "" })}
              disabled={Boolean(cancelingApplicationId)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleCancelApplication(cancelModal.applicationId)}
              disabled={Boolean(cancelingApplicationId) || !cancelModal.applicationId}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
            >
              {cancelingApplicationId ? "Cancelling..." : "Confirm Cancel"}
            </button>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

export default ViewerTeams;
