import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileUp } from "lucide-react";
import AppModal from "../../components/common/AppModal";
import ViewerDashboardLayout from "../../components/dashboard/role_dashboard/layouts/ViewerDashboardLayout";
import PlayerDashboardLayout from "../../components/dashboard/role_dashboard/layouts/PlayerDashboardLayout";
import { RoleDashboardShell } from "../../components/intramural";
import useRoleDashboardData from "../../hooks/useRoleDashboardData";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import { getBrackets } from "../../services/bracketService";
import { getSports } from "../../services/sportService";
import { getTournamentDateRange } from "../../components/dashboard/role_dashboard/layouts/dashboardLayoutUtils";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";
import { useAuth } from "../../context/AuthContext";
import { requestTournamentAccessRefresh } from "../../utils/tournamentAccess";


import {
  attachEntryPoolMedicalCertificate,
  confirmEntryPoolApplicationAsPlayer,
  getEntryPoolTryoutSchedule,
  getVisibleEntryPools,
} from "../../services/entryPoolService";
import { getTeamRoster, getViewerApplicationTeams } from "../../services/teamService";
import {
  attachMedicalCertificate,
  confirmAcceptedApplicationAsPlayer,
  getApplication,
  getMyApplications,
  getTeamTryoutSchedule,
  uploadMedicalCertificate,
} from "../../services/teamApplicationService";

const buildViewerTeamsHref = (tournamentId) => {
  const normalized = Number(tournamentId || 0);
  return normalized > 0 ? `/viewer/teams?tournament_id=${normalized}` : "/viewer/teams";
};

const toUpper = (value) => String(value || "").trim().toUpperCase();

const extractMedicalCertificateUrl = (healthNotes) => {
  const raw = String(healthNotes || "").trim();
  if (!raw) return "";
  const match = raw.match(/(\/static\/uploads\/team_applications_medical\/\S+|https?:\/\/\S+)/i);
  return match ? String(match[1] || "").trim() : "";
};

const getMedicalCertificateStatus = (row) => {
  const fromApi = String(row?.medical_certificate_status || "").trim().toUpperCase();
  if (fromApi) return fromApi;
  const raw = String(row?.health_notes || "").trim();
  if (!extractMedicalCertificateUrl(raw)) return "NOT_SUBMITTED";
  const statusLine = raw
    .replace(/\r/g, "\n")
    .split("\n")
    .find((line) => line.trim().toLowerCase().startsWith("medical certificate status:"));
  if (!statusLine) return "PENDING";
  const status = statusLine.split(":", 2)[1]?.trim().toUpperCase() || "PENDING";
  return ["PENDING", "RECEIVED", "REJECTED"].includes(status) ? status : "PENDING";
};

const applicationLifecycleKey = (application) => {
  if (!application) return "";
  const source = String(application.sourceType || "TEAM").toUpperCase();
  const ownerId =
    source === "POOL"
      ? Number(application.pool_id || application.id || 0)
      : Number(application.team_id || application.id || 0);
  return `${source}:${ownerId}:${Number(application.id || 0)}`;
};

