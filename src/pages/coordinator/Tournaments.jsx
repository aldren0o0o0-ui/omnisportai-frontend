import { useCallback, useEffect, useMemo, useState } from "react";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";
import {
  Archive,
  ArrowLeft,
  CalendarCheck2,
  CalendarClock,
  CheckCircle,
  GitBranch,
  Medal,
  MapPin,
  ImagePlus,
  PlusCircle,
  RotateCcw,
  Trash2,
  Trophy,
  UserRoundCog,
} from "lucide-react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import PageHeaderCard from "../../components/common/PageHeaderCard";

import AppModal from "../../components/common/AppModal";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import StatusBadge from "../../components/common/StatusBadge";
import ActionMenu from "../../components/common/ActionMenu";
import { useWorkspace } from "../../context/WorkspaceContext";
import {
  generateAllBrackets,
  generateBracket,
  getBracketGenerationReadiness,
  getBrackets,
} from "../../services/bracketService";
import { getNotifications } from "../../services/notification/notificationService";
import { getScheduleEvents, validateSchedule } from "../../services/scheduleService";
import { getSports } from "../../services/sportService";
import { getStandingsOverview } from "../../services/standingsService";
import { buildTournamentByWorkspace } from "../../utils/workspaceTournamentResolver";
import { getTournaments, updateTournament } from "../../services/tournamentService";
import {
  activateWorkspace,
  archiveWorkspace,
  completeWorkspace,
  deleteWorkspace,
  getWorkspaces,
  restoreWorkspace,
  uploadWorkspaceImage,
} from "../../services/workspaceService";
import { resolveMediaUrl } from "../../utils/media";
import { HistoricalBanner } from "../../components/intramural";
import AssignmentReadinessPanel from "../../components/intramural/AssignmentReadinessPanel";

const TOURNAMENT_WORKSPACE_STORAGE_KEY = "omnisport:selected_tournament_workspace";

const HISTORICAL_STATUSES = new Set(["COMPLETED", "ARCHIVED"]);

const SEMESTER_LABEL = { FIRST: "1st Semester", SECOND: "2nd Semester", SUMMER: "Summer" };

const SEASON_STATUS_ORDER = ["ACTIVE", "READY", "PLANNING", "DRAFT", "COMPLETED", "ARCHIVED"];

const sortSeasons = (list) =>
  [...list].sort((a, b) => {
    const ai = SEASON_STATUS_ORDER.indexOf(String(a.status || "").toUpperCase());
    const bi = SEASON_STATUS_ORDER.indexOf(String(b.status || "").toUpperCase());
    const aIdx = ai === -1 ? 99 : ai;
    const bIdx = bi === -1 ? 99 : bi;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

const toIntList = (value) => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => Number(entry))
        .filter((entry) => Number.isInteger(entry) && entry > 0)
    )
  );
};

const matchStatusTone = (rawValue) => {
  const value = String(rawValue || "").toUpperCase();
  if (["COMPLETED", "FINAL", "DONE", "CLOSED", "FINISHED", "BYE"].includes(value)) return "done";
  if (["ONGOING", "IN_PROGRESS", "LIVE"].includes(value)) return "live";
  return "queued";
};

const timeAgo = (rawValue) => {
  if (!rawValue) return "Recently";
  const created = new Date(rawValue);
  if (Number.isNaN(created.getTime())) return "Recently";
  const diffMin = Math.max(0, Math.floor((Date.now() - created.getTime()) / 60000));
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
};

const formatDateRange = (tournament) => {
  const start = String(tournament?.start_date || "").trim();
  const end = String(tournament?.end_date || "").trim();
  if (start && end) return `${start} to ${end}`;
  return start || end || "TBA";
};

