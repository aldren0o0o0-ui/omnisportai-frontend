import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  archiveTeam,
  assignTeamCoach,
  createTeam,
  getTeamRoster,
  getTeamDeleteImpact,
  getTeams,
  removeTeamLogo,
  restoreTeam,
  uploadTeamLogo,
  updateTeam
} from "../../services/teamService";
import {
  approveEntry,
  listEntries,
  rejectEntry,
  requestEntryChanges,
} from "../../services/competitionEntryService";
import { getTournaments } from "../../services/tournamentService";
import { getSports } from "../../services/sportService";
import { getDepartments } from "../../services/departmentService";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";
import { getRoleAssignments } from "../../services/adminService";
import {
  assignPlayerToTeam,
  getPlayers,
  removePlayerFromTeam
} from "../../services/playerService";
import {
  getTeamApplications,
  updateApplicationStatus
} from "../../services/teamApplicationService";
import { TeamLogo, PlayerAvatar } from "../../components/common/IdentityImage";
import AppModal from "../../components/common/AppModal";
import ArchiveTeamModal from "../../components/teams/modals/ArchiveTeamModal";
import TeamProfileModal from "../../components/teams/modals/TeamProfileModal";
import RemoveFromRosterModal from "../../components/teams/modals/RemoveFromRosterModal";
import PlayerDetailsModal from "../../components/teams/modals/PlayerDetailsModal";
import ApplicationDetailsModal from "../../components/teams/modals/ApplicationDetailsModal";
import CollapsibleFilterPanel from "../../components/common/CollapsibleFilterPanel";
import StatusBadge from "../../components/common/StatusBadge";
import { useProfileDrawer, resolveProfileUserId } from "../../components/profile";
import { useWorkspace } from "../../context/WorkspaceContext";
import { HistoricalBanner } from "../../components/intramural";

const ROLE_COACH = 5;
const REGISTRATION_MONITOR_PAGE_SIZE = 10;

const isSportsOfficeDepartment = (departmentName) =>
  String(departmentName || "").trim().toLowerCase() === "sports office";