const Dashboard = () => {
  const { user } = useAuth();
  const {
    dashboard,
    tournaments,
    selectedTournamentId,
    selectedTournamentName,
    loading,
    error,
  } = useRoleDashboardData({ autoRefreshOnTournamentChange: true });
  const tournamentAccess = useTournamentAccess(selectedTournamentId);
  const [brackets, setBrackets] = useState([]);
  const [, setBracketsLoading] = useState(false);
  const [bracketsError, setBracketsError] = useState("");
  const [sportsList, setSportsList] = useState([]);
  const [applicationPreview, setApplicationPreview] = useState({
    loading: false,
    error: "",
    items: [],
    totalOpen: 0,
  });
  const [applicationLifecycle, setApplicationLifecycle] = useState({
    loading: false,
    error: "",
    primary: null,
    items: [],
    schedulesByKey: {},
    schedule: null,
    tryoutDone: false,
    hasGeneratedBracket: false,
    uploading: false,
    approvedCount: 0,
    totalCount: 0,
    roster: null,
  });
  const [rosterModal, setRosterModal] = useState({
    open: false,
    loading: false,
    error: "",
    application: null,
    roster: null,
  });
  const [medicalUploadFile, setMedicalUploadFile] = useState(null);

  const roleType = String(dashboard?.dashboard_type || "VIEWER").trim().toUpperCase();
  const isPlayer =
    tournamentAccess.hasSelectedTournament && !tournamentAccess.loading
      ? tournamentAccess.isPlayerMode
      : roleType === "PLAYER";
  const isResolvingTournamentRole = tournamentAccess.hasSelectedTournament && tournamentAccess.loading;

  const loadBrackets = useCallback(async () => {
    setBracketsLoading(true);
    setBracketsError("");
    try {
      const rows = await getBrackets();
      setBrackets(Array.isArray(rows) ? rows : []);
    } catch (apiError) {
      console.error(apiError);
      setBrackets([]);
      setBracketsError(apiError?.response?.data?.detail || "Unable to load bracket summaries.");
    } finally {
      setBracketsLoading(false);
    }
  }, []);

  const loadSports = useCallback(async () => {
    try {
      const rows = await getSports();
      setSportsList(Array.isArray(rows) ? rows : []);
    } catch (apiError) {
      console.error(apiError);
      setSportsList([]);
    }
  }, []);

  useEffect(() => {
    if (isPlayer) return;
    loadBrackets();
    loadSports();
  }, [isPlayer, loadBrackets, loadSports]);

  useEffect(() => {
    let alive = true;
    const tournamentId = Number(selectedTournamentId || 0);
    if (isPlayer || tournamentId <= 0) {
      setApplicationPreview({ loading: false, error: "", items: [], totalOpen: 0 });
      return undefined;
    }

    setApplicationPreview((prev) => ({ ...prev, loading: true, error: "" }));
    Promise.all([
      getViewerApplicationTeams(tournamentId),
      getVisibleEntryPools(tournamentId),
    ])
      .then(([teamsPayload, poolsPayload]) => {
        if (!alive) return;
        const teamItems = (Array.isArray(teamsPayload) ? teamsPayload : [])
          .filter((team) => team?.applications_open && team?.can_apply)
          .map((team) => ({
            id: `team-${team.id}`,
            type: "TEAM",
            name: team.team_name || "Team entry",
            sportName: team.sport_name || "Sport",
            coachName: team.coach_name || team.coach_email || "Coach assigned",
            href: `/viewer/teams/${team.id}/apply?tournament_id=${tournamentId}`,
          }));
        const poolItems = (Array.isArray(poolsPayload) ? poolsPayload : [])
          .filter((pool) => pool?.applications_open && !pool?.my_application_status)
          .map((pool) => ({
            id: `pool-${pool.id}`,
            type: String(pool.participant_shape || "ENTRY").toUpperCase(),
            name: pool.pool_name || "Entry pool",
            sportName: pool.sport_name || "Sport",
            coachName: pool.coach_name || "Coach assigned",
            href: `/viewer/teams/${pool.id}/apply?tournament_id=${tournamentId}&target=entry_pool`,
          }));
        const items = [...teamItems, ...poolItems].sort((left, right) => {
          const sportCompare = String(left?.sportName || "").localeCompare(String(right?.sportName || ""));
          if (sportCompare !== 0) return sportCompare;
          return String(left?.name || "").localeCompare(String(right?.name || ""));
        });
        setApplicationPreview({
          loading: false,
          error: "",
          items: items.slice(0, 3),
          totalOpen: items.length,
        });
      })
      .catch((apiError) => {
        if (!alive) return;
        setApplicationPreview({
          loading: false,
          error: apiError?.response?.data?.detail || "Available applications could not be loaded.",
          items: [],
          totalOpen: 0,
        });
      });

    return () => {
      alive = false;
    };
  }, [isPlayer, selectedTournamentId]);

  const startedTournament = useMemo(
    () => (Array.isArray(tournaments) ? tournaments : []).find((row) => Number(row.id) === Number(selectedTournamentId || 0)) || null,
    [selectedTournamentId, tournaments]
  );

  const bracketSummaryRows = useMemo(() => {
    const tournamentId = Number(selectedTournamentId || 0);
    if (tournamentId <= 0) return [];
    return brackets
      .filter((row) => Number(row?.tournament_id || 0) === tournamentId)
      .map((row) => ({
        id: Number(row?.id || 0),
        sportId: Number(row?.sport_id || 0),
        sportName: String(row?.sport_name || row?.sport || "").trim(),
        format: String(row?.format || "").trim(),
        matchCount: Number(row?.match_count || 0),
        status: String(row?.status || "DRAFT").toUpperCase(),
      }))
      .sort((left, right) => String(left?.sportName || "").localeCompare(String(right?.sportName || "")));
  }, [brackets, selectedTournamentId]);

  const loadApplicationLifecycle = useCallback(async () => {
    const tournamentId = Number(selectedTournamentId || 0);
    if (tournamentId <= 0) {
      setApplicationLifecycle((prev) => ({
        ...prev,
        loading: false,
        primary: null,
        items: [],
        schedulesByKey: {},
        schedule: null,
        tryoutDone: false,
        approvedCount: 0,
        totalCount: 0,
        roster: null,
      }));
      return;
    }

    setApplicationLifecycle((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const [appsPayload, poolsPayload] = await Promise.all([
        getMyApplications(),
        getVisibleEntryPools(tournamentId).catch(() => []),
      ]);
      const teamApps = (Array.isArray(appsPayload?.items) ? appsPayload.items : [])
        .filter((app) => Number(app?.tournament_id || 0) === tournamentId)
        .map((app) => ({ ...app, sourceType: "TEAM" }));
      const poolApps = (Array.isArray(poolsPayload) ? poolsPayload : [])
        .filter((pool) => pool?.my_application_id)
        .map((pool) => ({
          ...pool,
          id: pool.my_application_id,
          sourceType: "POOL",
          pool_id: pool.id,
          application_status: pool.my_application_status,
          player_membership_confirmed: Boolean(pool.my_application_confirmed),
          pool_name: pool.pool_name,
        }));
      const priority = { ACCEPTED_AS_PLAYER: 0, FOR_TRYOUT: 1, REJECTED: 2, CANCELLED: 3 };
      
      const rawApplications = [...teamApps, ...poolApps];
      const approvedCount = new Set(
        rawApplications
          .filter((app) => toUpper(app.application_status) === "ACCEPTED_AS_PLAYER" || Boolean(app.player_membership_confirmed))
          .map((app) => String(app.sport_id || app.sport_name || app.sport_label || "").trim().toLowerCase())
          .filter(Boolean)
      ).size;
      if (approvedCount > 0 && tournamentAccess.isViewerMode) {
        requestTournamentAccessRefresh({ tournament_id: tournamentId });
      }

      const applications = rawApplications
        .map((app) => {
          const isAccepted = toUpper(app.application_status) === "ACCEPTED_AS_PLAYER" || Boolean(app.player_membership_confirmed);
          return {
            ...app,
            isLockedByCap: !isAccepted && approvedCount >= 2,
          };
        })
        .sort((left, right) => {
          const leftStatus = priority[toUpper(left.application_status)] ?? 9;
          const rightStatus = priority[toUpper(right.application_status)] ?? 9;
          if (leftStatus !== rightStatus) return leftStatus - rightStatus;
          const sportCompare = String(left.sport_name || "").localeCompare(String(right.sport_name || ""));
          if (sportCompare !== 0) return sportCompare;
          return Number(right.id || 0) - Number(left.id || 0);
        });
      const primary = applications[0] || null;

      const scheduleEntries = await Promise.all(
        applications.map(async (application) => {
          const key = applicationLifecycleKey(application);
          try {
            if (application.sourceType === "TEAM" && application.team_id) {
              const res = await getTeamTryoutSchedule(application.team_id, tournamentId);
              return [key, res?.schedule || null];
            }
            if (application.sourceType === "POOL" && application.pool_id) {
              const res = await getEntryPoolTryoutSchedule(application.pool_id);
              return [key, res?.schedule || null];
            }
          } catch {
            return [key, null];
          }
          return [key, null];
        })
      );
      const schedulesByKey = {};
      for (const [key, value] of scheduleEntries) {
        if (key) schedulesByKey[key] = value;
      }
      const schedule = primary ? schedulesByKey[applicationLifecycleKey(primary)] || null : null;
      let roster = null;
      if (primary?.sourceType === "TEAM" && primary?.team_id) {
        roster = await getTeamRoster(primary.team_id, tournamentId).catch(() => null);
      } else if (primary?.sourceType === "POOL") {
        roster = {
          team_name: primary.pool_name || primary.event_name || "My Entry",
          coach: primary.coach_name ? { name: primary.coach_name } : null,
          players: Array.isArray(primary.accepted_teammates) ? primary.accepted_teammates : [],
        };
      }

      setApplicationLifecycle({
        loading: false,
        error: "",
        primary,
        items: applications,
        schedulesByKey,
        schedule,
        tryoutDone: schedule?.scheduled_date
          ? new Date(schedule.scheduled_date).getTime() <= Date.now()
          : false,
        hasGeneratedBracket: bracketSummaryRows.some((row) => ["GENERATED", "ACTIVE", "LIVE", "RUNNING"].includes(toUpper(row.status))),
        uploading: false,
        approvedCount,
        totalCount: applications.length,
        roster,
      });
    } catch (apiError) {
      setApplicationLifecycle({
        loading: false,
        error: apiError?.response?.data?.detail || "Unable to load application progress.",
        primary: null,
        items: [],
        schedulesByKey: {},
        schedule: null,
        tryoutDone: false,
        hasGeneratedBracket: false,
        uploading: false,
        approvedCount: 0,
        totalCount: 0,
        roster: null,
      });
    }
  }, [bracketSummaryRows, selectedTournamentId, tournamentAccess.isViewerMode]);


  useEffect(() => {
    loadApplicationLifecycle();
  }, [loadApplicationLifecycle]);

  const viewerTeamsHref = buildViewerTeamsHref(selectedTournamentId);

  const handleConfirmPlayer = async (application) => {
    if (!application?.id) return;

    // The participation limit is two distinct sports, not two event entries.
    const currentApprovedCount = Number(applicationLifecycle.approvedCount || 0);
    const isAlreadyConfirmed = Boolean(application?.player_membership_confirmed || application?.my_application_confirmed);
    if (!isAlreadyConfirmed && currentApprovedCount >= 2) {
      setRosterModal((prev) => ({
        ...prev,
        error: "Participation limit reached: you are already participating in 2 sports for this Intramural.",
      }));
      return;
    }

    setRosterModal((prev) => ({ ...prev, confirming: true, error: "" }));
    try {
      if (application.sourceType === "POOL") {
        await confirmEntryPoolApplicationAsPlayer(application.id);
      } else {
        await confirmAcceptedApplicationAsPlayer(application.id);
      }
      setRosterModal((prev) => ({
        ...prev,
        open: true,
        loading: false,
        confirming: false,
        error: "",
        application: {
          ...(prev.application || application),
          player_membership_confirmed: true,
          my_application_confirmed: true,
        },
      }));
      if (application.sourceType !== "POOL" && application.team_id) {
        try {
          const roster = await getTeamRoster(application.team_id, Number(selectedTournamentId || 0) || null);
          setRosterModal((prev) => ({ ...prev, roster }));
        } catch {
          // Keep the confirmation dialog open even if roster refresh fails.
        }
      }
      await loadApplicationLifecycle();
    } catch (apiError) {
      const detail = apiError?.response?.data?.detail;
      const message = apiError?.response?.status === 409 && /roster.*full|team.*full/i.test(String(detail || ""))
        ? "This team already has the maximum number of players. You cannot join this team unless a place becomes available."
        : typeof detail === "string"
          ? detail
          : "Your place could not be confirmed. Please refresh the page and try again.";
      setRosterModal((prev) => ({ ...prev, confirming: false, error: message }));
    }
  };


  const handleUploadCertificate = async (application, file) => {
    if (!application?.id || !file) return;
    setApplicationLifecycle((prev) => ({ ...prev, uploading: true }));
    try {
      const uploadResult = await uploadMedicalCertificate(file);
      const fileUrl = String(uploadResult?.file_url || "").trim();
      if (!fileUrl) throw new Error("Medical certificate upload failed.");
      if (application.sourceType === "POOL") {
        await attachEntryPoolMedicalCertificate(application.id, fileUrl);
      } else {
        await attachMedicalCertificate(application.id, fileUrl);
      }
      setMedicalUploadFile(null);
      setRosterModal((prev) => ({
        ...prev,
        application: prev.application
          ? {
              ...prev.application,
              health_notes: `Medical Certificate Attachment: ${fileUrl}\nMedical Certificate Status: PENDING`,
              medical_certificate_url: fileUrl,
              medical_certificate_status: "PENDING",
              medical_certificate_submitted: true,
            }
          : prev.application,
      }));
      await loadApplicationLifecycle();
    } catch (apiError) {
      setApplicationLifecycle((prev) => ({
        ...prev,
        uploading: false,
        error: apiError?.response?.data?.detail || apiError?.message || "Unable to upload medical certificate.",
      }));
    }
  };

  const handleOpenRoster = async (selectedApplication = null) => {
    const application = selectedApplication || applicationLifecycle.primary;
    setRosterModal({ open: true, loading: true, error: "", application, roster: null });
    try {
      if (application?.sourceType === "POOL") {
        setRosterModal({
          open: true,
          loading: false,
          error: "",
          application,
          roster: null,
        });
        return;
      }
      if (!application?.team_id) {
        setRosterModal({
          open: true,
          loading: false,
          error: "",
          application,
          roster: null,
        });
        return;
      }
      if (!application?.player_membership_confirmed) {
        const detail = await getApplication(application.id);
        setRosterModal({
          open: true,
          loading: false,
          error: "",
          application: { ...application, ...detail },
          roster: null,
        });
        return;
      }
      const roster = await getTeamRoster(application.team_id, Number(selectedTournamentId || 0) || null);
      setRosterModal({ open: true, loading: false, error: "", application, roster });
    } catch (apiError) {
      setRosterModal({
        open: true,
        loading: false,
        error: apiError?.response?.data?.detail || "Unable to load team roster.",
        application,
        roster: null,
      });
    }
  };


  const tournamentObj =
    startedTournament ||
    (Array.isArray(tournaments)
      ? tournaments.find((t) => String(t.id) === String(selectedTournamentId))
      : null);
  const playerParticipant = applicationLifecycle.primary || applicationLifecycle.items?.[0] || null;
  const playerEntryName = playerParticipant?.entry_name || playerParticipant?.team_name || playerParticipant?.pool_name || "My Entry";
  const headerTournamentName = isPlayer
    ? playerEntryName
    : selectedTournamentName || tournamentObj?.name || tournamentObj?.tournament_name || "Intramural Tournament";
  const dateRange = getTournamentDateRange(tournamentObj);
  const rawStatus = String(
    tournamentObj?.lifecycle_status || tournamentObj?.status || ""
  ).trim().toUpperCase();
  const statusLabel =
    rawStatus === "ARCHIVED" ||
    rawStatus === "COMPLETED" ||
    rawStatus === "FINISHED" ||
    rawStatus === "FINALIZED" ||
    rawStatus === "CLOSED"
      ? "Tournament Finished"
      : rawStatus === "ACTIVE" ||
        rawStatus === "STARTED" ||
        rawStatus === "LIVE" ||
        rawStatus === "ONGOING"
        ? "Tournament Active"
        : rawStatus === "REGISTRATION" ||
          rawStatus === "RECRUITING" ||
          rawStatus === "OPEN"
          ? "Registration Open"
          : "Tournament Announced";
  const playerEyebrow = [selectedTournamentName || tournamentObj?.tournament_name || tournamentObj?.name, dateRange].filter(Boolean).join(" · ");

  const headerSubtitle = [statusLabel, dateRange].filter(Boolean).join(" • ") || "Official Tournament Hub";

  return (
    <RoleDashboardShell
      role="viewer"
      eyebrow={isPlayer ? playerEyebrow : undefined}
      title={headerTournamentName}
      subtitle={isPlayer ? "" : headerSubtitle}
      showOverviewCard={false}
      loading={loading || !dashboard || isResolvingTournamentRole}
      error={error || (!isPlayer ? bracketsError : "")}

      headerAction={
        isPlayer ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <Link to="/viewer/results" className="os-btn-ghost-soft inline-flex min-h-[var(--control-height-md)] flex-1 items-center justify-center gap-2 px-3 text-sm font-semibold sm:flex-none">
              Check Results
            </Link>
            <Link to="/viewer/schedules" className="os-btn-primary-soft inline-flex min-h-[var(--control-height-md)] flex-1 items-center justify-center gap-2 px-4 text-sm font-semibold sm:flex-none">
              View Schedules
            </Link>
          </div>
        ) : null
      }
    >
      {isResolvingTournamentRole ? null : isPlayer ? (
        <PlayerDashboardLayout
          dashboard={dashboard}
          lifecycle={applicationLifecycle}
          currentUser={user}
          onOpenRoster={handleOpenRoster}
        />
      ) : (
        <ViewerDashboardLayout
          dashboard={dashboard}
          startedTournament={startedTournament}
          brackets={bracketSummaryRows}
          sportsList={sportsList}
          applicationPreview={applicationPreview}
          viewerTeamsHref={viewerTeamsHref}
          approvedApplicationsCount={applicationLifecycle.approvedCount || 0}
          totalApplicationsCount={applicationLifecycle.totalCount || 0}
          applications={applicationLifecycle.items || []}
        />
      )}

      <AppModal
        open={rosterModal.open}
        onClose={() => setRosterModal({ open: false, loading: false, error: "", application: null, roster: null })}
        title={rosterModal.application?.sourceType === "POOL" ? "Entry information" : "Team information"}
        subtitle={
          rosterModal.application?.sport_name
            ? `Review your ${getSportDisplayName(rosterModal.application)} selection before confirming.`
            : "Review your selected team or entry before confirming."
        }
        maxWidthClass="max-w-2xl"
      >
            {rosterModal.loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading team information...</p>
            ) : rosterModal.error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                {rosterModal.error}
              </div>
            ) : !rosterModal.application?.player_membership_confirmed ? (
              <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <p>
                  {rosterModal.application?.sourceType === "POOL"
                    ? `You were accepted for ${rosterModal.application?.pool_name || rosterModal.application?.team_name || "this entry"}. Review the event before confirming your final decision.`
                    : `You were accepted for ${rosterModal.application?.team_name || "this team"}. Review the selected team before confirming your final decision.`}
                </p>
                {rosterModal.application?.sourceType === "POOL" ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {rosterModal.application?.participant_shape === "DUO" ? "Duo entry" : "Solo entry"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {[
                        rosterModal.application?.sport_name,
                        rosterModal.application?.event_name,
                        rosterModal.application?.department_name,
                      ].filter(Boolean).join(" • ") || "Entry details"}
                    </p>
                    {rosterModal.application?.participant_shape === "DUO" ? (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Your pair will be finalized by the coach based on the accepted duo entry.
                      </p>
                    ) : null}
                  </div>
                ) : Array.isArray(rosterModal.application?.accepted_teammates) && rosterModal.application.accepted_teammates.length > 0 ? (
                  <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                    {rosterModal.application.accepted_teammates.map((player) => (
                      <li key={player.application_id || player.user_id} className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {player.name || player.email || "Accepted player"}
                          {player.is_me ? <span className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-300">(You)</span> : null}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {player.position || "Roster"}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                    Teammate details are not available yet. You can still confirm if you want to join this team.
                  </p>
                )}
                <p className="font-medium text-slate-900 dark:text-white">
                  {rosterModal.application?.sourceType === "POOL"
                    ? "Do you accept joining this entry?"
                    : "Do you accept being part of this team?"}
                </p>
                <button
                  type="button"
                  onClick={() => handleConfirmPlayer(rosterModal.application)}
                  disabled={rosterModal.confirming}
                  className="os-btn-primary-soft px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {rosterModal.confirming ? "Confirming..." : "Accept as player"}
                </button>
              </div>
            ) : (
              (() => {
                const application = rosterModal.application || {};
                const isPool = application.sourceType === "POOL";
                const medicalStatus = getMedicalCertificateStatus(application);
                const needsUpload = medicalStatus === "NOT_SUBMITTED" || medicalStatus === "REJECTED";
                return (
                  <div className="space-y-4">
                    {isPool ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {application.participant_shape === "DUO" ? "Duo entry confirmed" : "Solo entry confirmed"}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {[application.pool_name || application.team_name, getSportDisplayName(application), application.event_name].filter(Boolean).join(" • ") || "Entry details"}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                          <p className="text-lg font-bold text-slate-900 dark:text-white">
                            {rosterModal.roster?.team_name || application.team_name || "Team"}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {[rosterModal.roster?.department_name, getSportDisplayName(rosterModal.roster)].filter(Boolean).join(" • ")}
                          </p>
                        </div>
                        <div>
                          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Team members</h3>
                          {Array.isArray(rosterModal.roster?.players) && rosterModal.roster.players.length > 0 ? (
                            <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                              {rosterModal.roster.players.map((player) => (
                                <li key={player.id || player.player_id} className="px-4 py-3 text-sm">
                                  <p className="font-semibold text-slate-900 dark:text-white">
                                    {[player.first_name, player.last_name].filter(Boolean).join(" ") || player.name || "Player"}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{player.position || "Roster"}</p>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">No teammate list is available yet.</p>
                          )}
                        </div>
                      </>
                    )}

                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Medical certificate</h3>
                      {needsUpload ? (
                        <div className="mt-3 space-y-3">
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {medicalStatus === "REJECTED"
                              ? "Your previous certificate needs resubmission. Please upload a valid or clearer file."
                              : "Please attach your medical certificate before the Intramural starts."}
                          </p>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Medical certificate file
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                              disabled={applicationLifecycle.uploading}
                              onChange={(event) => setMedicalUploadFile(event.target.files?.[0] || null)}
                              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={applicationLifecycle.uploading || !medicalUploadFile}
                            onClick={() => handleUploadCertificate(application, medicalUploadFile)}
                            className="os-btn-primary-soft inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FileUp size={15} />
                            {applicationLifecycle.uploading ? "Submitting..." : "Submit medical certificate"}
                          </button>
                        </div>
                      ) : medicalStatus === "RECEIVED" ? (
                        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
                          Your coach marked your medical certificate as received.
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                          Your certificate was submitted. Please wait for your coach to review it.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </AppModal>

    </RoleDashboardShell>
  );
};

export default Dashboard;