const formatBracketSetupLabel = (rawValue) => {
  const value = String(rawValue || "").trim().toUpperCase();
  if (!value) return "-";
  if (value === "SINGLE_ELIMINATION") return "Single Elimination";
  if (value === "DOUBLE_ELIMINATION") return "Double Elimination";
  if (value === "ROUND_ROBIN") return "Round Robin";
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

const formatSeedingSetupLabel = (rawValue) => {
  const value = String(rawValue || "").trim().toUpperCase();
  if (!value) return "-";
  if (value === "RANDOM") return "Random Seeding";
  if (value === "MANUAL") return "Manual Seeding";
  if (value === "PREVIOUS_RANKING") return "Previous Tournament Ranking";
  if (value === "DEPARTMENT_SEPARATION") return "Department Separation";
  if (value === "SYSTEM_BALANCED") return "System-Balanced Seeding";
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

const formatStatusLabel = (rawValue, fallback = "Planning") => {
  const value = String(rawValue || "").trim();
  if (!value) return fallback;
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

const formatLifecycleActionError = (error, fallback = "Action failed.") => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;

  const lifecycleError = detail?.error;
  if (lifecycleError?.code === "LIFECYCLE_READINESS_BLOCKED") {
    const blockers = Array.isArray(lifecycleError.blockers) ? lifecycleError.blockers : [];
    const messages = blockers
      .map((row) => String(row?.message || "").trim())
      .filter(Boolean);
    return messages.length
      ? `${lifecycleError.message || "This action cannot be completed yet."} ${messages.slice(0, 3).join(" ")}`
      : lifecycleError.message || fallback;
  }

  if (detail?.message) return detail.message;
  if (detail?.code === "INVALID_LIFECYCLE_TRANSITION") {
    return "This Intramural is not ready to activate yet. Continue the setup workflow first.";
  }
  return fallback;
};

const statusToneClass = (rawValue) => {
  const value = String(rawValue || "").trim().toUpperCase();
  if (["COMPLETED", "FINISHED", "CLOSED", "FINALIZED"].includes(value)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["STARTED", "ONGOING", "LIVE", "IN_PROGRESS"].includes(value)) {
    return "border-cyan-200 bg-cyan-50 text-cyan-700";
  }
  if (["ARCHIVED", "CANCELLED"].includes(value)) {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
};

const Tournaments = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedWorkspaceId = Number(searchParams.get("workspace_id") || 0);
  const requestedSection = searchParams.get("section");
  const setupSection = requestedSection === "assignments" ? requestedSection : "overview";
  const {
    workspace: activeWorkspace,
    refresh: refreshWorkspaceContext,
    selectIntramural,
  } = useWorkspace();

  const [selectedTournament, setSelectedTournament] = useState(() => {
    // The base Intramurals route always represents the card list. A previously
    // opened tournament must not silently restore the retired overview page.
    if (!requestedWorkspaceId) return null;
    try {
      const raw = sessionStorage.getItem(TOURNAMENT_WORKSPACE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Number(parsed.id)) return null;
      return parsed;
    } catch {
      return null;
    }
  });

  // Season (workspace) list + the tournaments that belong to each season, so a
  // season card can "Open" straight into its competition detail hub.
  const [seasons, setSeasons] = useState([]);
  const [tournamentsByWorkspace, setTournamentsByWorkspace] = useState({});
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(true);
  const [seasonsError, setSeasonsError] = useState("");
  const [seasonActionError, setSeasonActionError] = useState("");
  const [seasonActionLoading, setSeasonActionLoading] = useState(false);
  const [imageUploadingId, setImageUploadingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dateEdit, setDateEdit] = useState({
    open: false,
    tournament: null,
    startDate: "",
    endDate: "",
    saving: false,
    error: "",
  });

  const [allBrackets, setAllBrackets] = useState([]);
  const [sportsCatalog, setSportsCatalog] = useState([]);
  const [scheduleRows, setScheduleRows] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [standingsOverview, setStandingsOverview] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoadingHub, setIsLoadingHub] = useState(false);
  const [isGeneratingBrackets, setIsGeneratingBrackets] = useState(false);
  const [bulkGenerationSummary, setBulkGenerationSummary] = useState(null);
  const [generationReadiness, setGenerationReadiness] = useState(null);
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [generationConfirmModal, setGenerationConfirmModal] = useState({
    open: false,
    action: "",
    sportId: null,
    title: "",
    message: "",
  });
  const [viewMessage, setViewMessage] = useState("");

  const openDateEdit = (tournament) => {
    if (!tournament?.id) return;
    setDateEdit({
      open: true,
      tournament,
      startDate: String(tournament.start_date || ""),
      endDate: String(tournament.end_date || ""),
      saving: false,
      error: "",
    });
  };

  const saveDateEdit = async () => {
    if (!dateEdit.tournament?.id || dateEdit.saving) return;
    if (!dateEdit.startDate || !dateEdit.endDate || dateEdit.endDate < dateEdit.startDate) {
      setDateEdit((current) => ({ ...current, error: "Enter a valid start and end date." }));
      return;
    }
    setDateEdit((current) => ({ ...current, saving: true, error: "" }));
    try {
      const updated = await updateTournament(dateEdit.tournament.id, {
        start_date: dateEdit.startDate,
        end_date: dateEdit.endDate,
      });
      const adjustment = updated?.schedule_adjustment;
      setSeasonActionError("");
      setViewMessage(
        adjustment?.schedule_preserved
          ? `Dates updated. ${adjustment.shifted_match_count} scheduled match${adjustment.shifted_match_count === 1 ? "" : "es"} moved automatically.`
          : "Intramural dates updated."
      );
      setDateEdit({ open: false, tournament: null, startDate: "", endDate: "", saving: false, error: "" });
      await loadSeasons();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setDateEdit((current) => ({
        ...current,
        saving: false,
        error: typeof detail === "string" ? detail : detail?.message || "Unable to update Intramural dates.",
      }));
    }
  };

  useEffect(() => {
    const loadSportsCatalog = async () => {
      try {
        const rows = await getSports();
        setSportsCatalog(Array.isArray(rows) ? rows : []);
      } catch {
        setSportsCatalog([]);
      }
    };
    loadSportsCatalog();
  }, []);

  // Load the seasons (workspaces) plus every tournament, mapped by workspace_id,
  // so "Open" on a season card can drill straight into its competition hub —
  // including historical seasons, without switching the active context.
  const loadSeasons = useCallback(async () => {
    setIsLoadingSeasons(true);
    setSeasonsError("");
    try {
      const [seasonData, tournamentData] = await Promise.all([
        getWorkspaces({ includeArchived: true }),
        getTournaments({ includeArchived: true }).catch(() => []),
      ]);
      const seasonList = Array.isArray(seasonData?.workspaces)
        ? seasonData.workspaces
        : Array.isArray(seasonData)
          ? seasonData
          : [];
      const tournamentList = Array.isArray(tournamentData) ? tournamentData : [];
      const byWorkspace = buildTournamentByWorkspace(tournamentList);
      setSeasons(sortSeasons(seasonList));
      setTournamentsByWorkspace(byWorkspace);
    } catch (error) {
      setTournamentsByWorkspace({});
      setSeasonsError(error?.response?.data?.detail || "Failed to load intramurals.");
    } finally {
      setIsLoadingSeasons(false);
    }
  }, []);

  const handleIntramuralImage = async (season, file) => {
    if (!file) return;
    setSeasonActionError("");
    setImageUploadingId(season.id);
    try {
      await uploadWorkspaceImage(season.id, file);
      await loadSeasons();
    } catch (error) {
      setSeasonActionError(error?.response?.data?.detail || "The intramural image could not be uploaded.");
    } finally {
      setImageUploadingId(null);
    }
  };

  useEffect(() => {
    loadSeasons();
  }, [loadSeasons]);

  useEffect(() => {
    if (requestedWorkspaceId) return;
    setSelectedTournament(null);
    setBulkGenerationSummary(null);
    setViewMessage("");
    try {
      sessionStorage.removeItem(TOURNAMENT_WORKSPACE_STORAGE_KEY);
    } catch {
      // The list route must still render when storage is unavailable.
    }
  }, [requestedWorkspaceId]);

  useEffect(() => {
    if (!requestedWorkspaceId || !tournamentsByWorkspace[requestedWorkspaceId]) return;
    const resolved = tournamentsByWorkspace[requestedWorkspaceId];
    if (Number(selectedTournament?.id) !== Number(resolved.id)) setSelectedTournament(resolved);
    const season = seasons.find((row) => Number(row.id) === Number(requestedWorkspaceId));
    if (season) selectIntramural(season);
  }, [requestedWorkspaceId, seasons, selectIntramural, selectedTournament?.id, tournamentsByWorkspace]);

  const handleSeasonLifecycle = useCallback(
    async (action, season) => {
      setSeasonActionLoading(true);
      setSeasonActionError("");
      try {
        await action(season.id);
        await loadSeasons();
        // activate/complete/archive dispatch WORKSPACE_CHANGED_EVENT internally;
        // refresh the context so banner + dashboard reflect the change immediately.
        refreshWorkspaceContext();
      } catch (error) {
        setSeasonActionError(formatLifecycleActionError(error, "Action failed."));
      } finally {
        setSeasonActionLoading(false);
      }
    },
    [loadSeasons, refreshWorkspaceContext]
  );

  const handleSeasonDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setSeasonActionLoading(true);
    setSeasonActionError("");
    try {
      await deleteWorkspace(deleteTarget.id);
      if (Number(selectedTournament?.workspace_id || 0) === Number(deleteTarget.id)) {
        setSelectedTournament(null);
        sessionStorage.removeItem(TOURNAMENT_WORKSPACE_STORAGE_KEY);
        setSearchParams({});
      } else {
        try {
          const stored = JSON.parse(sessionStorage.getItem(TOURNAMENT_WORKSPACE_STORAGE_KEY) || "null");
          if (Number(stored?.workspace_id || 0) === Number(deleteTarget.id)) {
            sessionStorage.removeItem(TOURNAMENT_WORKSPACE_STORAGE_KEY);
          }
        } catch {
          sessionStorage.removeItem(TOURNAMENT_WORKSPACE_STORAGE_KEY);
        }
      }
      setDeleteTarget(null);
      await loadSeasons();
      await refreshWorkspaceContext();
    } catch (error) {
      setSeasonActionError(error?.response?.data?.detail || "Failed to delete intramural.");
    } finally {
      setSeasonActionLoading(false);
    }
  }, [deleteTarget, loadSeasons, refreshWorkspaceContext, selectedTournament?.workspace_id, setSearchParams]);

  const handleOpenSeason = useCallback(
    (season) => {
      const tournament = tournamentsByWorkspace[Number(season.id)];
      if (!tournament) {
        setSeasonActionError(
          `"${season.name}" has no competition event yet. Create one from the wizard to open it.`
        );
        return;
      }
      setSeasonActionError("");
      selectIntramural({ ...season, tournament_id: tournament.id });
      setSelectedTournament(tournament);
      setViewMessage("");
      navigate("/coordinator/dashboard");
    },
    [navigate, selectIntramural, tournamentsByWorkspace]
  );

  const openSeasonSetup = useCallback((season, section) => {
    const tournament = tournamentsByWorkspace[Number(season.id)];
    if (!tournament) return;
    selectIntramural({ ...season, tournament_id: tournament.id });
    setSelectedTournament(tournament);
    if (section === "venues") {
      navigate(`/coordinator/intramurals/${tournament.id}/settings/venues`);
      return;
    }
    navigate(`/coordinator/intramurals?workspace_id=${season.id}&section=${section}`);
  }, [navigate, selectIntramural, tournamentsByWorkspace]);

  const sportsById = useMemo(() => {
    const map = {};
    sportsCatalog.forEach((sport) => {
      map[Number(sport.id)] = sport.sport_name || "Unassigned sport";
    });
    return map;
  }, [sportsCatalog]);

  const visibleBrackets = useMemo(() => {
    const tournamentId = Number(selectedTournament?.id || 0);
    if (!tournamentId) return [];
    return allBrackets.filter((row) => Number(row?.tournament_id || 0) === tournamentId);
  }, [allBrackets, selectedTournament?.id]);
  const hasSchedulableBracket = useMemo(
    () =>
      visibleBrackets.some((row) =>
        ["ACTIVE", "FINALIZED", "GENERATED", "COMPLETED"].includes(
          String(row?.status || "").trim().toUpperCase()
        )
      ),
    [visibleBrackets]
  );
  const scheduleAvailabilityMessage = useMemo(() => {
    if (!selectedTournament?.id) return "";
    if (visibleBrackets.length === 0) {
      return "No generated brackets yet, so schedule data is not available yet.";
    }
    if (!hasSchedulableBracket) {
      return "This intramural event does not have a generated or active bracket yet, so schedule data is not available yet.";
    }
    return "";
  }, [hasSchedulableBracket, selectedTournament?.id, visibleBrackets.length]);

  const tournamentSports = useMemo(() => {
    const fromTournament = toIntList(selectedTournament?.sport_ids || [selectedTournament?.sport_id]);
    const fallback = toIntList(visibleBrackets.map((row) => row?.sport_id));
    const ids = fromTournament.length > 0 ? fromTournament : fallback;
    return ids.map((sportId) => ({
      id: sportId,
      name: sportsById[sportId] || "Unassigned sport",
      hasBracket: visibleBrackets.some((row) => Number(row?.sport_id || 0) === sportId),
    }));
  }, [selectedTournament, sportsById, visibleBrackets]);

	  const loadTournamentHub = useCallback(async () => {
    const tournamentId = Number(selectedTournament?.id || 0);
    if (!tournamentId) {
      setAllBrackets([]);
      setScheduleRows([]);
      setValidationResult(null);
      setStandingsOverview(null);
      setRecentActivity([]);
      return;
    }

	    setIsLoadingHub(true);
	    setViewMessage("");

	    try {
	      const [bracketsRes, standingsRes, notificationsRes] = await Promise.all([
	        getBrackets(),
	        getStandingsOverview({ tournamentId }).catch(() => null),
	        getNotifications({ limit: 60 }).catch(() => ({ items: [] })),
	      ]);

	      const safeBrackets = Array.isArray(bracketsRes) ? bracketsRes : [];
	      const tournamentBrackets = safeBrackets.filter(
	        (row) => Number(row?.tournament_id || 0) === tournamentId
	      );
	      const shouldLoadScheduleData = tournamentBrackets.some((row) =>
	        ["ACTIVE", "FINALIZED", "GENERATED", "COMPLETED"].includes(
	          String(row?.status || "").trim().toUpperCase()
	        )
	      );
	      const [scheduleRes, validationRes] = shouldLoadScheduleData
	        ? await Promise.all([
	            getScheduleEvents(tournamentId).catch(() => ({ events: [] })),
	            validateSchedule(tournamentId).catch(() => null),
	          ])
	        : [{ events: [] }, null];
	      const safeEvents = Array.isArray(scheduleRes)
	        ? scheduleRes
	        : Array.isArray(scheduleRes?.events)
	          ? scheduleRes.events
	          : [];
	      const safeNotifications = Array.isArray(notificationsRes?.items) ? notificationsRes.items : [];

      setAllBrackets(safeBrackets);
      setScheduleRows(
        safeEvents
          .slice()
          .sort((left, right) => {
            const leftDate = new Date(left?.start || left?.scheduled_at || 0).getTime();
            const rightDate = new Date(right?.start || right?.scheduled_at || 0).getTime();
            return leftDate - rightDate;
          })
      );
      setValidationResult(validationRes);
      setStandingsOverview(standingsRes);
      setRecentActivity(
        safeNotifications
          .filter((item) => Number(item?.tournament_id || 0) === tournamentId)
          .slice(0, 6)
      );
    } catch (error) {
      setAllBrackets([]);
      setScheduleRows([]);
      setValidationResult(null);
      setStandingsOverview(null);
      setRecentActivity([]);
      setViewMessage(error?.response?.data?.detail || "Unable to load intramural details.");
    } finally {
      setIsLoadingHub(false);
    }
  }, [selectedTournament?.id]);

  useEffect(() => {
    if (!selectedTournament?.id) {
      try {
        sessionStorage.removeItem(TOURNAMENT_WORKSPACE_STORAGE_KEY);
      } catch {
        // Ignore storage cleanup failures.
      }
      return;
    }
    try {
      sessionStorage.setItem(TOURNAMENT_WORKSPACE_STORAGE_KEY, JSON.stringify(selectedTournament));
    } catch {
      // Ignore storage write failures.
    }
  }, [selectedTournament]);

  useEffect(() => {
    loadTournamentHub();
  }, [loadTournamentHub]);

  const handleBackToList = useCallback(() => {
    setSelectedTournament(null);
    setBulkGenerationSummary(null);
    setViewMessage("");
    try {
      sessionStorage.removeItem(TOURNAMENT_WORKSPACE_STORAGE_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
    navigate("/coordinator/intramurals", { replace: true });
  }, [navigate]);

  const handleGenerateSingleSportBracket = useCallback(
    async (sportId, confirmed = false) => {
      const tournamentId = Number(selectedTournament?.id || 0);
      const normalizedSportId = Number(sportId || 0);
      if (!tournamentId || !normalizedSportId) return;

      if (!confirmed) {
        setGenerationConfirmModal({
          open: true,
          action: "single",
          sportId: normalizedSportId,
          title: "Generate Bracket Draft",
          message: "Generate or refresh this sport bracket draft?",
        });
        return;
      }

      setIsGeneratingBrackets(true);
      setViewMessage("");
      setBulkGenerationSummary(null);
      try {
        const response = await generateBracket({
          tournament_id: tournamentId,
          sport_id: normalizedSportId,
        });
        await loadTournamentHub();
        setGenerationConfirmModal({ open: false, action: "", sportId: null, title: "", message: "" });
        setViewMessage(response?.note || "Bracket generated successfully.");
      } catch (error) {
        const detail = error?.response?.data?.detail;
        setViewMessage(typeof detail === "string" ? detail : "Failed to generate bracket.");
      } finally {
        setIsGeneratingBrackets(false);
      }
    },
    [loadTournamentHub, selectedTournament?.id]
  );

  const executeGenerateAllSportsBrackets = useCallback(async (options = {}) => {
    const tournamentId = Number(selectedTournament?.id || 0);
    if (!tournamentId) return;

    setIsGeneratingBrackets(true);
    setViewMessage("");
    try {
      const response = await generateAllBrackets({
        tournament_id: tournamentId,
        generate_ready_only: Boolean(options.generateReadyOnly),
      });
      setBulkGenerationSummary(response);
      await loadTournamentHub();
      const generatedCount = Number(response?.generated_count || 0);
      const skippedCount = Number(response?.skipped_count || 0);
      const failedCount = Number(response?.failed_count || 0);
      setViewMessage(
        `Bracket batch complete: ${generatedCount} generated, ${skippedCount} skipped, ${failedCount} failed.`
      );
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setViewMessage(
        typeof detail === "string" ? detail : "Failed to generate brackets for all sports."
      );
    } finally {
      setIsGeneratingBrackets(false);
    }
  }, [loadTournamentHub, selectedTournament?.id]);

  const handleGenerateAllSportsBrackets = useCallback(async (confirmed = false) => {
    const tournamentId = Number(selectedTournament?.id || 0);
    if (!tournamentId) return;

    if (!confirmed) {
      setGenerationConfirmModal({
        open: true,
        action: "all",
        sportId: null,
        title: "Generate All Brackets",
        message: "Generate brackets using approved bracket setup? Existing brackets will be skipped.",
      });
      return;
    }

    try {
      const readiness = await getBracketGenerationReadiness(tournamentId);
      setGenerationReadiness(readiness);
      if (!readiness?.all_ready) {
        setShowReadinessModal(true);
        return;
      }
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setViewMessage(
        typeof detail === "string" ? detail : "Unable to check bracket generation readiness."
      );
      return;
    }

    await executeGenerateAllSportsBrackets({ generateReadyOnly: false });
  }, [executeGenerateAllSportsBrackets, selectedTournament?.id]);

  const confirmGenerationAction = useCallback(async () => {
    if (!generationConfirmModal.action) return;
    if (generationConfirmModal.action === "single") {
      await handleGenerateSingleSportBracket(generationConfirmModal.sportId, true);
      return;
    }
    if (generationConfirmModal.action === "all") {
      await handleGenerateAllSportsBrackets(true);
    }
  }, [generationConfirmModal.action, generationConfirmModal.sportId, handleGenerateAllSportsBrackets, handleGenerateSingleSportBracket]);

  const summary = useMemo(() => {
    const teamCount = Array.isArray(selectedTournament?.team_ids) ? selectedTournament.team_ids.length : 0;
    const sportCount = tournamentSports.length;
    const totalMatches = scheduleRows.length;

    let completedMatches = 0;
    let ongoingMatches = 0;
    scheduleRows.forEach((row) => {
      const tone = matchStatusTone(row?.status);
      if (tone === "done") completedMatches += 1;
      if (tone === "live") ongoingMatches += 1;
    });

    const totalConflicts = Number(validationResult?.summary?.total_conflicts || 0);
    const leadingDepartment = standingsOverview?.leading_department?.name || "-";

    const teamsReady = teamCount >= 2;
    const bracketsReady = sportCount > 0 && tournamentSports.every((sport) => sport.hasBracket);
    const scheduleValidated = Boolean(validationResult && validationResult.valid === true);
    const tournamentCompleted =
      ["COMPLETED", "FINISHED", "CLOSED", "FINALIZED"].includes(
        String(selectedTournament?.lifecycle_status || selectedTournament?.status || "").toUpperCase()
      ) || (totalMatches > 0 && completedMatches >= totalMatches);
    const steps = [
      { key: "teams", label: "Teams Ready", done: teamsReady },
      { key: "brackets", label: "Brackets Generated", done: bracketsReady },
      { key: "schedule", label: "Schedule Validated", done: scheduleValidated },
      { key: "live", label: "Matches Ongoing", done: ongoingMatches > 0 },
      { key: "done", label: "Tournament Completed", done: tournamentCompleted },
    ];
    const statusValue =
      String(selectedTournament?.lifecycle_status || selectedTournament?.status || "").trim() ||
      (tournamentCompleted ? "COMPLETED" : "PLANNING");

    return {
      teamCount,
      sportCount,
      bracketCount: visibleBrackets.length,
      totalMatches,
      completedMatches,
      ongoingMatches,
      totalConflicts,
      leadingDepartment,
      pendingMatches: Math.max(totalMatches - completedMatches, 0),
      steps,
      workflowCompletedCount: steps.filter((step) => step.done).length,
      workflowTotalCount: steps.length,
      workflowPercentage: steps.length > 0
        ? Math.round((steps.filter((step) => step.done).length / steps.length) * 100)
        : 0,
      statusLabel: formatStatusLabel(statusValue),
      statusClassName: statusToneClass(statusValue),
      scheduleHealthLabel: validationResult
        ? validationResult.valid
          ? "No schedule conflicts detected."
          : `${totalConflicts} schedule conflict(s) need attention.`
        : scheduleAvailabilityMessage || "Schedule validation will appear after matches are scheduled.",
    };
  }, [
    scheduleAvailabilityMessage,
    scheduleRows,
    selectedTournament,
    standingsOverview?.leading_department?.name,
    tournamentSports,
    validationResult,
    visibleBrackets.length,
  ]);

  const topTeamsPreview = Array.isArray(standingsOverview?.top_teams)
    ? standingsOverview.top_teams.slice(0, 3)
    : [];

  // The season (workspace) that owns the opened intramural. When it's COMPLETED
  // or ARCHIVED we surface a read-only historical banner in the detail view.
  const openedSeason = useMemo(() => {
    const wsId = Number(selectedTournament?.workspace_id || 0);
    if (!wsId) return null;
    return seasons.find((season) => Number(season.id) === wsId) || null;
  }, [seasons, selectedTournament?.workspace_id]);

  const isHistoricalView = openedSeason
    ? HISTORICAL_STATUSES.has(String(openedSeason.status || "").toUpperCase())
    : false;

  if (selectedTournament && setupSection === "assignments") {
    return (
      <div className="os-page-shell os-themed-page space-y-6">
        {isHistoricalView ? <HistoricalBanner intramural={openedSeason} /> : null}
        <header className="os-page-header-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Intramural Setup</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedTournament.tournament_name}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review staffing for this Intramural and open the responsible workflow when action is needed.</p>
            </div>
            <button type="button" onClick={handleBackToList} className="os-btn-ghost-soft inline-flex min-h-10 items-center gap-1"><ArrowLeft size={14} /> All Intramurals</button>
          </div>
          <nav className="mt-4 flex gap-1 overflow-x-auto border-t border-slate-200 pt-3 dark:border-slate-700" aria-label="Intramural setup sections">
            <button type="button" onClick={() => navigate("/coordinator/dashboard")} className="min-h-10 whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Dashboard</button>
            <button type="button" aria-current="page" className="min-h-10 whitespace-nowrap rounded-lg bg-blue-50 px-3 text-sm font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">Assignments</button>
            <button type="button" onClick={() => navigate(`/coordinator/brackets?tournament_id=${selectedTournament.id}`)} className="min-h-10 whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Competition Setup</button>
            <button type="button" onClick={() => navigate(`/coordinator/intramurals/${selectedTournament.id}/settings/venues`)} className="min-h-10 whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Venues</button>
            <button type="button" onClick={() => navigate("/coordinator/teams")} className="min-h-10 whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Registration</button>
          </nav>
        </header>
        <AssignmentReadinessPanel workspaceId={selectedTournament.workspace_id} expandedByDefault />
      </div>
    );
  }

  if (selectedTournament && requestedWorkspaceId > 0 && setupSection === "overview") {
    return <Navigate to="/coordinator/dashboard" replace />;
  }

  return (
    <div className="os-page-shell os-themed-page">
      {!selectedTournament ? (
	          <div className="space-y-4">
          <PageHeaderCard
            title="Intramurals"
            subtitle="Create and manage intramural seasons. Only one intramural can be active at a time."
            breadcrumbs=""
            action={
              <button
                type="button"
                onClick={() => navigate("/coordinator/intramurals/create")}
                className="os-btn-primary-soft inline-flex items-center gap-1.5"
              >
                <PlusCircle size={14} />
                Create Intramural
              </button>
            }
          />

          {seasonActionError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {seasonActionError}
            </div>
          ) : null}

          {isLoadingSeasons ? (
            <LoadingState message="Loading intramurals..." />
          ) : seasonsError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {seasonsError}
            </div>
          ) : seasons.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No intramurals yet"
              message="Create your first intramural to begin managing sports, teams, schedules, standings, and reports."
              action={
                <button
                  type="button"
                  onClick={() => navigate("/coordinator/intramurals/create")}
                  className="os-btn-primary-soft"
                >
                  Create Intramural
                </button>
              }
            />
          ) : (
            <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
              {seasons.map((season) => {
                const statusKey = String(season.status || "").toUpperCase();
                const isCurrentActive = activeWorkspace?.id === season.id;
                const linkedTournament = tournamentsByWorkspace[Number(season.id)];
                const semesterLabel = SEMESTER_LABEL[String(season.semester || "").toUpperCase()] || season.semester;
                const canEdit = ["DRAFT", "PLANNING", "READY"].includes(statusKey);
                const canActivate = statusKey === "READY";
                const canComplete = statusKey === "ACTIVE";
                const canArchive = statusKey === "COMPLETED";
                const canRestore = statusKey === "ARCHIVED";
                const finishDate = String(linkedTournament?.end_date || "").trim();
                const today = new Date();
                const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                const canDelete = linkedTournament ? Boolean(finishDate && finishDate < localToday) : statusKey !== "ACTIVE";
                return (
                  <div
                    key={season.id}
                    className={`flex min-h-full flex-col overflow-visible rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none dark:bg-slate-900 ${
                      isCurrentActive
                        ? "border-emerald-300 dark:border-emerald-500/40"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="relative aspect-[16/8] overflow-hidden rounded-t-2xl bg-gradient-to-br from-blue-600 to-slate-800">
                      {season.image_url ? <img src={resolveMediaUrl(season.image_url)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-white"><Trophy size={38} strokeWidth={1.5} /></div>}
                      <label className="absolute bottom-3 right-3 inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-950/75 px-3 text-xs font-semibold text-white backdrop-blur hover:bg-slate-950">
                        <ImagePlus size={14} /> {imageUploadingId === season.id ? "Uploading…" : season.image_url ? "Change image" : "Add image"}
                        <input type="file" accept=".jpg,.jpeg,.png,.webp" disabled={imageUploadingId === season.id} className="sr-only" onChange={(event) => handleIntramuralImage(season, event.target.files?.[0] || null)} />
                      </label>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{season.name}</h3>
                          <StatusBadge status={season.status} />
                          {isCurrentActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                              <CheckCircle size={10} />
                              Active
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {season.school_year}
                          {semesterLabel ? ` · ${semesterLabel}` : ""}
                        </p>
                        {season.description ? (
                          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{season.description}</p>
                        ) : null}
                      </div>

                      <div className="mt-3 flex w-full flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                        <button
                          type="button"
                          disabled={!linkedTournament}
                          title={linkedTournament ? "Open competition hub" : "No competition event linked yet"}
                          onClick={() => handleOpenSeason(season)}
                          className="os-btn-primary-soft text-xs disabled:opacity-50"
                        >
                          Open
                        </button>
                        <ActionMenu
                          buttonLabel="More"
                          disabled={!linkedTournament}
                          buttonClassName="os-btn-ghost-soft inline-flex min-h-10 items-center gap-2 text-xs disabled:opacity-60"
                          items={[
                            { key: "assignments", label: "Open assignments", icon: UserRoundCog, onClick: () => openSeasonSetup(season, "assignments") },
                            { key: "venues", label: "Manage venues", icon: MapPin, onClick: () => openSeasonSetup(season, "venues") },
                          ]}
                        />
                        {canEdit ? (
                          <button
                            type="button"
                            disabled={!linkedTournament || seasonActionLoading}
                            onClick={() => openDateEdit(linkedTournament)}
                            className="os-btn-ghost-soft text-xs disabled:opacity-60"
                          >
                            Edit Dates
                          </button>
                        ) : null}
                        {canActivate ? (
                            <button
                              type="button"
                              disabled={seasonActionLoading}
                              onClick={() => handleSeasonLifecycle(activateWorkspace, season)}
                              className="os-btn-ghost-soft text-xs disabled:opacity-60"
                            >
                              Activate
                            </button>
                        ) : null}
                        {canComplete ? (
                          <button
                            type="button"
                            disabled={seasonActionLoading}
                            onClick={() => handleSeasonLifecycle(completeWorkspace, season)}
                            className="os-btn-ghost-soft text-xs disabled:opacity-60"
                          >
                            Complete
                          </button>
                        ) : null}
                        {canArchive ? (
                          <button
                            type="button"
                            disabled={seasonActionLoading}
                            onClick={() => handleSeasonLifecycle(archiveWorkspace, season)}
                            className="os-btn-ghost-soft inline-flex items-center gap-1 text-xs disabled:opacity-60"
                          >
                            <Archive size={12} />
                            Archive
                          </button>
                        ) : null}
                        {canRestore ? (
                          <button
                            type="button"
                            disabled={seasonActionLoading}
                            onClick={() => handleSeasonLifecycle(restoreWorkspace, season)}
                            className="os-btn-ghost-soft inline-flex items-center gap-1 text-xs disabled:opacity-60"
                          >
                            <RotateCcw size={12} />
                            Restore
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            disabled={seasonActionLoading}
                            onClick={() => {
                              setDeleteTarget(season);
                              setSeasonActionError("");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400 dark:text-slate-500">
                      {linkedTournament ? (
                        <span>{(linkedTournament.sport_ids || []).length} sport{(linkedTournament.sport_ids || []).length === 1 ? "" : "s"}</span>
                      ) : (
                        <span>No competition event yet</span>
                      )}
                      {season.started_at ? <span>Started {new Date(season.started_at).toLocaleDateString()}</span> : null}
                      {season.ended_at ? <span>Ended {new Date(season.ended_at).toLocaleDateString()}</span> : null}
                      {season.archived_at ? <span>Archived {new Date(season.archived_at).toLocaleDateString()}</span> : null}
                      <span>Created {new Date(season.created_at).toLocaleDateString()}</span>
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
        {isHistoricalView ? <HistoricalBanner intramural={openedSeason} className="mb-4" /> : null}
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_340px]">
          <div className="space-y-4">

          

            <header className="os-page-header-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  
                  <div className="flex flex-wrap items-center gap-2">
                    
                    {summary.totalConflicts > 0 ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                        {summary.totalConflicts} conflict{summary.totalConflicts === 1 ? "" : "s"}
                      </span>
                    ) : null }
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                      {selectedTournament.tournament_name}
                    </h1>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {formatDateRange(selectedTournament)}
                    </p>
                    
                  </div>
                 
                  {/* <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                    <span>{summary.sportCount} sports configured</span>
                    <span>{summary.teamCount} teams included</span>
                    <span>{summary.bracketCount} bracket workspace{summary.bracketCount === 1 ? "" : "s"}</span>
                  </div> */}
                </div>

                <div className="flex max-w-xl flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="inline-flex items-center gap-1.5 os-btn-ghost-soft"
                  >
                    <ArrowLeft size={14} />
                    Back To Intramurals
                  </button>
                  {/* <button
                    type="button"
                    onClick={loadTournamentHub}
                    disabled={isLoadingHub}
                    className="os-btn-ghost-soft disabled:opacity-60"
                  >
                    {isLoadingHub ? "Refreshing..." : "Refresh Summary"}
                  </button> */}
                  {/* <button
                    type="button"
                    onClick={handleGenerateAllSportsBrackets}
                    disabled={isGeneratingBrackets || tournamentSports.length === 0}
                    className="os-btn-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGeneratingBrackets ? "Processing..." : "Generate All Brackets"}
                  </button> */}
                  <button
                    type="button"
                    onClick={() => setSearchParams({ workspace_id: String(selectedTournament.workspace_id), section: "assignments" })}
                    className="os-btn-primary-soft"
                  >
                    Open Assignments
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/coordinator/brackets?tournament_id=${selectedTournament.id}`)}
                    className="os-btn-ghost-soft"
                  >
                    Open Brackets
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/coordinator/intramurals/${selectedTournament.id}/settings/venues`)}
                    className="os-btn-ghost-soft"
                  >
                    Manage Venues
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/coordinator/schedules")}
                    className="os-btn-ghost-soft"
                  >
                    Open Schedule
                  </button>
                </div>
                
              </div>

              <div>
                     <span className="text-sm font-semibold text-cyan-700">
                        {summary.workflowPercentage}%
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-cyan-600 transition-all duration-300"
                        style={{ width: `${summary.workflowPercentage}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {summary.workflowCompletedCount} of {summary.workflowTotalCount} workflow steps completed.
                    </p>

              {viewMessage ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                  {viewMessage}
                </div>
              ) : null}
            </header>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <article className="os-kpi-card">
                <p className="os-kpi-label">Sports</p>
                <p className="os-kpi-value">{summary.sportCount}</p>
              </article>
              <article className="os-kpi-card">
                <p className="os-kpi-label">Teams</p>
                <p className="os-kpi-value">{summary.teamCount}</p>
              </article>
              <article className="os-kpi-card">
                <p className="os-kpi-label">Brackets Ready</p>
                <p className="os-kpi-value">{summary.bracketCount}</p>
              </article>
              <article className="os-kpi-card">
                <p className="os-kpi-label">Scheduled Matches</p>
                <p className="os-kpi-value">{summary.totalMatches}</p>
              </article>
              <article className="os-kpi-card">
                <p className="os-kpi-label">Completed Matches</p>
                <p className="os-kpi-value">{summary.completedMatches}</p>
              </article>
              <article className="os-kpi-card">
                <p className="os-kpi-label">Live Matches</p>
                <p className="os-kpi-value">{summary.ongoingMatches}</p>
              </article>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                      <Trophy size={14} className="text-amber-500" />
                      Sports Setup
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Generate individual brackets only where setup is already complete.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/coordinator/sports")}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Open Sports
                  </button>
                </div>
                {tournamentSports.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No sports linked to this intramural event yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {tournamentSports.map((sport) => (
                      <li
                        key={`sport-progress-${sport.id}`}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <span className="text-sm font-medium text-slate-800">{getSportDisplayName(sport)}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              sport.hasBracket ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {sport.hasBracket ? "Bracket Ready" : "Pending Bracket"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleGenerateSingleSportBracket(sport.id)}
                            disabled={isGeneratingBrackets}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                          >
                            Generate
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                      <CalendarClock size={14} className="text-indigo-600" />
                      Schedule Snapshot
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Keep an eye on the first few scheduled matches and validation status.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/coordinator/schedules")}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Open Schedule
                  </button>
                </div>

                {scheduleRows.length === 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-slate-500">
                      {scheduleAvailabilityMessage || "No scheduled matches yet."}
                    </p>
                    {scheduleAvailabilityMessage ? (
                      <p className="text-xs text-slate-400">
                        Generate brackets first, then assign dates, times, and venues in the schedule workspace.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {scheduleRows.slice(0, 5).map((row, index) => {
                      const tone = matchStatusTone(row?.status);
                      const startRaw = row?.start || row?.scheduled_at || null;
                      const when = startRaw ? new Date(startRaw).toLocaleString() : "Schedule pending";
                      return (
                        <li
                          key={`schedule-preview-${row?.id || row?.match_id || index}`}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-slate-800">
                              {row?.title || "Match details unavailable"}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                tone === "done"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : tone === "live"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {String(row?.status || "Scheduled")}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {when} | {row?.venue || "Unassigned venue"}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {validationResult ? (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    Validation: {validationResult.valid ? "No conflicts detected" : `${summary.totalConflicts} conflict(s) detected`}
                  </div>
                ) : null}
              </article>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <CalendarCheck2 size={14} className="text-cyan-600" />
                    Recent Notifications
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Notifications and updates tied to this intramural workspace.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/coordinator/notifications")}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Open Notifications
                </button>
              </div>

              {recentActivity.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No intramural-specific notifications yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {recentActivity.map((item) => (
                    <li
                      key={`tournament-activity-${item.id}`}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                        <span className="text-xs text-slate-500">{timeAgo(item.created_at)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{item.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {isLoadingHub ? (
              <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
                Loading intramural details...
              </section>
            ) : null}
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-700">Tournament Snapshot</h3>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${summary.statusClassName}`}>
                  {summary.statusLabel}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Leading Department</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{summary.leadingDepartment}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Pending Matches</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{summary.pendingMatches}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Schedule Conflicts</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{summary.totalConflicts}</p>
                </div>
                <div
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  title="Setup progress: Teams → Brackets → Schedule → Live → Completed"
                >
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Setup Progress</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {summary.workflowCompletedCount}/{summary.workflowTotalCount} complete
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">{summary.scheduleHealthLabel}</p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <GitBranch size={14} className="text-cyan-600" />
                  Bracket Coverage
                </h3>
                <button
                  type="button"
                  onClick={() => navigate(`/coordinator/brackets?tournament_id=${selectedTournament.id}`)}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Open Brackets
                </button>
              </div>

              {visibleBrackets.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No generated brackets yet for this intramural event.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {visibleBrackets.slice(0, 5).map((bracket) => (
                    <div
                      key={`bracket-preview-${bracket.id}`}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-slate-800">{getSportDisplayName(bracket, "Sport")}</p>
                      <p className="text-xs text-slate-500">
                        {bracket.format || "Format"} | {formatStatusLabel(bracket.status, "Draft")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <Medal size={14} className="text-amber-600" />
                  Standings Preview
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/coordinator/teams")}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Teams
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/coordinator/standings")}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Full Standings
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Top Team</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{standingsOverview?.top_team?.name || "-"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Top Player</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{standingsOverview?.top_player?.name || "-"}</p>
                </div>
              </div>

              {topTeamsPreview.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {topTeamsPreview.map((row) => (
                    <li
                      key={`top-team-preview-${row.entity_id}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-slate-800">
                        #{row.rank} {row.name}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        {Number(row?.metadata?.points || 0)} pts
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Standings will populate after results are recorded.</p>
              )}
            </section>

            {bulkGenerationSummary ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700">Latest Bracket Run</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Generated</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {bulkGenerationSummary.generated_count || 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Skipped</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {bulkGenerationSummary.skipped_count || 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Failed</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {bulkGenerationSummary.failed_count || 0}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {(Array.isArray(bulkGenerationSummary.results) ? bulkGenerationSummary.results : [])
                    .slice(0, 4)
                    .map((row, index) => (
                      <div
                        key={`bulk-generation-row-${row.sport_id}-${index}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">{getSportDisplayName(row, "Unassigned sport")}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              row.status === "generated"
                                ? "bg-emerald-100 text-emerald-700"
                                : row.status === "skipped"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {formatStatusLabel(row.status, "Unknown")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.reason || `${row.matches_created || 0} matches created`}
                        </p>
                      </div>
                    ))}
                </div>
              </section>
            ) : null}
          </aside>
        </section>
        </>
      )}

      {!selectedTournament && viewMessage ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {viewMessage}
        </div>
      ) : null}

      <AppModal
        open={showReadinessModal}
        onClose={() => setShowReadinessModal(false)}
        title="Bracket Generation Readiness"
        subtitle="Review setup before generating all sports brackets."
        maxWidthClass="max-w-4xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Some sports still need setup. You can generate ready brackets only, or fix missing setup first.
          </p>
          <div className="max-h-[65vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs">
              <caption className="sr-only">Bracket generation readiness by sport</caption>
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2">Sport</th>
                  <th className="hidden px-3 py-2 lg:table-cell">Bracket Format</th>
                  <th className="hidden px-3 py-2 lg:table-cell">Seeding</th>
                  <th className="hidden px-3 py-2 sm:table-cell">Participants</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Guidance</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(generationReadiness?.rows) ? generationReadiness.rows : []).map((row) => (
                  <tr key={`readiness-row-${row.sport_id}`} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{getSportDisplayName(row)}</td>
                    <td className="hidden px-3 py-2 text-slate-600 lg:table-cell dark:text-slate-300">
                      {formatBracketSetupLabel(row.bracket_format)}
                    </td>
                    <td className="hidden px-3 py-2 text-slate-600 lg:table-cell dark:text-slate-300">
                      {formatSeedingSetupLabel(row.seeding_method)}
                    </td>
                    <td className="hidden px-3 py-2 text-slate-600 sm:table-cell dark:text-slate-300">{row.teams_or_units || 0}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${
                          row.is_ready
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                        }`}
                      >
                        {row.is_ready ? "Ready" : "Needs Setup"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                      {Array.isArray(row.blockers) && row.blockers.length > 0
                        ? row.blockers[0]
                        : "Ready"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowReadinessModal(false)}
              className="os-btn-ghost-soft"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setShowReadinessModal(false);
                navigate(`/coordinator/brackets?tournament_id=${selectedTournament?.id || ""}`);
              }}
              className="os-btn-ghost-soft"
            >
              Fix Missing Setup
            </button>
            <button
              type="button"
              disabled={isGeneratingBrackets}
              onClick={async () => {
                setShowReadinessModal(false);
                await executeGenerateAllSportsBrackets({ generateReadyOnly: true });
              }}
              className="os-btn-primary-soft disabled:opacity-60"
            >
              {isGeneratingBrackets ? "Processing..." : "Generate Ready Brackets"}
            </button>
          </div>
        </div>
      </AppModal>
      <AppModal
        open={generationConfirmModal.open}
        onClose={() => {
          if (isGeneratingBrackets) return;
          setGenerationConfirmModal({ open: false, action: "", sportId: null, title: "", message: "" });
        }}
        title={generationConfirmModal.title || "Confirm Action"}
        subtitle="Bracket generation actions can change tournament bracket drafts."
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {generationConfirmModal.message || "Proceed with this action?"}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setGenerationConfirmModal({ open: false, action: "", sportId: null, title: "", message: "" })}
              disabled={isGeneratingBrackets}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmGenerationAction}
              disabled={isGeneratingBrackets}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {isGeneratingBrackets ? "Processing..." : "Confirm"}
            </button>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={dateEdit.open}
        onClose={() => {
          if (dateEdit.saving) return;
          setDateEdit({ open: false, tournament: null, startDate: "", endDate: "", saving: false, error: "" });
        }}
        title="Edit Intramural Dates"
        subtitle="Published match times and venues will be preserved and moved to the new dates automatically."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Start date
              <input
                type="date"
                value={dateEdit.startDate}
                onChange={(event) => setDateEdit((current) => ({ ...current, startDate: event.target.value, error: "" }))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              End date
              <input
                type="date"
                value={dateEdit.endDate}
                min={dateEdit.startDate || undefined}
                onChange={(event) => setDateEdit((current) => ({ ...current, endDate: event.target.value, error: "" }))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
          </div>
          {dateEdit.error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {dateEdit.error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={dateEdit.saving}
              onClick={() => setDateEdit({ open: false, tournament: null, startDate: "", endDate: "", saving: false, error: "" })}
              className="os-btn-ghost-soft disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={dateEdit.saving}
              onClick={saveDateEdit}
              className="os-btn-primary-soft disabled:opacity-60"
            >
              {dateEdit.saving ? "Saving..." : "Save and Adjust Schedule"}
            </button>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={!!deleteTarget}
        onClose={() => {
          if (seasonActionLoading) return;
          setDeleteTarget(null);
          setSeasonActionError("");
        }}
        title="Delete Intramural"
        subtitle="This action cannot be undone."
        maxWidthClass="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Delete <strong>{deleteTarget?.name}</strong>? An intramural with existing competition data
            cannot be deleted — archive it instead to preserve historical records.
          </p>
          {seasonActionError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {seasonActionError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDeleteTarget(null);
                setSeasonActionError("");
              }}
              className="os-btn-ghost-soft"
              disabled={seasonActionLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSeasonDelete}
              disabled={seasonActionLoading}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
            >
              {seasonActionLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </AppModal>

    </div>
  );
};

export default Tournaments;