// eslint-disable-next-line no-unused-vars
const tabClass = (active) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
    active
      ? "bg-blue-600 text-white"
      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-[var(--surface)]"
  }`;

const getErrorMessage = (error, fallback) => {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;

  const detail = error?.response?.data?.detail;
  if (detail === "Tournament has no Workspace ownership.") {
    return "This registration view was still pointing to an old tournament. Please reselect the current Intramural and try again.";
  }
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "string") return first;
    if (first?.msg) return first.msg;
  }

  if (typeof error?.response?.data?.message === "string" && error.response.data.message.trim()) {
    return error.response.data.message;
  }
  if (typeof error?.message === "string" && error.message.trim()) return error.message;
  return fallback;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
};

const normalizeApplicationStatus = (status) => String(status || "").trim().toUpperCase();

const normalizeTeamStatus = (status) => String(status || "").trim().toUpperCase();
const isEntryAwaitingReview = (row) => String(row?.status || "").trim().toUpperCase() === "PENDING_REVIEW";

const ENTRY_REVIEW_COPY = {
  APPROVE: {
    title: "Approve entry",
    description: "Confirms that this entry is complete and eligible for bracket and match setup.",
    noteLabel: "Review note (optional)",
    notePlaceholder: "Add a short internal note if needed.",
    confirmLabel: "Approve entry",
  },
  REQUEST_REVISION: {
    title: "Request changes",
    description: "Returns the entry to the submitter so the listed information can be corrected and resubmitted.",
    noteLabel: "Changes required",
    notePlaceholder: "Clearly state what the submitter must correct.",
    confirmLabel: "Request changes",
  },
  REJECT: {
    title: "Reject entry",
    description: "Closes this submission as rejected. Use this when the entry is not eligible and should not proceed.",
    noteLabel: "Reason for rejection",
    notePlaceholder: "Clearly state why this entry cannot proceed.",
    confirmLabel: "Reject entry",
  },
};

const getTournamentRegistrationChip = (team) => {
  const registrationStatus = String(team?.registration_status || "").trim().toUpperCase();
  if (registrationStatus === "WITHDRAWN") return { label: "Withdrawn", tone: "WITHDRAWN" };
  if (registrationStatus === "REVISION_REQUESTED") return { label: "Revision Requested", tone: "PENDING" };
  if (registrationStatus === "SUBMITTED" || registrationStatus === "UNDER_REVIEW") {
    return { label: "Pending Review", tone: "PENDING" };
  }
  if (registrationStatus === "REJECTED") return { label: "Rejected", tone: "WITHDRAWN" };
  if (registrationStatus === "APPROVED") return { label: "Approved for Tournament", tone: "APPROVED" };
  if (registrationStatus === "NOT_REGISTERED") return { label: "Not Registered", tone: "REGISTERED" };
  return { label: registrationStatus || normalizeTeamStatus(team?.status) || "Approved for Tournament", tone: "REGISTERED" };
};

const registrationChipClass = (tone) => {
  if (tone === "APPROVED") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
  }
  if (tone === "PENDING") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  }
  if (tone === "WITHDRAWN") {
    return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300";
  }
  return "bg-slate-100 text-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-300";
};

const getPrimaryApplicationAction = (status) => {
  const normalized = normalizeApplicationStatus(status);
  if (normalized === "PENDING") return { key: "move_tryout", label: "Move to Tryout" };
  if (normalized === "FOR_TRYOUT") return { key: "accept_player", label: "Approve to Roster" };
  return null;
};

const Teams = ({ readOnly = false, departmentId = null, allowCoachAssignment = false }) => {
  const { isSportsCoordinator } = useAuth();
  const { selectedIntramural, isViewingHistorical } = useWorkspace();
  const { openProfile } = useProfileDrawer();
  const selectedWorkspaceId = selectedIntramural?.id ?? null;
  const showRegistrationMonitoring = isSportsCoordinator && !departmentId;
  const canCreateTeam = !readOnly && !showRegistrationMonitoring;
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [tournamentsError, setTournamentsError] = useState("");
  const [sports, setSports] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [coaches, setCoaches] = useState([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeDepartmentFilter, setActiveDepartmentFilter] = useState("");
  const [form, setForm] = useState({
    team_name: "",
    sport_id: "",
    department_id: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    team_name: "",
    sport_id: ""
  });
  const [archiveFilter, setArchiveFilter] = useState("active");
  const [registrationMonitorMode] = useState("ENTRY");
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState("ALL");
  const [teamSportFilter, setTeamSportFilter] = useState("");
  const [registrationMonitorParticipantShape, setRegistrationMonitorParticipantShape] = useState("ALL");
  const [registrationMonitorSearch, setRegistrationMonitorSearch] = useState("");

  const [assignModal, setAssignModal] = useState({
    open: false,
    team_id: "",
    coach_id: "",
    saving: false
  });
  const [uploadingLogoTeamId, setUploadingLogoTeamId] = useState(null);

  const [deleteTeamModal, setDeleteTeamModal] = useState({
    open: false,
    teamId: null,
    teamName: "",
    deleteImpact: null,
    hasDependencies: false,
    busy: false,
    error: ""
  });

  const [detailsModal, setDetailsModal] = useState({
    open: false,
    teamId: null,
    teamName: ""
  });
  const [detailsTab, setDetailsTab] = useState("overview");
  // eslint-disable-next-line no-unused-vars
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsNotice, setDetailsNotice] = useState("");
  const [teamDetails, setTeamDetails] = useState(null);
  const [teamRoster, setTeamRoster] = useState([]);

  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const [candidateRows, setCandidateRows] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [candidatePosition, setCandidatePosition] = useState("Roster");
  const [assigningCandidate, setAssigningCandidate] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showAdvancedOverride, setShowAdvancedOverride] = useState(false);

  const [removeRosterModal, setRemoveRosterModal] = useState({
    open: false,
    busy: false,
    player: null,
    error: ""
  });

  const [playerProfileModal, setPlayerProfileModal] = useState({
    open: false,
    player: null
  });

  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");
  const [applications, setApplications] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [applicationActionBusyId, setApplicationActionBusyId] = useState(null);
  const [applicationDetailModal, setApplicationDetailModal] = useState({
    open: false,
    row: null
  });
  const [registrationRows, setRegistrationRows] = useState([]);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const [registrationMonitorStatus, setRegistrationMonitorStatus] = useState("ALL");
  const [registrationMonitorSportId, setRegistrationMonitorSportId] = useState("");
  const [registrationMonitorDepartmentId, setRegistrationMonitorDepartmentId] = useState("");
  const [registrationMonitorPage, setRegistrationMonitorPage] = useState(1);
  const [overrideModal, setOverrideModal] = useState({
    open: false,
    row: null,
    action: "APPROVE",
    decision_note: "",
    busy: false,
    error: "",
  });

  const loadTeams = async () => {
    const selectedTournamentIsScoped =
      !selectedTournamentId ||
      tournaments.some((row) => String(row.id) === String(selectedTournamentId));

    if (
      selectedWorkspaceId &&
      (tournamentsLoading || !selectedTournamentId || !selectedTournamentIsScoped)
    ) {
      setTeams([]);
      return;
    }
    const tournamentFilter = selectedTournamentId ? Number(selectedTournamentId) : null;
    const data = await getTeams(departmentId, tournamentFilter, {
      includeArchived: archiveFilter === "all",
      archiveState: archiveFilter
    });
    setTeams(Array.isArray(data) ? data : []);
  };

  const loadRegistrations = async () => {
    const selectedTournamentIsScoped =
      !selectedTournamentId ||
      tournaments.some((row) => String(row.id) === String(selectedTournamentId));
    if (
      !showRegistrationMonitoring ||
      !selectedTournamentId ||
      (selectedWorkspaceId && (tournamentsLoading || !selectedTournamentIsScoped))
    ) {
      setRegistrationRows([]);
      setRegistrationError("");
      return;
    }
    setRegistrationLoading(true);
    setRegistrationError("");
    try {
      const res = await listEntries({
        tournamentId: Number(selectedTournamentId),
        departmentId: departmentId ? Number(departmentId) : null,
      });
      setRegistrationRows(Array.isArray(res) ? res : []);
    } catch (error) {
      setRegistrationRows([]);
      setRegistrationError(getErrorMessage(error, "Unable to load registrations. Try again."));
    } finally {
      setRegistrationLoading(false);
    }
  };

  const loadTournaments = async () => {
    setTournamentsLoading(true);
    setTournamentsError("");
    try {
      const rows = await getTournaments(selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : {});
      const items = Array.isArray(rows) ? rows : [];
      setTournaments(items);
      if (items.length > 0) {
        const isValid = items.some((row) => String(row.id) === String(selectedTournamentId));
        if (!selectedTournamentId || !isValid) {
          const active = items.find((row) => Boolean(row?.is_started) && !row?.is_archived) || items[0];
          const fallback = active || items[0];
          if (fallback?.id) {
            setSelectedTournamentId(String(fallback.id));
          }
        }
      } else {
        setSelectedTournamentId("");
      }
    } catch (error) {
      setTournaments([]);
      setTournamentsError(getErrorMessage(error, "Unable to load tournaments."));
    } finally {
      setTournamentsLoading(false);
    }
  };

  const loadSports = async () => {
    const data = await getSports(departmentId || null);
    setSports(Array.isArray(data) ? data : []);
  };

  const loadDepartments = async () => {
    const data = await getDepartments();
    setDepartments(Array.isArray(data) ? data : []);
  };

  const loadCoaches = async () => {
    if (!allowCoachAssignment || !departmentId) {
      setCoaches([]);
      return;
    }
    const data = await getRoleAssignments({
      role_id: ROLE_COACH,
      department_id: departmentId
    });
    setCoaches(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadSports();
    loadDepartments();
    loadCoaches();
    loadTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, allowCoachAssignment, selectedWorkspaceId]);

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, selectedTournamentId, archiveFilter, selectedWorkspaceId, tournamentsLoading, tournaments.length]);

  useEffect(() => {
    loadRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTournamentId, showRegistrationMonitoring, selectedWorkspaceId, tournamentsLoading, tournaments.length]);

  useEffect(() => {
    setRegistrationMonitorPage(1);
  }, [
    selectedTournamentId,
    registrationMonitorStatus,
    registrationMonitorSportId,
    registrationMonitorDepartmentId,
    registrationMonitorParticipantShape,
    registrationMonitorSearch,
  ]);

  const selectedTournament = useMemo(
    () => tournaments.find((row) => String(row.id) === String(selectedTournamentId)) || null,
    [selectedTournamentId, tournaments]
  );
  const selectedTournamentSportIdSet = useMemo(() => {
    const ids = Array.isArray(selectedTournament?.sport_ids)
      ? selectedTournament.sport_ids
      : [];
    return new Set(
      ids
        .map((id) => Number(id || 0))
        .filter((id) => Number.isFinite(id) && id > 0)
    );
  }, [selectedTournament]);
  const intramuralSports = useMemo(() => {
    if (selectedTournamentSportIdSet.size === 0) return sports;
    return sports.filter((sport) => selectedTournamentSportIdSet.has(Number(sport.id)));
  }, [selectedTournamentSportIdSet, sports]);

  useEffect(() => {
    if (
      registrationMonitorSportId &&
      selectedTournamentSportIdSet.size > 0 &&
      !selectedTournamentSportIdSet.has(Number(registrationMonitorSportId))
    ) {
      setRegistrationMonitorSportId("");
    }
  }, [registrationMonitorSportId, selectedTournamentSportIdSet]);

  const sportMap = useMemo(() => {
    const map = {};
    sports.forEach((sport) => {
      map[sport.id] = sport.sport_name;
    });
    return map;
  }, [sports]);

  const departmentMap = useMemo(() => {
    const map = {};
    departments.forEach((department) => {
      map[department.id] = department.department_name;
    });
    return map;
  }, [departments]);

  const visibleDepartments = useMemo(() => {
    const rows = departments.filter((department) => !isSportsOfficeDepartment(department.department_name));
    if (!departmentId) return rows;
    return rows.filter((department) => Number(department.id) === Number(departmentId));
  }, [departmentId, departments]);

  useEffect(() => {
    if (departmentId) {
      setActiveDepartmentFilter(String(departmentId));
      return;
    }

    if (visibleDepartments.length === 0) {
      setActiveDepartmentFilter("");
      return;
    }

    if (showRegistrationMonitoring) {
      return;
    }

    const hasExistingSelection = visibleDepartments.some(
      (department) => String(department.id) === String(activeDepartmentFilter)
    );
    if (!hasExistingSelection) {
      setActiveDepartmentFilter(String(visibleDepartments[0].id));
    }
  }, [activeDepartmentFilter, departmentId, showRegistrationMonitoring, visibleDepartments]);

  const visibleDepartmentIdSet = useMemo(
    () => new Set(visibleDepartments.map((department) => Number(department.id))),
    [visibleDepartments]
  );

  const coordinatorScopedTeams = useMemo(() => {
    return teams.filter((team) => {
      const departmentMatches = departmentId || visibleDepartmentIdSet.has(Number(team.department_id));
      const sportMatches =
        selectedTournamentSportIdSet.size === 0 ||
        selectedTournamentSportIdSet.has(Number(team.sport_id));
      return departmentMatches && sportMatches;
    });
  }, [departmentId, selectedTournamentSportIdSet, teams, visibleDepartmentIdSet]);

  const teamCountsByDepartment = useMemo(() => {
    const counts = {};
    for (const team of coordinatorScopedTeams) {
      const key = String(team.department_id || "");
      if (!key) continue;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [coordinatorScopedTeams]);

  const filteredTeams = useMemo(() => {
    const selectedDepartment = String(activeDepartmentFilter || "");
    const selectedSport = String(teamSportFilter || "");
    const rows = coordinatorScopedTeams.filter((team) => {
      const departmentMatch = !selectedDepartment || String(team.department_id || "") === selectedDepartment;
      const sportMatch = !selectedSport || String(team.sport_id || "") === selectedSport;
      return departmentMatch && sportMatch;
    });
    const registrationFiltered = rows.filter((team) => {
      if (registrationStatusFilter === "ALL") return true;
      const status = String(team.registration_status || "NOT_REGISTERED").trim().toUpperCase();
      if (registrationStatusFilter === "SUBMITTED") {
        return ["SUBMITTED", "UNDER_REVIEW", "PENDING_REVIEW"].includes(status);
      }
      return status === registrationStatusFilter;
    });
    return registrationFiltered.sort((left, right) => {
      const sportCompare = String(sportMap[left.sport_id] || "").localeCompare(
        String(sportMap[right.sport_id] || "")
      );
      if (sportCompare !== 0) return sportCompare;
      return String(left.team_name || "").localeCompare(String(right.team_name || ""));
    });
  }, [activeDepartmentFilter, coordinatorScopedTeams, registrationStatusFilter, sportMap, teamSportFilter]);

  const monitoredRegistrationRows = useMemo(() => {
    const effectiveDepartmentFilter = departmentId
      ? String(departmentId)
      : String(registrationMonitorDepartmentId || "");
    return registrationRows.filter((row) => {
      const rowStatus = String(row.status || "").trim().toUpperCase();
      const rowSportId = String(row.sport_id || "");
      const rowDepartmentId = String(row.department_id || "");
      const rowShape = String(row.participant_shape || "").trim().toUpperCase();
      
      const statusMatch = registrationMonitorStatus === "ALL"
        || (registrationMonitorStatus === "PENDING_REVIEW" && (rowStatus === "SUBMITTED" || rowStatus === "UNDER_REVIEW" || rowStatus === "PENDING_REVIEW"))
        || rowStatus === registrationMonitorStatus;
      const intramuralSportMatch =
        selectedTournamentSportIdSet.size === 0 ||
        selectedTournamentSportIdSet.has(Number(row.sport_id));
      const sportMatch = !registrationMonitorSportId || rowSportId === String(registrationMonitorSportId);
      const departmentMatch = !effectiveDepartmentFilter || rowDepartmentId === effectiveDepartmentFilter;
      const shapeMatch = registrationMonitorParticipantShape === "ALL" || rowShape === registrationMonitorParticipantShape;
      
      let searchMatch = true;
      if (registrationMonitorSearch.trim()) {
        const term = registrationMonitorSearch.toLowerCase();
        const sportName = sportMap[row.sport_id] || "";
        const departmentName = departmentMap[row.department_id] || "";
        const entryName = (row.entry_name || row.team_name || "").toLowerCase();
        searchMatch = entryName.includes(term) || sportName.toLowerCase().includes(term) || departmentName.toLowerCase().includes(term);
      }

      return intramuralSportMatch && statusMatch && sportMatch && departmentMatch && shapeMatch && searchMatch;
    });
  }, [departmentId, registrationMonitorDepartmentId, registrationMonitorSportId, registrationMonitorStatus, registrationMonitorParticipantShape, registrationMonitorSearch, registrationRows, selectedTournamentSportIdSet, sportMap, departmentMap]);

  const registrationMonitorFilterSummary = useMemo(() => {
    const parts = [];
    if (registrationMonitorStatus !== "ALL") {
      const statusLabels = {
        PENDING_REVIEW: "Pending Review",
        REVISION_REQUESTED: "Revision Requested",
        APPROVED: "Approved",
        REJECTED: "Rejected",
        WITHDRAWN: "Withdrawn",
      };
      parts.push(statusLabels[registrationMonitorStatus] || "Selected status");
    }
    if (registrationMonitorSportId) {
      const sport = intramuralSports.find((row) => String(row.id) === String(registrationMonitorSportId));
      parts.push(sport?.sport_name || "Selected sport");
    }
    if (!departmentId && registrationMonitorDepartmentId) {
      const department = visibleDepartments.find(
        (row) => String(row.id) === String(registrationMonitorDepartmentId)
      );
      parts.push(department?.department_name || "Selected department");
    }
    if (registrationMonitorParticipantShape !== "ALL") {
      parts.push(registrationMonitorParticipantShape);
    }
    if (registrationMonitorSearch.trim()) {
      parts.push(`Search: "${registrationMonitorSearch}"`);
    }
    return parts;
  }, [departmentId, intramuralSports, registrationMonitorDepartmentId, registrationMonitorSportId, registrationMonitorStatus, registrationMonitorParticipantShape, registrationMonitorSearch, visibleDepartments]);

  const registrationMonitorActiveFilterCount = registrationMonitorFilterSummary.length;

  const registrationMonitorTotalPages = useMemo(
    () => Math.max(1, Math.ceil(monitoredRegistrationRows.length / REGISTRATION_MONITOR_PAGE_SIZE)),
    [monitoredRegistrationRows.length]
  );

  const registrationMonitorCurrentPage = Math.min(registrationMonitorPage, registrationMonitorTotalPages);

  const pagedMonitoredRegistrationRows = useMemo(() => {
    const startIndex = (registrationMonitorCurrentPage - 1) * REGISTRATION_MONITOR_PAGE_SIZE;
    return monitoredRegistrationRows.slice(startIndex, startIndex + REGISTRATION_MONITOR_PAGE_SIZE);
  }, [monitoredRegistrationRows, registrationMonitorCurrentPage]);

  const registrationMonitorRangeStart =
    monitoredRegistrationRows.length === 0
      ? 0
      : (registrationMonitorCurrentPage - 1) * REGISTRATION_MONITOR_PAGE_SIZE + 1;
  const registrationMonitorRangeEnd = Math.min(
    monitoredRegistrationRows.length,
    registrationMonitorCurrentPage * REGISTRATION_MONITOR_PAGE_SIZE
  );

  const clearRegistrationMonitorFilters = () => {
    setRegistrationMonitorStatus("ALL");
    setRegistrationMonitorSportId("");
    setRegistrationMonitorParticipantShape("ALL");
    setRegistrationMonitorSearch("");
    if (!departmentId) {
      setRegistrationMonitorDepartmentId("");
    }
  };

  const teamFilterSummary = useMemo(() => {
    const parts = [];
    if (!departmentId && activeDepartmentFilter) {
      parts.push(departmentMap[Number(activeDepartmentFilter)] || "Selected department");
    }
    if (teamSportFilter) {
      parts.push(sportMap[Number(teamSportFilter)] || "Selected sport");
    }
    if (registrationStatusFilter !== "ALL") {
      const labels = {
        SUBMITTED: "Pending Review",
        REVISION_REQUESTED: "Revision Requested",
        APPROVED: "Approved",
        REJECTED: "Rejected",
        WITHDRAWN: "Withdrawn",
        NOT_REGISTERED: "Not Registered",
      };
      parts.push(labels[registrationStatusFilter] || "Selected registration status");
    }
    if (archiveFilter !== "active") {
      parts.push(archiveFilter === "archived" ? "Archived teams" : "All archive states");
    }
    return parts;
  }, [activeDepartmentFilter, archiveFilter, departmentId, departmentMap, registrationStatusFilter, sportMap, teamSportFilter]);

  const teamActiveFilterCount = teamFilterSummary.length;

  const clearTeamFilters = () => {
    setRegistrationStatusFilter("ALL");
    setTeamSportFilter("");
    setArchiveFilter("active");
    if (!departmentId) {
      setActiveDepartmentFilter("");
    }
  };

  const coachById = useMemo(() => {
    const map = {};
    coaches.forEach((coach) => {
      map[coach.user_id] = coach;
    });
    return map;
  }, [coaches]);

  const coachesBySportId = useMemo(() => {
    const map = {};
    coaches.forEach((coach) => {
      const sportId = coach.sport_id;
      if (!sportId) return;
      if (!map[sportId]) map[sportId] = [];
      map[sportId].push(coach);
    });
    return map;
  }, [coaches]);

  const teamById = useMemo(() => {
    const map = {};
    teams.forEach((team) => {
      map[team.id] = team;
    });
    return map;
  }, [teams]);

  const selectedTeamForCoachModal = assignModal.team_id ? teamById[Number(assignModal.team_id)] : null;
  const assignableCoaches = selectedTeamForCoachModal
    ? coachesBySportId[selectedTeamForCoachModal.sport_id] || []
    : [];

  const rosterPlayerIdSet = useMemo(
    () => new Set((teamRoster || []).map((row) => Number(row.id))),
    [teamRoster]
  );

  // eslint-disable-next-line no-unused-vars
  const visibleCandidateRows = useMemo(
    () => candidateRows.filter((row) => !rosterPlayerIdSet.has(Number(row.id))),
    [candidateRows, rosterPlayerIdSet]
  );

  const openCreateModal = () => {
    const defaultSportId = intramuralSports.length === 1 ? String(intramuralSports[0].id) : "";
    setForm({
      team_name: "",
      sport_id: defaultSportId,
      department_id: departmentId ? String(departmentId) : activeDepartmentFilter || ""
    });
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.team_name || !form.sport_id || (!departmentId && !form.department_id)) {
      alert("Team name, sport, and department are required.");
      return;
    }

    const resolvedDepartmentId = Number(departmentId || form.department_id);
    await createTeam({
      team_name: form.team_name,
      sport_id: Number(form.sport_id),
      department_id: resolvedDepartmentId
    });

    setForm({
      team_name: "",
      sport_id: "",
      department_id: departmentId ? String(departmentId) : ""
    });
    setIsCreateModalOpen(false);
    if (!departmentId && Number.isFinite(resolvedDepartmentId)) {
      setActiveDepartmentFilter(String(resolvedDepartmentId));
    }
    await loadTeams();
  };

  const startEdit = (team) => {
    setEditingId(team.id);
    setEditForm({
      team_name: team.team_name || "",
      sport_id: String(team.sport_id || "")
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editForm.team_name || !editForm.sport_id) {
      alert("Team name and sport are required.");
      return;
    }

    await updateTeam(editingId, {
      team_name: editForm.team_name,
      sport_id: Number(editForm.sport_id)
    });
    setEditingId(null);
    await loadTeams();
  };

  const openDeleteTeamModal = async (team) => {
    setDeleteTeamModal({
      open: true,
      teamId: Number(team.id),
      teamName: team.team_name || "Unnamed team",
      deleteImpact: null,
      hasDependencies: false,
      busy: true,
      error: ""
    });
    try {
      const impact = await getTeamDeleteImpact(Number(team.id));
      setDeleteTeamModal((prev) => ({
        ...prev,
        busy: false,
        deleteImpact: impact,
        hasDependencies: Boolean(impact?.has_dependencies)
      }));
    } catch (error) {
      setDeleteTeamModal((prev) => ({
        ...prev,
        busy: false,
        error: getErrorMessage(error, "Unable to load delete impact.")
      }));
    }
  };

  const closeDeleteTeamModal = () => {
    if (deleteTeamModal.busy) return;
    setDeleteTeamModal({
      open: false,
      teamId: null,
      teamName: "",
      deleteImpact: null,
      hasDependencies: false,
      busy: false,
      error: ""
    });
  };

  const confirmDeleteTeam = async () => {
    if (!deleteTeamModal.teamId) return;
    setDeleteTeamModal((prev) => ({ ...prev, busy: true, error: "" }));
    try {
      await archiveTeam(deleteTeamModal.teamId);
      await loadTeams();
      closeDeleteTeamModal();
    } catch (error) {
      setDeleteTeamModal((prev) => ({
        ...prev,
        busy: false,
        error: getErrorMessage(error, "Failed to archive team.")
      }));
    }
  };

  const handleRestoreTeam = async (team) => {
    setDetailsNotice("");
    try {
      await restoreTeam(Number(team.id));
      await loadTeams();
    } catch (error) {
      alert(getErrorMessage(error, "Failed to restore team."));
    }
  };

  const handleUploadTeamLogo = async (teamId, file) => {
    if (!file) return;
    setUploadingLogoTeamId(teamId);
    try {
      await uploadTeamLogo(teamId, file);
      await loadTeams();
      if (detailsModal.open && Number(detailsModal.teamId) === Number(teamId)) {
        await refreshTeamDetails(Number(teamId), { keepNotice: true });
      }
    } catch (error) {
      alert(getErrorMessage(error, "Failed to upload team logo."));
    } finally {
      setUploadingLogoTeamId(null);
    }
  };

  const handleRemoveTeamLogo = async (teamId) => {
    setUploadingLogoTeamId(teamId);
    try {
      await removeTeamLogo(teamId);
      await loadTeams();
      if (detailsModal.open && Number(detailsModal.teamId) === Number(teamId)) {
        await refreshTeamDetails(Number(teamId), { keepNotice: true });
      }
    } catch (error) {
      alert(getErrorMessage(error, "Failed to remove team logo."));
    } finally {
      setUploadingLogoTeamId(null);
    }
  };

  const openAssignCoachModal = (team = null) => {
    setAssignModal({
      open: true,
      team_id: team?.id ? String(team.id) : "",
      coach_id: team?.coach_id ? String(team.coach_id) : "",
      saving: false
    });
  };

  const closeAssignCoachModal = () => {
    if (assignModal.saving) return;
    setAssignModal({
      open: false,
      team_id: "",
      coach_id: "",
      saving: false
    });
  };

  const handleAssignCoach = async () => {
    const teamId = Number(assignModal.team_id);
    if (!teamId) {
      alert("Please select a team.");
      return;
    }

    const coachId =
      assignModal.coach_id === "" || assignModal.coach_id === null || assignModal.coach_id === undefined
        ? null
        : Number(assignModal.coach_id);

    setAssignModal((prev) => ({ ...prev, saving: true }));
    try {
      await assignTeamCoach(teamId, coachId);
      await loadTeams();
      if (detailsModal.open && Number(detailsModal.teamId) === Number(teamId)) {
        await refreshTeamDetails(Number(teamId), { keepNotice: true });
      }
      setAssignModal({
        open: false,
        team_id: "",
        coach_id: "",
        saving: false
      });
    } catch (error) {
      alert(getErrorMessage(error, "Failed to assign coach."));
    } finally {
      setAssignModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const loadApplicationsForTeam = async (teamId) => {
    setApplicationsLoading(true);
    setApplicationsError("");
    try {
      const payload = await getTeamApplications(
        teamId,
        null,
        selectedTournamentId ? Number(selectedTournamentId) : null
      );
      const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
      setApplications(items);
    } catch (error) {
      setApplications([]);
      setApplicationsError(getErrorMessage(error, "Unable to load team applications."));
    } finally {
      setApplicationsLoading(false);
    }
  };

  const refreshTeamDetails = async (teamId, options = {}) => {
    const { keepNotice = false } = options;
    setDetailsLoading(true);
    setDetailsError("");
    if (!keepNotice) setDetailsNotice("");

    try {
      const scopedRosterPayload = await getTeamRoster(
        teamId,
        selectedTournamentId ? Number(selectedTournamentId) : null
      );
      setTeamDetails(scopedRosterPayload || null);
      const players = Array.isArray(scopedRosterPayload?.players) ? scopedRosterPayload.players : [];
      setTeamRoster(players);

      if (detailsTab === "applications") {
        await loadApplicationsForTeam(teamId);
      }
    } catch (error) {
      setTeamDetails(null);
      setTeamRoster([]);
      setDetailsError(getErrorMessage(error, "Unable to load team details."));
    } finally {
      setDetailsLoading(false);
    }
  };

  const openTeamDetails = async (team) => {
    setDetailsModal({
      open: true,
      teamId: Number(team.id),
      teamName: team.team_name || "Unnamed team"
    });
    setDetailsTab("overview");
    setCandidateRows([]);
    setCandidateQuery("");
    setCandidateError("");
    setSelectedCandidateId("");
    setCandidatePosition("Roster");
    setShowAdvancedOverride(false);
    setApplications([]);
    setApplicationsError("");
      await refreshTeamDetails(Number(team.id));
      await loadApplicationsForTeam(Number(team.id));
  };

  const closeTeamDetails = () => {
    setDetailsModal({ open: false, teamId: null, teamName: "" });
    setTeamDetails(null);
    setTeamRoster([]);
    setDetailsError("");
    setDetailsNotice("");
    setApplications([]);
    setApplicationsError("");
    setApplicationDetailModal({ open: false, row: null });
    setRemoveRosterModal({ open: false, busy: false, player: null, error: "" });
    setPlayerProfileModal({ open: false, player: null });
  };

  const handleDetailsTabChange = async (nextTab) => {
    setDetailsTab(nextTab);
    if (nextTab === "applications" && detailsModal.teamId && applications.length === 0 && !applicationsLoading) {
      await loadApplicationsForTeam(Number(detailsModal.teamId));
    }
  };

  const searchExistingPlayers = async () => {
    const query = String(candidateQuery || "").trim();
    if (query.length < 2) {
      setCandidateRows([]);
      setCandidateError("Enter at least 2 characters to search players.");
      return;
    }

    setCandidateLoading(true);
    setCandidateError("");
    try {
      const rows = await getPlayers({ query });
      setCandidateRows(Array.isArray(rows) ? rows : []);
      if (!Array.isArray(rows) || rows.length === 0) {
        setCandidateError("No players matched your search.");
      }
    } catch (error) {
      setCandidateRows([]);
      setCandidateError(getErrorMessage(error, "Unable to search players."));
    } finally {
      setCandidateLoading(false);
    }
  };

  const handleAddExistingPlayer = async () => {
    const teamId = Number(detailsModal.teamId);
    const playerId = Number(selectedCandidateId);
    const tournamentId = selectedTournamentId ? Number(selectedTournamentId) : null;
    if (!tournamentId) {
      setDetailsNotice("Select a tournament first.");
      return;
    }
    if (!teamId || !playerId) {
      setDetailsNotice("Select a player to add.");
      return;
    }

    if (rosterPlayerIdSet.has(playerId)) {
      setDetailsNotice("This player is already assigned to this roster.");
      return;
    }

    setAssigningCandidate(true);
    setDetailsNotice("");
    try {
      await assignPlayerToTeam(playerId, teamId, {
        position: candidatePosition || "Roster",
        tournament_id: tournamentId
      });
      setSelectedCandidateId("");
      setCandidatePosition("Roster");
      setDetailsNotice("Player added to tournament roster.");
      await refreshTeamDetails(teamId, { keepNotice: true });
    } catch (error) {
      setDetailsNotice(getErrorMessage(error, "Unable to add player to roster."));
    } finally {
      setAssigningCandidate(false);
    }
  };

  const openRemoveRosterModal = (player) => {
    setRemoveRosterModal({ open: true, busy: false, player, error: "" });
  };

  const closeRemoveRosterModal = () => {
    if (removeRosterModal.busy) return;
    setRemoveRosterModal({ open: false, busy: false, player: null, error: "" });
  };

  const confirmRemoveFromRoster = async () => {
    const teamId = Number(detailsModal.teamId);
    const player = removeRosterModal.player;
    if (!teamId || !player?.id) return;

    setRemoveRosterModal((prev) => ({ ...prev, busy: true, error: "" }));
    try {
      await removePlayerFromTeam(Number(player.id), teamId, {
        tournamentId: selectedTournamentId ? Number(selectedTournamentId) : null
      });
      setDetailsNotice("Player removed from roster.");
      closeRemoveRosterModal();
      await refreshTeamDetails(teamId, { keepNotice: true });
    } catch (error) {
      setRemoveRosterModal((prev) => ({
        ...prev,
        busy: false,
        error: getErrorMessage(error, "Unable to remove player from roster.")
      }));
    }
  };

  const openPlayerProfile = (player) => {
    setPlayerProfileModal({ open: true, player });
  };

  const closePlayerProfile = () => {
    setPlayerProfileModal({ open: false, player: null });
  };

  const openUserProfileDrawer = (userId, playerId = null) => {
    const resolved = resolveProfileUserId(userId);
    if (!resolved && !playerId) return;
    openProfile({
      userId: resolved || null,
      playerId: playerId ? Number(playerId) : null,
      tournamentId: selectedTournamentId ? Number(selectedTournamentId) : null,
    });
  };

  const handleApplicationAction = async (row, actionType) => {
    let transition = null;
    if (actionType === "move_tryout") transition = "FOR_TRYOUT";
    else if (actionType === "accept_player") transition = "ACCEPTED_AS_PLAYER";
    else if (actionType === "reject") transition = "REJECTED";
    if (!transition) return;

    setApplicationActionBusyId(row.id);
    setDetailsNotice("");
    try {
      await updateApplicationStatus(row.id, {
        new_status: transition,
        decision_note: null
      });
      const actionLabel =
        actionType === "reject"
          ? "Application rejected."
          : transition === "ACCEPTED_AS_PLAYER"
            ? "Applicant accepted to tournament roster."
            : "Applicant moved to tryout.";
      setDetailsNotice(actionLabel);
      if (detailsModal.teamId) {
        await loadApplicationsForTeam(Number(detailsModal.teamId));
        await refreshTeamDetails(Number(detailsModal.teamId), { keepNotice: true });
      }
    } catch (error) {
      setDetailsNotice(getErrorMessage(error, `Unable to ${actionType} application.`));
    } finally {
      setApplicationActionBusyId(null);
    }
  };

  const openOverrideModal = (row, action) => {
    setOverrideModal({
      open: true,
      row,
      action,
      decision_note: "",
      busy: false,
      error: "",
    });
  };

  const closeOverrideModal = () => {
    if (overrideModal.busy) return;
    setOverrideModal({
      open: false,
      row: null,
      action: "APPROVE",
      decision_note: "",
      busy: false,
      error: "",
    });
  };

  const submitCoordinatorOverride = async () => {
    if (!overrideModal.row) return;
    const decisionNote = String(overrideModal.decision_note || "").trim();
    if (overrideModal.action !== "APPROVE" && !decisionNote) {
      setOverrideModal((prev) => ({ ...prev, error: "Explain the reason for this decision." }));
      return;
    }

    setOverrideModal((prev) => ({ ...prev, busy: true, error: "" }));
    try {
      const entryId = Number(overrideModal.row.id);
      const payload = { decision_note: decisionNote || null };
      if (overrideModal.action === "APPROVE") await approveEntry(entryId, payload);
      else if (overrideModal.action === "REQUEST_REVISION") await requestEntryChanges(entryId, payload);
      else await rejectEntry(entryId, payload);
      closeOverrideModal();
      await loadRegistrations();
    } catch (error) {
      setOverrideModal((prev) => ({
        ...prev,
        busy: false,
        error: getErrorMessage(error, "The entry could not be reviewed."),
      }));
    }
  };

  const detailsSportLabel =
    teamDetails?.sport_name || sportMap[teamDetails?.sport_id] || sportMap[teamById[detailsModal.teamId]?.sport_id] || "-";
  const detailsDepartmentLabel =
    teamDetails?.department_name ||
    departmentMap[teamDetails?.department_id] ||
    departmentMap[teamById[detailsModal.teamId]?.department_id] ||
    "-";

  const detailsCoachLabel = teamDetails?.coach
    ? `${teamDetails.coach.name || "Coach"}${teamDetails.coach.email ? ` (${teamDetails.coach.email})` : ""}`
    : teamDetails?.coach_id
      ? "Unknown user"
      : teamById[detailsModal.teamId]?.coach_name
        ? `${teamById[detailsModal.teamId].coach_name}${teamById[detailsModal.teamId].coach_email ? ` (${teamById[detailsModal.teamId].coach_email})` : ""}`
        : "Not Assigned";

  const summaryRosterCount = Array.isArray(teamRoster) ? teamRoster.length : 0;
  const pendingApplicationsCount = applications.filter((row) => {
    const status = normalizeApplicationStatus(row.application_status);
    return status === "PENDING" || status === "FOR_TRYOUT";
  }).length;
  const acceptedApplicationsCount = applications.filter(
    (row) => normalizeApplicationStatus(row.application_status) === "ACCEPTED_AS_PLAYER"
  ).length;

  return (
    <div className="space-y-6">
      {isViewingHistorical && <HistoricalBanner />}

      {/* {showRegistrationMonitoring ? (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-[var(--surface)]">
          <p className="text-xs uppercase tracking-wide text-slate-500">Submitted/Pending</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{registrationSummary.PENDING_REVIEW}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-[var(--surface)]">
          <p className="text-xs uppercase tracking-wide text-slate-500">Revision Requested</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{registrationSummary.REVISION_REQUESTED}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-[var(--surface)]">
          <p className="text-xs uppercase tracking-wide text-slate-500">Approved</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{registrationSummary.APPROVED}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-[var(--surface)]">
          <p className="text-xs uppercase tracking-wide text-slate-500">Rejected</p>
          <p className="text-xl font-bold text-rose-700 dark:text-rose-300">{registrationSummary.REJECTED}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-[var(--surface)]">
          <p className="text-xs uppercase tracking-wide text-slate-500">Withdrawn</p>
          <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{registrationSummary.WITHDRAWN}</p>
        </div>
      </div>
      ) : null} */}

      {showRegistrationMonitoring ? (
        <div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Competition Entries</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Review every TEAM, SOLO, and DUO participant registered for the selected Intramural.
            </p>
          </div>
        </div>
      ) : null}

      {showRegistrationMonitoring && registrationMonitorMode === "ENTRY" ? (
      <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-[var(--surface)]">
        <CollapsibleFilterPanel
          title="Registration Filters"
          activeCount={registrationMonitorActiveFilterCount}
          onClear={clearRegistrationMonitorFilters}
          summaryText={
            registrationMonitorActiveFilterCount > 0
              ? `Filtered by: ${registrationMonitorFilterSummary.join(" · ")}`
              : "No active filters"
          }
          compact
          className="mb-1"
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <select
              value={registrationMonitorStatus}
              onChange={(event) => setRegistrationMonitorStatus(event.target.value)}
              className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="REVISION_REQUESTED">Revision Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
            <select
              value={registrationMonitorSportId}
              onChange={(event) => setRegistrationMonitorSportId(event.target.value)}
              className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="">All Sports</option>
              {intramuralSports.map((sport) => (
                <option key={sport.id} value={String(sport.id)}>{getSportDisplayName(sport)}</option>
              ))}
            </select>
            {!departmentId ? (
              <select
                value={registrationMonitorDepartmentId}
                onChange={(event) => setRegistrationMonitorDepartmentId(event.target.value)}
                className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="">All Departments</option>
                {visibleDepartments.map((department) => (
                  <option key={department.id} value={String(department.id)}>{department.department_name}</option>
                ))}
              </select>
            ) : null}
            <select
              value={registrationMonitorParticipantShape}
              onChange={(event) => setRegistrationMonitorParticipantShape(event.target.value)}
              className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Entry Types</option>
              <option value="TEAM">Team Entry</option>
              <option value="DUO">Duo Entry</option>
              <option value="SOLO">Solo Entry</option>
            </select>
            <input
              type="text"
              placeholder="Search by entry or team name"
              value={registrationMonitorSearch}
              onChange={(event) => setRegistrationMonitorSearch(event.target.value)}
              className={`rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-slate-700 placeholder-slate-400 dark:text-slate-200 dark:placeholder-slate-500 ${departmentId ? "lg:col-span-2" : ""}`}
            />
          </div>
        </CollapsibleFilterPanel>

        {registrationError ? (
          <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{registrationError}</span>
              <button
                type="button"
                onClick={loadRegistrations}
                className="rounded border border-rose-300 bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        {registrationLoading ? (
          <div className="mt-3 rounded-lg border border-slate-200 px-3 py-5 text-center text-sm text-slate-500 dark:border-slate-800">
            Loading registrations...
          </div>
        ) : monitoredRegistrationRows.length === 0 ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-[var(--surface)]/40">
            No registrations matched your filters.
          </div>
        ) : (
          <>
            <div className="mt-3 space-y-2 lg:hidden">
              {pagedMonitoredRegistrationRows.map((row) => (
                <div key={`registration-card-${row.id}`} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <TeamLogo imageUrl={row.logo_url} label={row.entry_name || row.team_name} scale="sm" className="shrink-0" />
                      <p className="min-w-0 break-words font-semibold text-slate-900 dark:text-slate-100">{row.entry_name || row.team_name}</p>
                    </div>
                    <StatusBadge status={row.status_label || row.status} />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {sportMap[row.sport_id] || "-"} | {departmentMap[row.department_id] || "-"}
                  </p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Type: {row.participant_shape}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Submitted: {row.submitted_at ? formatDateTime(row.submitted_at) : "-"}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Submitted by: {coachById[row.submitted_by_coach_id]?.name || coachById[row.submitted_by_coach_id]?.email || (row.submitted_by_coach_id ? `User ${row.submitted_by_coach_id}` : "-")}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Reviewed by: {row.reviewed_by_user_id ? `User ${row.reviewed_by_user_id}` : "-"}
                  </p>
                  <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">Latest note: {row.decision_note || row.latest_note_or_reason || "-"}</p>
                  <div className="mt-3">
                    <div className={`${isEntryAwaitingReview(row) ? "group" : ""} relative inline-block text-left`}>
                      <button
                        type="button"
                        disabled={!isEntryAwaitingReview(row)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-[var(--surface)]"
                      >
                        {isEntryAwaitingReview(row) ? "Review" : "Reviewed"}
                        <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <div className="absolute left-0 z-10 mt-1 hidden w-48 origin-top-left rounded-md bg-white shadow-lg  group-hover:block dark:bg-[var(--surface-soft)] dark:ring-white/10">
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => openOverrideModal(row, "APPROVE")}
                            className="block w-full px-4 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => openOverrideModal(row, "REQUEST_REVISION")}
                            className="block w-full px-4 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                          >
                            Request changes
                          </button>
                          <button
                            type="button"
                            onClick={() => openOverrideModal(row, "REJECT")}
                            className="block w-full px-4 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 hidden overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:bg-[var(--surface-soft)] dark:text-[var(--text-soft)]">
                  <tr>
                    <th className="px-3 py-2">Entry</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Sport</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Submitted By</th>
                    <th className="px-3 py-2">Reviewed By</th>
                    <th className="px-3 py-2">Note</th>
                    <th className="px-3 py-2 text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {pagedMonitoredRegistrationRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">
                        <span className="flex min-w-0 items-center gap-2">
                          <TeamLogo imageUrl={row.logo_url} label={row.entry_name || row.team_name} scale="sm" className="shrink-0" />
                          <span className="break-words">{row.entry_name || row.team_name}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {row.participant_shape}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {sportMap[row.sport_id] || "-"}
                      </td>
                      <td className="px-3 py-2">{departmentMap[row.department_id] || "-"}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={row.status_label || row.status} />
                      </td>
                      <td className="px-3 py-2">
                        {coachById[row.submitted_by_coach_id]?.name || coachById[row.submitted_by_coach_id]?.email || (row.submitted_by_coach_id ? `User ${row.submitted_by_coach_id}` : "-")}
                      </td>
                      <td className="px-3 py-2">
                        {row.reviewed_by_user_id ? `User ${row.reviewed_by_user_id}` : "-"}
                      </td>
                      <td className="px-3 py-2 text-xs">{row.decision_note || row.latest_note_or_reason || "-"}</td>
                      <td className="px-3 py-2 text-right">
                        <div className={`${isEntryAwaitingReview(row) ? "group" : ""} relative inline-block text-left`}>
                          <button
                            type="button"
                            disabled={!isEntryAwaitingReview(row)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-[var(--surface)]"
                          >
                            {isEntryAwaitingReview(row) ? "Review" : "Reviewed"}
                            <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <div className="absolute right-0 z-10 mt-1 hidden w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 group-hover:block dark:bg-[var(--surface-soft)] dark:ring-white/10">
                            <div className="py-1">
                              <button
                                type="button"
                                onClick={() => openOverrideModal(row, "APPROVE")}
                                className="block w-full px-4 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => openOverrideModal(row, "REQUEST_REVISION")}
                                className="block w-full px-4 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                              >
                                Request changes
                              </button>
                              <button
                                type="button"
                                onClick={() => openOverrideModal(row, "REJECT")}
                                className="block w-full px-4 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {registrationMonitorTotalPages > 1 ? (
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Page {registrationMonitorCurrentPage} of {registrationMonitorTotalPages}
                </p>
                <div className="flex items-center gap-2">
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {monitoredRegistrationRows.length === 0
                      ? "Showing 0 registrations."
                      : `Showing ${registrationMonitorRangeStart}-${registrationMonitorRangeEnd} of ${monitoredRegistrationRows.length} registration${monitoredRegistrationRows.length === 1 ? "" : "s"}.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setRegistrationMonitorPage((prev) => Math.max(1, prev - 1))}
                    disabled={registrationMonitorCurrentPage <= 1}
                    className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-[var(--surface)]"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegistrationMonitorPage((prev) => Math.min(registrationMonitorTotalPages, prev + 1))}
                    disabled={registrationMonitorCurrentPage >= registrationMonitorTotalPages}
                    className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-[var(--surface)]"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
      ) : null}

      {!departmentId && !showRegistrationMonitoring && (
        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-[var(--surface)]">
          <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Departments</h2>
          {visibleDepartments.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No departments available.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {visibleDepartments.map((department) => {
                const isActive = String(activeDepartmentFilter) === String(department.id);
                const count = teamCountsByDepartment[String(department.id)] || 0;
                return (
                  <button
                    key={department.id}
                    type="button"
                    onClick={() => setActiveDepartmentFilter(String(department.id))}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-[var(--surface)]"
                    }`}
                  >
                    {department.department_name} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {(!showRegistrationMonitoring || registrationMonitorMode === "TEAM") ? (
      <div className="rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-[var(--surface)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">Registered Teams</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              View team ownership, coach assignment, and registration status. Teams are created through department and coach workflows.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canCreateTeam && (
              <button
                onClick={openCreateModal}
                className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Create Team
              </button>
            )}
            {!readOnly && allowCoachAssignment && departmentId && (
              <button
                onClick={() => openAssignCoachModal()}
                className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"
              >
                Assign Coach
              </button>
            )}
          </div>
        </div>

        <CollapsibleFilterPanel
          title="Team Filters"
          activeCount={teamActiveFilterCount}
          onClear={clearTeamFilters}
          summaryText={
            teamActiveFilterCount > 0
              ? `Filtered by: ${teamFilterSummary.join(" · ")}`
              : "No active filters"
          }
          compact
          className="mb-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            {!departmentId ? (
              <select
                value={activeDepartmentFilter}
                onChange={(event) => setActiveDepartmentFilter(event.target.value)}
                className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="">All Departments</option>
                {visibleDepartments.map((department) => (
                  <option key={department.id} value={String(department.id)}>{department.department_name}</option>
                ))}
              </select>
            ) : null}
            <select
              value={teamSportFilter}
              onChange={(event) => setTeamSportFilter(event.target.value)}
              className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="">All Sports</option>
              {intramuralSports.map((sport) => (
                <option key={sport.id} value={String(sport.id)}>{getSportDisplayName(sport)}</option>
              ))}
            </select>
            <select
              value={registrationStatusFilter}
              onChange={(event) => setRegistrationStatusFilter(event.target.value)}
              className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Waiting</option>
              <option value="REVISION_REQUESTED">Revision Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="WITHDRAWN">Withdrawn</option>
              <option value="NOT_REGISTERED">Not Registered</option>
            </select>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-[var(--surface-soft)]">
              {[
                { key: "active", label: "Active" },
                { key: "archived", label: "Archived" },
                { key: "all", label: "All" }
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setArchiveFilter(option.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    archiveFilter === option.key
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[var(--surface)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CollapsibleFilterPanel>

        {filteredTeams.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            {teamActiveFilterCount > 0
              ? "No results match your filters."
              : "No teams are registered for the selected Intramural."}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600 dark:bg-[var(--surface-soft)] dark:text-[var(--text-soft)]">
                    <th className="px-4 py-3 font-semibold">Team</th>
                    <th className="px-4 py-3 font-semibold">Sport</th>
                    <th className="px-4 py-3 font-semibold">Department</th>
                    <th className="px-4 py-3 font-semibold">Coach</th>
                    <th className="px-4 py-3 font-semibold">Registration</th>
                    {!readOnly && <th className="px-4 py-3 text-right font-semibold">Manage</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm dark:divide-slate-800/80">
                  {filteredTeams.map((team) => (
                    <tr
                      key={team.id}
                      className={`${
                        team.is_archived
                          ? "bg-slate-100/70 text-slate-500 dark:bg-[var(--surface-soft)] dark:text-slate-400"
                          : "bg-white/70 dark:bg-slate-950/30"
                      }`}
                    >
                      {editingId === team.id && !readOnly ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              className="w-full rounded border border-slate-300 bg-white p-2 text-slate-900 outline-none transition focus:border-cyan-500/50 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100"
                              value={editForm.team_name}
                              onChange={(event) =>
                                setEditForm({ ...editForm, team_name: event.target.value })
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full rounded border border-slate-300 bg-white p-2 text-slate-900 outline-none transition focus:border-cyan-500/50 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-100"
                              value={editForm.sport_id}
                              onChange={(event) =>
                                setEditForm({ ...editForm, sport_id: event.target.value })
                              }
                            >
                              <option value="">Select Sport</option>
                              {intramuralSports.map((sport) => (
                                <option key={sport.id} value={sport.id}>
                                  {getSportDisplayName(sport)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                            {departmentMap[team.department_id] || team.department_id || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                            {team.coach_name || team.coach_email || team.coach_id || "Not Assigned"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${registrationChipClass(getTournamentRegistrationChip(team).tone)}`}>
                              {getTournamentRegistrationChip(team).label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={saveEdit}
                                className="rounded bg-blue-600 px-3 py-1 text-white"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="rounded bg-slate-200 px-3 py-1 text-slate-800 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-2">
                              <TeamLogo imageUrl={team.logo_url} label={team.team_name || "Team"} scale="sm" />
                              <span>{team.team_name}</span>
                              {team.is_archived ? (
                                <span className="rounded-full bg-slate-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                  Archived
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {sportMap[team.sport_id] || team.sport_id || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {departmentMap[team.department_id] || team.department_id || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {team.coach_name
                              ? `${team.coach_name}${team.coach_email ? ` (${team.coach_email})` : ""}`
                              : team.coach_id && coachById[team.coach_id]
                                ? `${coachById[team.coach_id].name} (${coachById[team.coach_id].email})`
                                : team.coach_id
                                  ? "Unknown user"
                                  : "Not Assigned"}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${registrationChipClass(getTournamentRegistrationChip(team).tone)}`}>
                              {getTournamentRegistrationChip(team).label}
                            </span>
                          </td>
                          {!readOnly && (
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => openTeamDetails(team)}
                                  className="rounded border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                >
                                  View
                                </button>
                                {allowCoachAssignment && departmentId && (
                                  <button
                                    onClick={() => openAssignCoachModal(team)}
                                    className="rounded bg-emerald-700 px-3 py-1 text-white"
                                  >
                                    {team.coach_id ? "Change Coach" : "Assign Coach"}
                                  </button>
                                )}
                                <details className="relative">
                                  <summary className="cursor-pointer list-none rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200">
                                    More
                                  </summary>
                                  <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-[var(--surface)]">
                                    <button type="button" onClick={() => startEdit(team)} disabled={team.is_archived} className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-[var(--surface-soft)]">Edit team</button>
                                    {team.is_archived ? (
                                      <button type="button" onClick={() => handleRestoreTeam(team)} className="block w-full px-3 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Restore team</button>
                                    ) : (
                                      <button type="button" onClick={() => openDeleteTeamModal(team)} className="block w-full px-3 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10">Archive team</button>
                                    )}
                                    <label className="block cursor-pointer px-3 py-2 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10">
                                      {uploadingLogoTeamId === team.id ? "Uploading logo..." : "Change logo"}
                                      <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" disabled={uploadingLogoTeamId === team.id} onChange={(event) => handleUploadTeamLogo(team.id, event.target.files?.[0] || null)} />
                                    </label>
                                    {team.logo_url ? (
                                      <button type="button" onClick={() => handleRemoveTeamLogo(team.id)} disabled={uploadingLogoTeamId === team.id} className="block w-full px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-500/10">Remove logo</button>
                                    ) : null}
                                  </div>
                                </details>
                              </div>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      ) : null}

      {overrideModal.open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeOverrideModal()}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[var(--surface)]" role="dialog" aria-modal="true" aria-labelledby="entry-review-title">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <h3 id="entry-review-title" className="text-lg font-bold text-slate-900 dark:text-white">
                {ENTRY_REVIEW_COPY[overrideModal.action]?.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {ENTRY_REVIEW_COPY[overrideModal.action]?.description}
              </p>
            </div>

            <div className="space-y-5 px-5 py-5">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-slate-500 dark:text-slate-400">Entry</dt>
                <dd className="min-w-0 break-words font-semibold text-slate-900 dark:text-slate-100">{overrideModal.row?.entry_name || overrideModal.row?.team_name || "-"}</dd>
                <dt className="text-slate-500 dark:text-slate-400">Type</dt>
                <dd className="text-slate-700 dark:text-slate-200">{overrideModal.row?.participant_shape || "-"}</dd>
                <dt className="text-slate-500 dark:text-slate-400">Sport</dt>
                <dd className="text-slate-700 dark:text-slate-200">{sportMap[overrideModal.row?.sport_id] || "-"}</dd>
                <dt className="text-slate-500 dark:text-slate-400">Department</dt>
                <dd className="min-w-0 break-words text-slate-700 dark:text-slate-200">{departmentMap[overrideModal.row?.department_id] || "-"}</dd>
              </dl>

              <div>
                <label htmlFor="entry-decision-note" className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {ENTRY_REVIEW_COPY[overrideModal.action]?.noteLabel}
                </label>
                <textarea
                  id="entry-decision-note"
                  rows={4}
                  autoFocus
                  required={overrideModal.action !== "APPROVE"}
                  placeholder={ENTRY_REVIEW_COPY[overrideModal.action]?.notePlaceholder}
                  value={overrideModal.decision_note}
                  onChange={(event) => setOverrideModal((prev) => ({ ...prev, decision_note: event.target.value, error: "" }))}
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-100"
                />
              </div>
              {overrideModal.error ? (
                <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                  {overrideModal.error}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeOverrideModal}
                disabled={overrideModal.busy}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCoordinatorOverride}
                disabled={overrideModal.busy}
                className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                  overrideModal.action === "APPROVE"
                    ? "bg-emerald-700 hover:bg-emerald-600"
                    : overrideModal.action === "REQUEST_REVISION"
                    ? "bg-amber-700 hover:bg-amber-600"
                    : "bg-rose-700 hover:bg-rose-600"
                }`}
              >
                {overrideModal.busy ? "Saving..." : ENTRY_REVIEW_COPY[overrideModal.action]?.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!readOnly && isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-lg dark:border-slate-700 dark:bg-[var(--surface)]">
            <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Create New Team</h3>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Team Name</label>
                <input
                  name="team_name"
                  placeholder="Team Name"
                  className="w-full rounded border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-cyan-500/50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-100"
                  onChange={(event) => setForm({ ...form, team_name: event.target.value })}
                  value={form.team_name}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Sport</label>
                <select
                  name="sport_id"
                  className="w-full rounded border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-cyan-500/50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-100"
                  onChange={(event) => setForm({ ...form, sport_id: event.target.value })}
                  value={form.sport_id}
                >
                  <option value="">Select Sport</option>
                  {intramuralSports.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {getSportDisplayName(sport)}
                    </option>
                  ))}
                </select>
              </div>

              {!departmentId && (
                <div>
                  <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Department</label>
                  <select
                    name="department_id"
                    className="w-full rounded border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-cyan-500/50 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-100"
                    onChange={(event) => setForm({ ...form, department_id: event.target.value })}
                    value={form.department_id}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.department_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end md:col-span-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="min-h-10 rounded border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[var(--surface-soft)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-10 rounded bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-500"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {allowCoachAssignment && assignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-lg dark:border-slate-700 dark:bg-[var(--surface)]">
            <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Assign Coach</h3>
            <div className="mb-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Coach</label>
                <select
                  value={assignModal.coach_id}
                  onChange={(event) => setAssignModal((prev) => ({ ...prev, coach_id: event.target.value }))}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-100"
                >
                  <option value="">No Coach Assigned</option>
                  {assignableCoaches.map((coach) => (
                    <option key={coach.user_id || coach.id} value={coach.user_id || coach.id}>
                      {coach.user_name || coach.full_name || coach.email || `Coach #${coach.user_id || coach.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeAssignCoachModal}
                disabled={assignModal.saving}
                className="min-h-10 rounded border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[var(--surface-soft)]"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignCoach}
                disabled={assignModal.saving}
                className="min-h-10 rounded bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
              >
                {assignModal.saving ? "Assigning..." : "Assign Coach"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ArchiveTeamModal closeDeleteTeamModal={closeDeleteTeamModal} confirmDeleteTeam={confirmDeleteTeam} deleteTeamModal={deleteTeamModal} />

      <TeamProfileModal acceptedApplicationsCount={acceptedApplicationsCount} applicationsError={applicationsError} assigningCandidate={assigningCandidate} candidateError={candidateError} candidateLoading={candidateLoading} candidatePosition={candidatePosition} candidateQuery={candidateQuery} closeTeamDetails={closeTeamDetails} detailsCoachLabel={detailsCoachLabel} detailsDepartmentLabel={detailsDepartmentLabel} detailsError={detailsError} detailsModal={detailsModal} detailsNotice={detailsNotice} detailsSportLabel={detailsSportLabel} formatDateTime={formatDateTime} getPrimaryApplicationAction={getPrimaryApplicationAction} handleAddExistingPlayer={handleAddExistingPlayer} handleApplicationAction={handleApplicationAction} handleDetailsTabChange={handleDetailsTabChange} openPlayerProfile={openPlayerProfile} openRemoveRosterModal={openRemoveRosterModal} openUserProfileDrawer={openUserProfileDrawer} pendingApplicationsCount={pendingApplicationsCount} refreshTeamDetails={refreshTeamDetails} searchExistingPlayers={searchExistingPlayers} selectedCandidateId={selectedCandidateId} setApplicationDetailModal={setApplicationDetailModal} setCandidatePosition={setCandidatePosition} setCandidateQuery={setCandidateQuery} setSelectedCandidateId={setSelectedCandidateId} setShowAdvancedOverride={setShowAdvancedOverride} summaryRosterCount={summaryRosterCount} />

      <RemoveFromRosterModal closeRemoveRosterModal={closeRemoveRosterModal} confirmRemoveFromRoster={confirmRemoveFromRoster} removeRosterModal={removeRosterModal} />

      <PlayerDetailsModal closePlayerProfile={closePlayerProfile} formatDateTime={formatDateTime} playerProfileModal={playerProfileModal} />

      <ApplicationDetailsModal applicationDetailModal={applicationDetailModal} formatDateTime={formatDateTime} openUserProfileDrawer={openUserProfileDrawer} setApplicationDetailModal={setApplicationDetailModal} />
    </div>
  );
};

export default Teams;
