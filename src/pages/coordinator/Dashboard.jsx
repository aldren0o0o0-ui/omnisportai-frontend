import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bot,
  CalendarDays,
  MapPin,
} from "lucide-react";

import PageHeaderCard from "../../components/common/PageHeaderCard";
import DashboardCard from "../../components/common/DashboardCard";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";
import { LiveDashboardStage } from "../../components/dashboard/role_dashboard/layouts/DashboardLifecycleStages";
import { mapChampionshipLeaderboard, mapChampionshipSportBreakdown } from "../../components/dashboard/role_dashboard/layouts/dashboardStandingsUtils.js";
import {
  SetupProgressChecklist,
  EmptyIntramuralState,
} from "../../components/intramural";
import IntramuralStatusBadge from "../../components/intramural/IntramuralStatusBadge";
import LifecycleReadinessPanel from "../../components/intramural/LifecycleReadinessPanel";
import { semesterLabel } from "../../components/intramural/intramuralStatus";

import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import useRoleDashboardData from "../../hooks/useRoleDashboardData";
import {
  INTRAMURAL_ASSIGNMENTS_CHANGED_EVENT,
  getAssignmentReadiness,
} from "../../services/intramuralService";
import ConfigLockedModal from "../../components/matches/ConfigLockedModal";
import ConfigStatusBadge from "../../components/matches/ConfigStatusBadge";
import { getMatchEventConfig, migrateMatchTemplate } from "../../services/matchEventService";
import { getChampionshipStandings } from "../../services/standingsService";
import { getBrackets } from "../../services/bracketService";
import { getTournamentTeamRegistrations } from "../../services/teamService";
import { listEntries } from "../../services/competitionEntryService";
import { getSports } from "../../services/sportService";
import { deriveCompetitionSetupProgress, deriveStaffCoverage } from "./coordinatorSetupProgress";


const LIVE_STATUSES = new Set(["ONGOING", "LIVE", "IN_PROGRESS"]);
const REGISTRATION_WAITING_STATUSES = new Set(["PENDING_REVIEW", "SUBMITTED", "UNDER_REVIEW", "REVISION_REQUESTED"]);
const REGISTRATION_ACTIVE_STATUSES = new Set([...REGISTRATION_WAITING_STATUSES, "APPROVED"]);
const REGISTRATION_INACTIVE_STATUSES = new Set(["DRAFT", "NOT_REGISTERED", "WITHDRAWN", "REJECTED"]);

const safeDateFromIso = (value) => {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatTime = (value) => {
  const parsed = safeDateFromIso(value);
  if (!parsed) return "TBD";
  return parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const eventIsLive = (event, now = new Date()) => {
  const status = String(event?.status || "").trim().toUpperCase();
  if (LIVE_STATUSES.has(status)) return true;

  const startAt = safeDateFromIso(event?.start);
  const endAt = safeDateFromIso(event?.end);
  if (!startAt || !endAt) return false;
  return now >= startAt && now < endAt;
};

const splitMatchup = (event) => {
  const team1 = String(event?.team1_label || "").trim();
  const team2 = String(event?.team2_label || "").trim();
  if (team1 || team2) {
    return {
      left: team1 || "Team A",
      right: team2 || "Team B",
    };
  }

  const title = String(event?.title || "Match").trim();
  const maybeMatchup = title.includes(":") ? title.split(":").slice(1).join(":").trim() : title;
  const parts = maybeMatchup.split(" vs ");
  if (parts.length >= 2) {
    return {
      left: String(parts[0] || "Team A").trim(),
      right: String(parts.slice(1).join(" vs ") || "Team B").trim(),
    };
  }
  return { left: maybeMatchup || "Team A", right: "Team B" };
};

const getSportLabel = (event) => {
  const explicitSport = String(event?.sport || "").trim();
  if (explicitSport) return explicitSport;
  const title = String(event?.title || "").trim();
  if (title.includes(":")) return title.split(":")[0].trim() || "Match";
  return "Match";
};

const normalizeNumericScore = (leftRaw, rightRaw) => {
  const left = Number(leftRaw);
  const right = Number(rightRaw);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return {
    left: String(left),
    right: String(right),
  };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roleNames } = useAuth();
  const {
    workspace: activeWorkspace,
    selectedIntramural,
    loading: intramuralLoading,
  } = useWorkspace();
  const {
    dashboard,
    tournaments,
    selectedTournamentId,
    loading: dashboardLoading,
    error,
  } = useRoleDashboardData({ autoRefreshOnTournamentChange: true });
  const activeIntramural = selectedIntramural || activeWorkspace || null;
  const dashboardTournamentRows = useMemo(
    () => (Array.isArray(tournaments) ? tournaments : []),
    [tournaments]
  );
  const selectedDashboardTournament = useMemo(() => {
    const selectedId = Number(selectedTournamentId || 0);
    if (selectedId > 0) {
      const selected = dashboardTournamentRows.find((row) => Number(row?.id || 0) === selectedId);
      if (selected) return selected;
    }
    return dashboardTournamentRows[0] || null;
  }, [dashboardTournamentRows, selectedTournamentId]);
  const displayedIntramural = useMemo(() => {
    if (activeIntramural) return activeIntramural;
    if (!selectedDashboardTournament?.workspace_id) return null;
    return {
      id: Number(selectedDashboardTournament.workspace_id),
      name: selectedDashboardTournament.workspace_name || selectedDashboardTournament.name,
      school_year: selectedDashboardTournament.school_year || "",
      semester: selectedDashboardTournament.semester || "",
      description: selectedDashboardTournament.description || "",
      start_date: selectedDashboardTournament.start_date || selectedDashboardTournament.start_at || null,
      end_date: selectedDashboardTournament.end_date || selectedDashboardTournament.end_at || null,
      status: selectedDashboardTournament.status || "DRAFT",
      is_active: Boolean(selectedDashboardTournament.is_active),
      started_at: selectedDashboardTournament.started_at || null,
    };
  }, [activeIntramural, selectedDashboardTournament]);
  const displayedManageTo = "/coordinator/intramurals";
  const displayedWorkspaceId = displayedIntramural?.id ? Number(displayedIntramural.id) : null;
  const selectedTournamentNumericId = Number(selectedTournamentId || selectedDashboardTournament?.id || 0);
  const assignmentSetupTo = displayedWorkspaceId
    ? `/coordinator/intramurals?workspace_id=${displayedWorkspaceId}${selectedTournamentNumericId ? `&tournament_id=${selectedTournamentNumericId}` : ""}&section=assignments`
    : selectedTournamentNumericId
      ? `/coordinator/intramurals?tournament_id=${selectedTournamentNumericId}&section=assignments`
      : "/coordinator/intramurals?section=assignments";
  const [bracketCount, setBracketCount] = useState(0);
  const [bracketRows, setBracketRows] = useState([]);
  const [lockedModalMatch, setLockedModalMatch] = useState(null);
  const [migrationPreview, setMigrationPreview] = useState(null);
  const [migrationError, setMigrationError] = useState("");
  const [isReviewingMigration, setIsReviewingMigration] = useState(false);
  const [isResolvingMigration, setIsResolvingMigration] = useState(false);
  const [championshipStandings, setChampionshipStandings] = useState(null);
  const [championshipStandingsUnavailable, setChampionshipStandingsUnavailable] = useState(false);
  const [sportsCatalog, setSportsCatalog] = useState([]);
  const [now, setNow] = useState(() => new Date());
  const [assignmentReadiness, setAssignmentReadiness] = useState(null);
  const [registrationDashboardStatusFilter, setRegistrationDashboardStatusFilter] = useState("WAITING");
  const [selectedSetupStepKey, setSelectedSetupStepKey] = useState(null);
  const [registrationMonitor, setRegistrationMonitor] = useState({
    loading: false,
    error: "",
    teamRows: [],
    entryRows: [],
  });

  const canMigrateTemplates = useMemo(
    () => Array.isArray(roleNames) && roleNames.includes("SPORTS_COORDINATOR"),
    [roleNames]
  );

  const schedule = dashboard?.schedule || {};
  const matchHealthRows = useMemo(
    () => (Array.isArray(dashboard?.match_health) ? dashboard.match_health : []),
    [dashboard?.match_health]
  );
  const matchHealthById = useMemo(() => {
    const map = new Map();
    matchHealthRows.forEach((row) => {
      const matchId = Number(row?.match_id);
      if (Number.isFinite(matchId) && matchId > 0) {
        map.set(matchId, row);
      }
    });
    return map;
  }, [matchHealthRows]);
  const events = useMemo(() => {
    const rawEvents = Array.isArray(schedule?.events) ? schedule.events : [];
    if (!rawEvents.length) return [];
    return rawEvents.map((event) => {
      const matchId = Number(event?.match_id);
      const health = Number.isFinite(matchId) ? matchHealthById.get(matchId) : null;
      if (!health) return event;
      const normalizedFromHealth = normalizeNumericScore(health?.score_team1, health?.score_team2);
      if (!normalizedFromHealth) return event;
      return {
        ...event,
        score_team1: Number(health?.score_team1),
        score_team2: Number(health?.score_team2),
        score: `${normalizedFromHealth.left} - ${normalizedFromHealth.right}`,
      };
    });
  }, [matchHealthById, schedule?.events]);

  useEffect(() => {
    let cancelled = false;

    const loadAssignmentReadiness = async () => {
      if (!displayedWorkspaceId) {
        setAssignmentReadiness(null);
        return;
      }
      try {
        const result = await getAssignmentReadiness(displayedWorkspaceId);
        if (!cancelled) setAssignmentReadiness(result);
      } catch (requestError) {
        if (!cancelled) {
          const conflict = requestError?.response?.status === 409;
          setAssignmentReadiness(conflict ? { status: "CONFLICT" } : null);
        }
      }
    };

    void loadAssignmentReadiness();
    const handleAssignmentChange = (event) => {
      const changedWorkspaceId = Number(event?.detail?.workspace_id || event?.detail?.workspaceId || 0);
      if (changedWorkspaceId > 0 && changedWorkspaceId !== Number(displayedWorkspaceId)) return;
      void loadAssignmentReadiness();
    };
    window.addEventListener(INTRAMURAL_ASSIGNMENTS_CHANGED_EVENT, handleAssignmentChange);
    return () => {
      cancelled = true;
      window.removeEventListener(INTRAMURAL_ASSIGNMENTS_CHANGED_EVENT, handleAssignmentChange);
    };
  }, [displayedWorkspaceId]);

  useEffect(() => {
    let cancelled = false;
    const loadRegistrationMonitor = async () => {
      if (!selectedTournamentNumericId) {
        setRegistrationMonitor({ loading: false, error: "", teamRows: [], entryRows: [] });
        return;
      }
      setRegistrationMonitor((current) => ({ ...current, loading: true, error: "" }));
      try {
        const [teamPayload, entryPayload] = await Promise.all([
          getTournamentTeamRegistrations(selectedTournamentNumericId, { status: "ALL", page: 1, limit: 200 }),
          listEntries({ tournamentId: selectedTournamentNumericId }),
        ]);
        if (cancelled) return;
        const teamRows = Array.isArray(teamPayload)
          ? teamPayload
          : Array.isArray(teamPayload?.items)
            ? teamPayload.items
            : Array.isArray(teamPayload?.rows)
              ? teamPayload.rows
              : [];
        const entryRows = Array.isArray(entryPayload) ? entryPayload : [];
        setRegistrationMonitor({ loading: false, error: "", teamRows, entryRows });
      } catch (requestError) {
        if (cancelled) return;
        const detail = requestError?.response?.data?.detail;
        setRegistrationMonitor({
          loading: false,
          error:
            typeof detail === "string" && detail.trim()
              ? detail
              : "Registration monitoring could not be loaded right now.",
          teamRows: [],
          entryRows: [],
        });
      }
    };
    void loadRegistrationMonitor();
    return () => {
      cancelled = true;
    };
  }, [selectedTournamentNumericId]);

  const registrationSummary = useMemo(() => {
    const teamRows = Array.isArray(registrationMonitor.teamRows) ? registrationMonitor.teamRows : [];
    const entryRows = Array.isArray(registrationMonitor.entryRows) ? registrationMonitor.entryRows : [];
    const normalizeStatus = (value) => String(value || "").trim().toUpperCase();
    const statusBucket = (value) => {
      const status = normalizeStatus(value);
      if (REGISTRATION_WAITING_STATUSES.has(status)) return "WAITING";
      if (status === "APPROVED") return "APPROVED";
      if (status === "REJECTED") return "REJECTED";
      return "OTHER";
    };
    const submittedTeamRows = teamRows.filter((row) => {
      const status = normalizeStatus(row?.status || row?.registration_status);
      return !["DRAFT", "NOT_REGISTERED", "WITHDRAWN"].includes(status);
    });
    const pendingTeamRows = teamRows.filter((row) => {
      const status = normalizeStatus(row?.status || row?.registration_status);
      return REGISTRATION_WAITING_STATUSES.has(status);
    });
    const approvedTeamRows = teamRows.filter((row) => normalizeStatus(row?.status || row?.registration_status) === "APPROVED");
    const pendingEntryRows = entryRows.filter((row) => normalizeStatus(row?.status) === "PENDING_REVIEW");
    const approvedEntryRows = entryRows.filter((row) => normalizeStatus(row?.status) === "APPROVED");
    const soloRows = entryRows.filter((row) => normalizeStatus(row?.participant_shape) === "SOLO");
    const duoRows = entryRows.filter((row) => normalizeStatus(row?.participant_shape) === "DUO");
    const allRows = [
      ...submittedTeamRows.map((row) => ({
        id: `team-${row.id || row.registration_id || row.team_id}`,
        type: "Team",
        name: row.team_name || row.name || "Team registration",
        sport: row.sport_name || row.sport || "Sport",
        department: row.department_name || row.department_code || "Department",
        submittedBy:
          row.submitted_by_name ||
          row.submitted_by_email ||
          row.coach_name ||
          row.coach_email ||
          (row.submitted_by_coach_id ? `Coach ${row.submitted_by_coach_id}` : "-"),
        status: row.status_label || row.status || row.registration_status || "Pending review",
        statusBucket: statusBucket(row.status || row.registration_status),
      })),
      ...entryRows.map((row) => ({
        id: `entry-${row.id}`,
        type: normalizeStatus(row.participant_shape) === "DUO" ? "Duo" : "Solo",
        name: row.entry_name || `${row.participant_shape || "Entry"} registration`,
        sport: row.sport_name || row.sport || "Sport",
        department: row.department_name || row.department_code || "Department",
        submittedBy:
          row.submitted_by_name ||
          row.submitted_by_email ||
          row.coach_name ||
          row.coach_email ||
          (row.submitted_by_coach_id ? `Coach ${row.submitted_by_coach_id}` : "-"),
        status: row.status || "Pending review",
        statusBucket: statusBucket(row.status),
      })),
    ];
    const recentRows = allRows
      .filter((row) => registrationDashboardStatusFilter === "ALL" || row.statusBucket === registrationDashboardStatusFilter)
      .slice(0, 6);
    return {
      teamTotal: submittedTeamRows.length,
      teamPending: pendingTeamRows.length,
      teamApproved: approvedTeamRows.length,
      entryTotal: entryRows.length,
      entryPending: pendingEntryRows.length,
      entryApproved: approvedEntryRows.length,
      soloTotal: soloRows.length,
      duoTotal: duoRows.length,
      recentRows,
    };
  }, [registrationDashboardStatusFilter, registrationMonitor.entryRows, registrationMonitor.teamRows]);

  const registrationProgress = useMemo(() => {
    const normalizeStatus = (value) => String(value || "").trim().toUpperCase();
    const normalizeShape = (value) => {
      const shape = String(value || "").trim().toUpperCase();
      return shape || "TEAM";
    };
    const normalizeId = (value) => {
      const parsed = Number(value || 0);
      return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "";
    };
    const isActiveSubmission = (status) => {
      const normalized = normalizeStatus(status);
      return REGISTRATION_ACTIVE_STATUSES.has(normalized) && !REGISTRATION_INACTIVE_STATUSES.has(normalized);
    };

    const teamRows = Array.isArray(registrationMonitor.teamRows) ? registrationMonitor.teamRows : [];
    const entryRows = Array.isArray(registrationMonitor.entryRows) ? registrationMonitor.entryRows : [];
    const targets = (Array.isArray(assignmentReadiness?.coach_targets) ? assignmentReadiness.coach_targets : [])
      .filter((target) => String(target?.coverage_status || "").toUpperCase() !== "NOT_REQUIRED");

    const teamByRegistrationId = new Map();
    teamRows.forEach((row) => {
      const id = normalizeId(row.id || row.registration_id);
      if (id) teamByRegistrationId.set(id, row);
    });

    const entryRowsByPoolKey = new Map();
    entryRows.forEach((row) => {
      const shape = normalizeShape(row.participant_shape || row.entry_type);
      const eventId = normalizeId(row.tournament_sport_event_id || row.event_id) || "default";
      const key = [
        normalizeId(row.department_id),
        normalizeId(row.sport_id),
        shape,
        eventId,
      ].join(":");
      const current = entryRowsByPoolKey.get(key) || [];
      current.push(row);
      entryRowsByPoolKey.set(key, current);
    });

    const departmentMap = new Map();
    const sportMap = new Map();
    let submittedTargets = 0;
    let approvedTargets = 0;
    let waitingTargets = 0;

    targets.forEach((target) => {
      const targetType = String(target.target_type || "").trim().toUpperCase();
      const entryType = normalizeShape(target.entry_type);
      let matchedRows = [];
      if (targetType === "TEAM_SLOT") {
        const matched = teamByRegistrationId.get(normalizeId(target.target_id));
        matchedRows = matched ? [matched] : [];
      } else {
        const eventId = normalizeId(target.event_id || target.tournament_sport_event_id) || "default";
        const key = [
          normalizeId(target.department_id),
          normalizeId(target.sport_id),
          entryType,
          eventId,
        ].join(":");
        matchedRows = entryRowsByPoolKey.get(key) || [];
      }

      const statuses = matchedRows.map((row) => normalizeStatus(row.status || row.registration_status));
      const hasApproved = statuses.includes("APPROVED");
      const hasSubmitted = hasApproved || statuses.some((status) => isActiveSubmission(status));
      if (hasSubmitted) submittedTargets += 1;
      if (hasApproved) approvedTargets += 1;
      if (hasSubmitted && !hasApproved) waitingTargets += 1;

      const departmentId = normalizeId(target.department_id) || `department-${target.department_name || "unknown"}`;
      const departmentLabel = target.department_code || target.department_name || "Department";
      const departmentRow = departmentMap.get(departmentId) || {
        id: departmentId,
        name: departmentLabel,
        total: 0,
        submitted: 0,
        approved: 0,
        waiting: 0,
      };
      departmentRow.total += 1;
      if (hasSubmitted) departmentRow.submitted += 1;
      if (hasApproved) departmentRow.approved += 1;
      if (hasSubmitted && !hasApproved) departmentRow.waiting += 1;
      departmentMap.set(departmentId, departmentRow);

      const sportId = normalizeId(target.sport_id) || `sport-${target.sport_name || "unknown"}`;
      const sportLabel = target.sport_name || "Sport";
      const sportRow = sportMap.get(sportId) || {
        id: sportId,
        name: sportLabel,
        total: 0,
        submitted: 0,
        approved: 0,
        waiting: 0,
      };
      sportRow.total += 1;
      if (hasSubmitted) sportRow.submitted += 1;
      if (hasApproved) sportRow.approved += 1;
      if (hasSubmitted && !hasApproved) sportRow.waiting += 1;
      sportMap.set(sportId, sportRow);
    });

    const decorate = (row) => {
      const total = Number(row.total || 0);
      const submitted = Number(row.submitted || 0);
      const approved = Number(row.approved || 0);
      const missing = Math.max(0, total - submitted);
      const percent = total > 0 ? Math.round((submitted / total) * 100) : 0;
      return {
        ...row,
        missing,
        percent,
        complete: total > 0 && missing === 0,
        fullyApproved: total > 0 && approved >= total,
      };
    };

    const departments = [...departmentMap.values()]
      .map(decorate)
      .sort((left, right) => Number(left.complete) - Number(right.complete) || right.missing - left.missing || left.name.localeCompare(right.name));
    const sports = [...sportMap.values()]
      .map(decorate)
      .sort((left, right) => Number(left.complete) - Number(right.complete) || right.missing - left.missing || left.name.localeCompare(right.name));

    const totalTargets = targets.length;
    const completeDepartments = departments.filter((row) => row.complete).length;
    const completeSports = sports.filter((row) => row.complete).length;
    const maxDepartmentSubmitted = Math.max(1, ...departments.map((row) => Number(row.submitted || 0)));
    const chartMax = Math.max(4, Math.ceil(maxDepartmentSubmitted / 4) * 4);
    const chartTicks = [chartMax, Math.round(chartMax * 0.75), Math.round(chartMax * 0.5), Math.round(chartMax * 0.25), 0];
    return {
      totalTargets,
      submittedTargets,
      approvedTargets,
      waitingTargets,
      missingTargets: Math.max(0, totalTargets - submittedTargets),
      departments,
      sports,
      completeDepartments,
      completeSports,
      chartMax,
      chartTicks,
    };
  }, [assignmentReadiness?.coach_targets, registrationMonitor.entryRows, registrationMonitor.teamRows]);

  const staffAssignmentComplete = useMemo(() => {
    const status = String(assignmentReadiness?.status || "").trim().toUpperCase();
    if (!assignmentReadiness || ["CONFLICT", "NOT_CONFIGURED"].includes(status)) return false;
    const summary = assignmentReadiness?.summary || {};
    const managers = summary.managers || {};
    const facilitators = summary.facilitators || {};

    const managersTotal = Number(managers.total || 0);
    const managersAssigned = Number(managers.assigned || 0);
    const managersMissing = Number(managers.missing || 0);
    const managersConflicts = Number(managers.conflicts || 0);

    const facilitatorsTotal = Number(facilitators.total || 0);
    const facilitatorsAssigned = Number(facilitators.assigned || 0);
    const facilitatorsMissing = Number(facilitators.missing || 0);
    const facilitatorsConflicts = Number(facilitators.conflicts || 0);

    const managersComplete =
      managersTotal > 0 &&
      managersAssigned >= managersTotal &&
      managersMissing === 0 &&
      managersConflicts === 0;
    const facilitatorsComplete =
      facilitatorsTotal > 0 &&
      facilitatorsAssigned >= facilitatorsTotal &&
      facilitatorsMissing === 0 &&
      facilitatorsConflicts === 0;
    return managersComplete && facilitatorsComplete;
  }, [assignmentReadiness]);

  useEffect(() => {
    const clockId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(clockId);
  }, []);

  const todayScheduleRows = useMemo(() => {
    const todayToken = now.toISOString().slice(0, 10);
    return events
      .filter((event) => {
        const startAt = safeDateFromIso(event?.start);
        return startAt ? startAt.toISOString().slice(0, 10) === todayToken : false;
      })
      .sort((left, right) => String(left?.start || "").localeCompare(String(right?.start || "")));
  }, [events, now]);

  const closeLockedModal = useCallback(() => {
    setLockedModalMatch(null);
    setMigrationPreview(null);
    setMigrationError("");
    setIsReviewingMigration(false);
    setIsResolvingMigration(false);
  }, []);

  const migrationFailureMessage = useCallback((response, fallback) => {
    if (!response || typeof response !== "object") return fallback;
    const issues = Array.isArray(response.issues)
      ? response.issues.map((row) => String(row || "").trim()).filter(Boolean)
      : [];
    if (issues.length > 0) return issues.join(" | ");
    const reason = String(response.reason || "").trim();
    if (reason) return reason;
    return fallback;
  }, []);

  const resolveMigrationTargetVersion = useCallback((match) => {
    const version = String(match?.current_template_version || "").trim();
    return version || "";
  }, []);

  const openConfigLockedModal = useCallback((match, configResponse = null) => {
    setMigrationPreview(null);
    setMigrationError("");
    setIsReviewingMigration(false);
    setIsResolvingMigration(false);
    const status = String(
      configResponse?.status || match?.config_status || match?.visibility_status || "CONFIG_LOCKED"
    ).toUpperCase();
    const issues = Array.isArray(match?.config_issues) && match.config_issues.length > 0
      ? match.config_issues
      : [
        status === "CONFIG_MISMATCH"
          ? "Template has changed since match creation."
          : "Invalid sport template configuration",
      ];
    setLockedModalMatch({
      ...match,
      config_status: status,
      reason:
        String(configResponse?.reason || "").trim() ||
        (status === "CONFIG_MISMATCH"
          ? "Template has changed since match creation."
          : "Invalid sport template configuration"),
      config_issues:
        Array.isArray(configResponse?.issues) && configResponse.issues.length > 0
          ? configResponse.issues
          : issues,
      match_template_version:
        configResponse?.match_template_version || match?.match_template_version || null,
      current_template_version:
        configResponse?.current_template_version || match?.current_template_version || null,
      match_template_hash: configResponse?.match_template_hash || match?.match_template_hash || null,
      current_template_hash:
        configResponse?.current_template_hash || match?.current_template_hash || null,
    });
  }, []);

  const handleOpenScoring = useCallback(
    async (match) => {
      const status = String(match?.config_status || match?.visibility_status || "UNKNOWN").toUpperCase();
      if (status === "CONFIG_LOCKED" || status === "CONFIG_MISMATCH") {
        try {
          const configResponse = await getMatchEventConfig(Number(match?.match_id || 0));
          openConfigLockedModal(match, configResponse);
        } catch {
          openConfigLockedModal(match);
        }
        return;
      }
      const matchId = Number(match?.match_id || 0);
      if (matchId > 0) {
        navigate(`/coordinator/matches/${matchId}`);
        return;
      }
      navigate(`/coordinator/intramurals`);
    },
    [navigate, openConfigLockedModal]
  );

  const handleViewDetails = useCallback(
    (match) => {
      const matchId = Number(match?.match_id || 0);
      const query = matchId > 0 ? `?match_id=${matchId}` : "";
      navigate(`/coordinator/intramurals${query}`);
    },
    [navigate]
  );

  const venueRows = useMemo(() => {
    const sourceEvents = todayScheduleRows.length > 0 ? todayScheduleRows : events;
    const grouped = new Map();

    sourceEvents.forEach((event) => {
      const venueName = String(event?.venue || "").trim();
      if (!venueName) return;
      const entry = grouped.get(venueName) || {
        venueName,
        location: String(event?.location || event?.venue_location || "Campus Venue").trim(),
        scheduled: 0,
        live: 0,
        sport: getSportLabel(event),
      };
      entry.scheduled += 1;
      if (eventIsLive(event, now)) entry.live += 1;
      grouped.set(venueName, entry);
    });

    const rows = Array.from(grouped.values());
    const maxScheduled = Math.max(1, ...rows.map((row) => row.scheduled));

    return rows
      .map((row) => {
        let status = "Available";
        if (row.live > 0) status = "In Use";
        else if (row.scheduled >= maxScheduled) status = "Restricted";
        const utilization = Math.round((row.scheduled / maxScheduled) * 100);
        return {
          ...row,
          status,
          utilization,
        };
      })
      .sort((left, right) => right.utilization - left.utilization)
      .slice(0, 4);
  }, [events, now, todayScheduleRows]);

  useEffect(() => {
    let active = true;
    const loadChampionshipStandings = async () => {
      setChampionshipStandings(null);
      setChampionshipStandingsUnavailable(false);
      try {
        const data = await getChampionshipStandings({
          tournamentId: selectedTournamentId ? Number(selectedTournamentId) : null,
        });
        if (active) {
          setChampionshipStandings(data || null);
          setChampionshipStandingsUnavailable(!data);
        }
      } catch {
        if (active) {
          setChampionshipStandings(null);
          setChampionshipStandingsUnavailable(true);
        }
      }
    };
    void loadChampionshipStandings();
    return () => {
      active = false;
    };
  }, [selectedTournamentId]);

  useEffect(() => {
    let active = true;
    const loadSportsCatalog = async () => {
      try {
        const rows = await getSports();
        if (active) setSportsCatalog(Array.isArray(rows) ? rows : []);
      } catch {
        if (active) setSportsCatalog([]);
      }
    };
    void loadSportsCatalog();
    return () => {
      active = false;
    };
  }, []);

  // Bracket count for the active intramural's setup-progress checklist.
  useEffect(() => {
    let active = true;
    const loadBracketCount = async () => {
      if (!selectedTournamentId) {
        setBracketCount(0);
        setBracketRows([]);
        return;
      }
      try {
        const rows = await getBrackets();
        if (!active) return;
        const tournamentId = Number(selectedTournamentId);
        const scoped = (Array.isArray(rows) ? rows : []).filter(
          (row) => Number(row?.tournament_id || 0) === tournamentId
        );
        setBracketCount(scoped.length);
        setBracketRows(scoped);
      } catch {
        if (active) {
          setBracketCount(0);
          setBracketRows([]);
        }
      }
    };
    loadBracketCount();
    return () => {
      active = false;
    };
  }, [selectedTournamentId]);

  const officialChampionshipRows = useMemo(
    () => mapChampionshipLeaderboard(championshipStandings?.leaderboard),
    [championshipStandings]
  );

  const officialSportBreakdown = useMemo(
    () => mapChampionshipSportBreakdown(championshipStandings?.sport_breakdown),
    [championshipStandings]
  );

  const officialSportsOverview = useMemo(() => {
    const sports = new Map();
    const configuredSettings = Array.isArray(selectedDashboardTournament?.sport_bracket_settings)
      ? selectedDashboardTournament.sport_bracket_settings
      : [];
    const configuredRows = configuredSettings.length > 0
      ? configuredSettings
      : bracketRows.length > 0
        ? bracketRows
        : registrationProgress?.sports || [];
    configuredRows.forEach((row) => {
      const sportId = Number(row?.sport_id || row?.sportId || row?.id || 0);
      const sportName = String(row?.sport_name || row?.sportName || row?.name || row?.sport || "").trim();
      const catalogMatch = sportsCatalog.find((sport) =>
        (sportId > 0 && Number(sport?.id) === sportId) ||
        (sportName && String(sport?.name || sport?.sport_name || "").trim().toLowerCase() === sportName.toLowerCase())
      );
      const key = sportId || sportName.toLowerCase();
      if (!key || sports.has(key)) return;
      sports.set(key, {
        id: sportId || catalogMatch?.id || key,
        name: sportName || catalogMatch?.name || catalogMatch?.sport_name || "Sport",
        image_url: row?.sport_image_url || row?.image_url || catalogMatch?.image_url || null,
      });
    });
    if (sports.size === 0) {
      (Array.isArray(championshipStandings?.sport_breakdown) ? championshipStandings.sport_breakdown : []).forEach((row) => {
        const key = Number(row?.sport_id || 0) || String(row?.sport_name || "").toLowerCase();
        if (key && !sports.has(key)) sports.set(key, { id: row?.sport_id || key, name: row?.sport_name || "Sport", image_url: row?.sport_image_url || null });
      });
    }
    return [...sports.values()];
  }, [bracketRows, championshipStandings, registrationProgress?.sports, selectedDashboardTournament?.sport_bracket_settings, sportsCatalog]);

  const competitionEntryShowcase = useMemo(() => {
    const rows = [];
    (Array.isArray(registrationMonitor.teamRows) ? registrationMonitor.teamRows : []).forEach((row) => rows.push({
      id: `team-${row?.id || row?.registration_id}`,
      name: row?.team_name || row?.name || "Team",
      meta: [row?.sport_name, row?.department_code || row?.department_name].filter(Boolean).join(" · "),
      status: row?.status || row?.registration_status || "",
      imageUrl: row?.logo_url || row?.image_url || row?.team_logo_url || null,
    }));
    (Array.isArray(registrationMonitor.entryRows) ? registrationMonitor.entryRows : []).forEach((row) => rows.push({
      id: `entry-${row?.id || row?.entry_id}`,
      name: row?.entry_name || row?.name || `${row?.participant_shape || "Competition"} Entry`,
      meta: [row?.sport_name, row?.participant_shape, row?.department_code || row?.department_name].filter(Boolean).join(" · "),
      status: row?.status || row?.registration_status || "",
      imageUrl: row?.logo_url || row?.image_url || row?.entry_logo_url || null,
    }));
    return rows;
  }, [registrationMonitor.entryRows, registrationMonitor.teamRows]);

  const dashboardScheduleCount = events.length;
  const dashboardCompletedMatchCount = useMemo(
    () =>
      events.filter((event) =>
        ["COMPLETED", "FINAL", "DONE", "FINISHED"].includes(
          String(event?.status || "").trim().toUpperCase()
        )
      ).length,
    [events]
  );
  const competitionProgress = useMemo(
    () =>
      deriveCompetitionSetupProgress({
        registrationProgress,
        registrationSummary,
        bracketCount,
        scheduleCount: dashboardScheduleCount,
      }),
    [
      bracketCount,
      dashboardScheduleCount,
      registrationProgress,
      registrationSummary,
    ]
  );

  // Setup-progress checklist for the active intramural. Each item derives its
  // done/count state from data already fetched (dashboard KPIs, schedule events,
  // brackets, standings) and links to the page where the coordinator acts on it.
  const setupProgress = useMemo(() => {
    const kpis = Array.isArray(dashboard?.kpis) ? dashboard.kpis : [];
    const kpiValue = (keyword) => {
      const entry = kpis.find((row) =>
        String(row?.label || "").toLowerCase().includes(keyword)
      );
      return Number(entry?.value ?? 0) || 0;
    };
    const sportsCount = kpiValue("sport");
    const departmentsCount = kpiValue("department");
    const registrationCount = competitionProgress.registrationRecords;

    const summary = assignmentReadiness?.summary || {};
    const managers = summary.managers || {};
    const facilitators = summary.facilitators || {};
    const coaches = summary.coaches || {};
    const assignedManagers = Number(managers.assigned || 0);
    const totalManagers = Number(managers.total || departmentsCount || 0);
    const assignedFacilitators = Number(facilitators.assigned || 0);
    const totalFacilitators = Number(facilitators.total || sportsCount || 0);
    const assignedCoaches = Number(coaches.target_assigned ?? coaches.assigned ?? 0);
    const requiredCoaches = Math.max(0, Number(coaches.target_total ?? coaches.total ?? 0) - Number(coaches.not_required || 0));
    const readinessStatus = String(assignmentReadiness?.status || "").toUpperCase();
    const setupConflict = readinessStatus === "CONFLICT";
    const notConfigured = readinessStatus === "NOT_CONFIGURED";

    return [
      {
        key: "workspace",
        label: "Intramural Created",
        done: Boolean(displayedIntramural),
        detail: displayedIntramural?.name || "Draft workspace",
        to: displayedManageTo,
        description: "Review the Intramural identity, dates, sports, and lifecycle configuration.",
      },
      {
        key: "assignments",
        label: setupConflict ? "Resolve Setup Conflict" : "Staff Setup",
        done: staffAssignmentComplete && !setupConflict && !notConfigured,
        detail: setupConflict
          ? "Needs safe review"
          : notConfigured
            ? "Tournament not configured"
            : `${assignedManagers}/${totalManagers || 0} managers • ${assignedFacilitators}/${totalFacilitators || 0} facilitators • ${assignedCoaches}/${requiredCoaches || 0} coaches`,
        to: assignmentSetupTo,
        description: "Review department manager, sports facilitator, and coach coverage for this Intramural.",
      },
      {
        key: "entries",
        label: "Registration & Entries",
        done: competitionProgress.facilitatorReviewComplete,
        detail: registrationCount > 0
          ? `${registrationCount} submission${registrationCount === 1 ? "" : "s"} recorded`
          : competitionProgress.bracketStageComplete
            ? "Participants confirmed for competition"
          : "Waiting for Department Managers and coaches",
        to: "/coordinator/teams",
        description: "See team, solo, and duo submissions and their review status in one place.",
      },
      {
        key: "brackets",
        label: "Brackets",
        done: competitionProgress.bracketStageComplete,
        detail: bracketCount > 0
          ? `${bracketCount} generated`
          : competitionProgress.bracketStageComplete
            ? "Ready for scheduled matches"
            : "Starts after approvals",
        to: "/coordinator/brackets",
        description: "Review generated brackets and the participants assigned to each round.",
      },
      {
        key: "schedule",
        label: "Scheduling",
        done: dashboardScheduleCount > 0,
        detail: dashboardScheduleCount > 0
          ? `${dashboardScheduleCount} matches scheduled`
          : "Starts after brackets",
        to: "/coordinator/schedules",
        description: "Review scheduled Matches, dates, venues, and remaining scheduling issues.",
      },
      {
        key: "live",
        label: "Live & Results",
        done: dashboardCompletedMatchCount > 0,
        detail: dashboardCompletedMatchCount > 0
          ? `${dashboardCompletedMatchCount} completed`
          : dashboardScheduleCount > 0
            ? "Monitoring matches and scores"
            : "Waiting for match day",
        to: "/coordinator/standings",
        description: "Monitor live Matches, official results, and updated standings.",
      },
    ];
  }, [
    assignmentReadiness,
    assignmentSetupTo,
    bracketCount,
    competitionProgress,
    dashboard?.kpis,
    dashboardCompletedMatchCount,
    dashboardScheduleCount,
    displayedIntramural,
    displayedManageTo,
    staffAssignmentComplete,
  ]);

  const currentSetupStepIndex = setupProgress.findIndex((item) => !item.done);
  const defaultSetupStep = setupProgress[
    currentSetupStepIndex === -1 ? Math.max(0, setupProgress.length - 1) : currentSetupStepIndex
  ] || null;
  const selectedSetupStep = setupProgress.find((item) => item.key === selectedSetupStepKey) || defaultSetupStep;
  const activeSetupStepKey = selectedSetupStep?.key || null;
  const bracketedSportIds = new Set(bracketRows.map((row) => Number(row?.sport_id || 0)).filter(Boolean));
  const missingBracketSports = (registrationProgress?.sports || []).filter(
    (sport) => !bracketedSportIds.has(Number(sport?.id || sport?.sport_id || 0))
  );
  const allBracketSportsReady = bracketCount > 0 && missingBracketSports.length === 0;

  useEffect(() => {
    setSelectedSetupStepKey(null);
  }, [displayedWorkspaceId]);

  const selectDashboardStep = useCallback((item) => {
    if (!item?.key) return;
    setSelectedSetupStepKey(item.key);
  }, []);

  // Intramural-first empty state: no active intramural → one clear CTA, no empty widgets.
  if (!intramuralLoading && !dashboardLoading && !displayedIntramural && dashboardTournamentRows.length === 0) {
    return (
      <div className="os-page-shell mx-auto max-w-[1600px] gap-6 px-2 pb-1 sm:px-3 lg:px-4">
        <PageHeaderCard title="Intramural Overview" />
        <EmptyIntramuralState role="coordinator" />
      </div>
    );
  }

  return (
    <div className="os-page-shell mx-auto w-full max-w-[1600px] pb-4">
      {displayedIntramural ? (
        <section aria-label="Intramural setup progress" className="py-2">
          {location.state?.createdIntramuralName ? (
            <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {location.state.createdIntramuralName} was created. Continue setup from this Dashboard.
            </p>
          ) : null}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-3xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-4xl">{displayedIntramural.name}</h1>
                <IntramuralStatusBadge status={displayedIntramural.status || "ACTIVE"} />
              </div>
              <p className="mt-1 inline-flex flex-wrap items-center gap-1.5 text-sm text-[var(--text-muted)]">
                <CalendarDays size={14} aria-hidden="true" />
                <span>{displayedIntramural.school_year || "School year not specified"}</span>
                {displayedIntramural.semester ? <span>· {semesterLabel(displayedIntramural.semester)}</span> : null}
                {displayedIntramural.start_date ? (
                  <span>
                    · {new Date(displayedIntramural.start_date).toLocaleDateString()}
                    {displayedIntramural.end_date ? ` – ${new Date(displayedIntramural.end_date).toLocaleDateString()}` : ""}
                  </span>
                ) : null}
              </p>
              {displayedIntramural.description ? (
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{displayedIntramural.description}</p>
              ) : null}
            </div>
            <Link to={displayedManageTo} className="text-xs font-semibold text-[var(--primary)] hover:underline">All Intramurals</Link>
          </div>
          <div className="mt-4">
            <SetupProgressChecklist
              items={setupProgress}
              activeKey={activeSetupStepKey}
              onStepSelect={selectDashboardStep}
              compact
              showStatusLabels={false}
            />
          </div>
        </section>
      ) : null}

      {displayedIntramural && activeSetupStepKey === "workspace" ? (
        <DashboardCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">Intramural created</p>
              <h2 className="mt-1 break-words text-xl font-bold text-[var(--text-main)]">{displayedIntramural.name}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {displayedIntramural.description || "This Intramural is ready for staff, teams, entries, brackets, and scheduling setup."}
              </p>
            </div>
            <Link to={displayedManageTo} className="os-btn-primary-soft inline-flex min-h-10 items-center px-4 text-sm font-semibold">
              View all Intramurals
            </Link>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["School year", displayedIntramural.school_year || "Not specified"],
              ["Semester", displayedIntramural.semester || "Not specified"],
              ["Starts", displayedIntramural.start_date ? new Date(displayedIntramural.start_date).toLocaleDateString() : "Not scheduled"],
              ["Ends", displayedIntramural.end_date ? new Date(displayedIntramural.end_date).toLocaleDateString() : "Not scheduled"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                <dt className="text-xs font-semibold text-[var(--text-soft)]">{label}</dt>
                <dd className="mt-1 break-words text-sm font-bold text-[var(--text-main)]">{value}</dd>
              </div>
            ))}
          </dl>
        </DashboardCard>
      ) : null}

      {displayedIntramural && activeSetupStepKey === "assignments" ? (
        <section className="pt-2" aria-labelledby="staff-setup-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="staff-setup-heading" className="text-lg font-bold text-[var(--text-main)]">Staff Setup</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Complete the required people assignments before opening registration.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {[
                ["Department Managers", assignmentReadiness?.summary?.managers, "departments"],
                ["Sports Facilitators", assignmentReadiness?.summary?.facilitators, "sports"],
                ["Coaches", assignmentReadiness?.summary?.coaches, "coaches"],
              ].map(([label, value, kind]) => {
                const { assigned, required, missing: remaining, ready } = deriveStaffCoverage(value, kind);
                let detail = ready ? "Ready" : "No assignment targets configured";
                if (!ready && remaining > 0 && kind === "coaches") detail = `${remaining} event assignment${remaining === 1 ? " still needs" : "s still need"} a coach`;
                else if (!ready && remaining > 0 && kind === "sports") detail = `${remaining} sport${remaining === 1 ? " still needs" : "s still need"} a facilitator`;
                else if (!ready && remaining > 0) detail = `${remaining} department${remaining === 1 ? " still needs" : "s still need"} a manager`;
                return (
                  <section key={label} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4" aria-label={`${label} assignment status`}>
                    <h3 className="text-sm font-semibold text-[var(--text-main)]">{label}</h3>
                    <p className="mt-2 text-lg font-bold text-[var(--text-main)]">
                      {kind === "sports"
                          ? `${assigned} of ${required} sports covered`
                          : `${assigned} of ${required} assigned`}
                    </p>
                    <p className={`mt-1 text-sm font-medium ${ready ? "text-[var(--success)]" : "text-[var(--text-muted)]"}`}>{detail}</p>
                  </section>
                );
              })}
            </div>
            <div className="mt-4 flex flex-col justify-stretch gap-2 sm:flex-row sm:justify-end">
              <Link to={assignmentSetupTo} className="os-btn-primary-soft inline-flex min-h-10 w-full items-center justify-center px-3 text-xs font-semibold sm:w-auto">
                Manage assignments
              </Link>
              <LifecycleReadinessPanel
                workspaceId={displayedWorkspaceId}
                tournamentId={selectedTournamentNumericId}
                contextual
                actionOnly
                staffSummary={assignmentReadiness?.summary}
              />
            </div>
        </section>
      ) : null}

      {displayedIntramural && activeSetupStepKey === "entries" ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(280px,2fr)]">
          <div className="overflow-hidden rounded-xl border border-slate-800 p-5 text-slate-100 shadow-xl dark:border-[var(--border-soft)] dark:bg-[var(--surface)]">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-white">
                  Submissions by Department
                </h2>
              
              </div>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                {registrationProgress.completeDepartments} / {registrationProgress.departments.length} complete
              </span>
            </div>

            {registrationMonitor.loading ? (
              <div className="grid h-56 grid-cols-4 items-end gap-5 sm:grid-cols-6 lg:grid-cols-8">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item} className="flex h-full animate-pulse items-end rounded-t-xl bg-slate-800/70">
                    <div className="h-1/2 w-full rounded-t-xl bg-slate-700" />
                  </div>
                ))}
              </div>
            ) : registrationProgress.departments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-400">
                No department registration targets are available yet.
              </div>
            ) : (
              <div className="overflow-x-auto pb-2">
                <div className="relative flex h-56 min-w-[620px]">
                  <div className="flex w-10 flex-col justify-between pb-6 pr-2 font-mono text-xs text-slate-500">
                    {registrationProgress.chartTicks.map((tick) => (
                      <div key={tick} className="relative flex h-0 items-center justify-end text-right">
                        <span>{tick}</span>
                        <div className="absolute left-10 z-0 w-[calc(100vw-7rem)] max-w-[760px] border-t border-slate-800" />
                      </div>
                    ))}
                  </div>
                  <div className="relative z-10 flex flex-1 items-end justify-around border-l border-slate-800 px-4 pb-6">
                    {registrationProgress.departments.slice(0, 10).map((department, index) => {
                      const colors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-pink-500", "bg-cyan-500", "bg-amber-500"];
                      const color = department.complete ? "bg-emerald-500" : colors[index % colors.length];
                      const height = registrationProgress.chartMax > 0
                        ? Math.max(5, (Number(department.submitted || 0) / registrationProgress.chartMax) * 100)
                        : 5;
                      return (
                        <div key={department.id} className="group relative flex h-full w-1/5 min-w-16 flex-col items-center justify-end">
                          <div
                            className={`w-full rounded-t rounded-b-sm ${color} shadow-lg transition-all duration-300 group-hover:brightness-110`}
                            style={{ height: `${height}%` }}
                          >
                            <div className="pointer-events-none absolute -top-10 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-[#0b0f17] px-3 py-1.5 text-xs font-bold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                              {department.submitted} / {department.total} submitted
                            </div>
                          </div>
                          <span className="absolute -bottom-6 max-w-20 truncate text-xs font-medium text-slate-400 transition-colors group-hover:text-white">
                            {department.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
            {[
              {
                label: "Submitted targets",
                value: `${registrationProgress.submittedTargets} / ${registrationProgress.totalTargets}`,
                hint: `${registrationProgress.missingTargets} still missing`,
                tone: registrationProgress.missingTargets === 0 ? "emerald" : "amber",
              },
              {
                label: "Approved by facilitator",
                value: registrationProgress.approvedTargets,
                hint: `${registrationProgress.waitingTargets} waiting for review`,
                tone: "emerald",
              },
              {
                label: "Departments complete",
                value: `${registrationProgress.completeDepartments} / ${registrationProgress.departments.length}`,
                hint: "All expected registrations submitted",
                tone: "emerald",
              },
              {
                label: "Sports complete",
                value: `${registrationProgress.completeSports} / ${registrationProgress.sports.length}`,
                hint: "All departments covered per sport",
                tone: registrationProgress.completeSports === registrationProgress.sports.length && registrationProgress.sports.length > 0 ? "emerald" : "blue",
              },
            ].map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-[var(--border-soft)] dark:bg-[var(--surface)]">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{metric.label}</p>
                <p
                  className={`mt-2 text-2xl font-bold ${
                    metric.tone === "emerald"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : metric.tone === "amber"
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-blue-700 dark:text-blue-300"
                  }`}
                >
                  {registrationMonitor.loading ? "..." : metric.value}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{metric.hint}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {displayedIntramural && activeSetupStepKey === "entries" ? (
        <section className="rounded-2xl border border-slate-200 p-4 shadow-sm dark:border-[var(--border-soft)] dark:bg-[var(--surface)] dark:text-slate-300">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Registration Monitoring
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                Teams and entries submitted by coaches
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                Staff assignment is complete. Monitor team, duo, and solo submissions as they move through Sports Facilitator review.
              </p>
            </div>
            <Link to="/coordinator/teams" className="os-btn-primary-soft inline-flex min-h-10 items-center px-3 text-xs font-semibold">
              Open full monitoring
            </Link>
          </div>

          {registrationMonitor.error ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              {registrationMonitor.error}
            </div>
          ) : null}

          <div className="mt-4 overflow-hidden rounded-xl border">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:bg-[var(--surface-soft)] dark:text-[var(--text-soft)]">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Registration activity</h3>
              <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-[var(--surface-soft)]">
                {[
                  { key: "WAITING", label: "Waiting" },
                  { key: "APPROVED", label: "Approved" },
                  { key: "REJECTED", label: "Rejected" },
                  { key: "ALL", label: "All" },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setRegistrationDashboardStatusFilter(option.key)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                      registrationDashboardStatusFilter === option.key
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {registrationMonitor.loading ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Loading registration activity...
              </div>
            ) : registrationSummary.recentRows.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No team or entry submissions match this status filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-blue-50 text-xs uppercase tracking-wide text-blue-700 dark:bg-[var(--surface-soft)] dark:text-[var(--text-soft)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Team</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Sport</th>
                      <th className="px-4 py-3 font-semibold">Department</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Submitted By</th>
                      <th className="px-4 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm dark:divide-[var(--border-soft)] dark:bg-[var(--surface)]">
                    {registrationSummary.recentRows.map((row) => (
                      <tr key={row.id} className="">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          {row.name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {row.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {row.sport}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {row.department}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              row.statusBucket === "APPROVED"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                : row.statusBucket === "REJECTED"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {row.submittedBy}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={
                              selectedTournamentNumericId > 0
                                ? `/coordinator/teams?tournament_id=${selectedTournamentNumericId}`
                                : "/coordinator/teams"
                            }
                            className="inline-flex rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-500/30 dark:bg-[var(--surface-soft)] dark:text-blue-300 dark:hover:bg-blue-500/10"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {displayedIntramural && activeSetupStepKey === "brackets" ? (
        <DashboardCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <h2 className="text-lg font-bold text-[var(--text-main)]">Brackets and matches</h2>
              {bracketCount === 0 ? (
                <>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-main)]">No brackets or bracket matches have been generated.</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Approved entries must be ready before brackets can be generated. Open Brackets to review each sport and create its matches.</p>
                </>
              ) : allBracketSportsReady ? (
                <>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-main)]">All available brackets are generated.</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{bracketCount} bracket{bracketCount === 1 ? " is" : "s are"} ready to review.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[...new Set(bracketRows.map((row) => row?.sport_name).filter(Boolean))].map((sport) => (
                      <span key={sport} className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--text-main)]">{sport}</span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-main)]">Some sports still need brackets.</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Generated: {bracketCount}. Still waiting: {missingBracketSports.map((sport) => getSportDisplayName(sport)).filter(Boolean).join(", ") || "review the remaining sports"}.</p>
                </>
              )}
            </div>
            <Link to="/coordinator/brackets" className="os-btn-primary-soft inline-flex min-h-10 items-center px-4 text-sm font-semibold">
              {allBracketSportsReady ? "View all brackets" : "Open brackets"}
            </Link>
          </div>
        </DashboardCard>
      ) : null}

      {displayedIntramural && activeSetupStepKey === "schedule" ? (
        <DashboardCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-main)]">Match schedule</h2>
              {events.length === 0 ? (
                <>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-main)]">No matches have been scheduled.</p>
                  <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">
                    {bracketCount === 0
                      ? "A schedule cannot be created until brackets and their matches are generated."
                      : "The brackets are ready, but their matches have not been placed on the calendar yet."}
                  </p>
                </>
              ) : <p className="mt-1 text-sm text-[var(--text-muted)]">A preview of the next scheduled matches.</p>}
            </div>
            <Link to="/coordinator/schedules" className="os-btn-primary-soft inline-flex min-h-10 items-center px-4 text-sm font-semibold">
              {events.length === 0 ? "Open scheduling" : "View full schedule"}
            </Link>
          </div>
          {events.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border-soft)]">
              <div className="divide-y divide-[var(--border-soft)]">
                {events.slice(0, 5).map((event, index) => {
                  const matchup = splitMatchup(event);
                  const start = safeDateFromIso(event?.start);
                  return <div key={event?.id || event?.match_id || index} className="grid gap-2 px-4 py-3 sm:grid-cols-[120px_minmax(0,1fr)_minmax(140px,auto)] sm:items-center">
                    <div><p className="text-sm font-semibold text-[var(--text-main)]">{formatTime(event?.start)}</p><p className="text-xs text-[var(--text-muted)]">{start ? start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Date pending"}</p></div>
                    <div className="min-w-0"><p className="text-xs font-semibold text-[var(--primary)]">{getSportLabel(event)}</p><p className="truncate text-sm text-[var(--text-main)]">{matchup.left} vs {matchup.right}</p></div>
                    <p className="truncate text-sm text-[var(--text-muted)] sm:text-right">{event?.venue || "Venue pending"}</p>
                  </div>;
                })}
              </div>
            </div>
          ) : null}
        </DashboardCard>
      ) : null}

      {activeSetupStepKey === "live" ? (
        <LiveDashboardStage events={events} sports={officialSportsOverview} entries={competitionEntryShowcase} tournamentId={selectedTournamentNumericId || null} scheduleHref="/coordinator/schedules" scoreBasePath="/coordinator/matches" standingsHref="/coordinator/standings" entriesHref={selectedTournamentNumericId > 0 ? `/coordinator/teams?tournament_id=${selectedTournamentNumericId}` : "/coordinator/teams"} departmentRows={officialChampionshipRows} breakdownRows={officialSportBreakdown} standingsUnavailable={championshipStandingsUnavailable} matchCenterProps={{ roleTitle: "Live Match Center", onOpenScore: handleOpenScoring, emptyTitle: "No matches scheduled yet", emptyDescription: "Match schedules will appear here once the schedule is generated." }}>
      <section aria-label="Venue availability">
        <DashboardCard className="h-full">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-main)]">
              <MapPin size={15} className="text-[var(--info)]" aria-hidden="true" />
              Venue Availability
            </h2>
            <Link to="/coordinator/venues" className="text-xs font-semibold text-[var(--primary)] hover:underline">
              View All Venues
            </Link>
          </div>
          {venueRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-4 text-center">
              <p className="text-sm font-medium text-[var(--text-main)]">No venue utilization data yet.</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Venue activity appears once matches are scheduled.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {venueRows.slice(0, 3).map((venue, index) => {
                const statusClass =
                  venue.status === "In Use"
                    ? "bg-[var(--info-soft)] text-[var(--info)]"
                    : venue.status === "Restricted"
                      ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                      : "bg-[var(--success-soft)] text-[var(--success)]";
                return (
                  <div key={`venue-main-${venue.venueName}-${index}`} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--text-main)]">{venue.venueName}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}>
                        {venue.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span className="truncate">{venue.sport || "Scheduled matches"}</span>
                      <span>{venue.utilization}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-[var(--surface-muted)]">
                      <div className="h-1.5 rounded-full bg-[var(--primary)] transition-[width] duration-300" style={{ width: `${Math.max(8, venue.utilization)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardCard>
      </section>

      {/* <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-none">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
            <Zap size={15} className="text-amber-500" />
            Live Match Queue
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">{filteredMatchHealthRows.length} scoped matches</span>
        </div>

        {queueRows.length === 0 ? (
          renderEmptyState("No scoped matches available.", "Match queue will populate as schedules and bracket matches are generated.")
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2.5">Match</th>
                    <th className="px-3 py-2.5">Sport</th>
                    <th className="px-3 py-2.5">Teams</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queueRows.map((match) => {
                    const matchId = Number(match?.match_id || 0);
                    const visibilityStatus = String(
                      match?.visibility_status || match?.config_status || "UNKNOWN"
                    ).toUpperCase();
                    const isLocked =
                      visibilityStatus === "CONFIG_LOCKED" || visibilityStatus === "CONFIG_MISMATCH";
                    const teamA = match?.team1_name || "Team A";
                    const teamB = match?.team2_name || "Team B";

                    return (
                      <tr key={`health-${matchId}`} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                          Match {match?.match_number || matchId || "details unavailable"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">{getSportDisplayName(match, "Unassigned")}</td>
                        <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">{teamA} vs {teamB}</td>
                        <td className="px-3 py-2.5">
                          <ConfigStatusBadge status={visibilityStatus} />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenScoring(match)}
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                                isLocked
                                  ? "border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                                  : "bg-cyan-600 text-white hover:bg-cyan-500"
                              }`}
                            >
                              {isLocked ? "Scoring Blocked" : "Open Live Scoring"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleViewDetails(match)}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                              View Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredMatchHealthRows.length > queueRows.length ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Showing {queueRows.length} of {filteredMatchHealthRows.length} matches.
              </p>
            ) : null}
          </>
        )}
      </section> */}
        </LiveDashboardStage>
      ) : null}

      {error ? (
        <div className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--danger)_30%,var(--border-soft))] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]" role="alert">
          {error}
        </div>
      ) : null}

      <ConfigLockedModal
        isOpen={Boolean(lockedModalMatch)}
        match={lockedModalMatch}
        onClose={closeLockedModal}
        onViewDetails={() => {
          if (lockedModalMatch) handleViewDetails(lockedModalMatch);
          closeLockedModal();
        }}
        onKeepReadOnly={closeLockedModal}
        onReviewMigration={async () => {
          if (!lockedModalMatch || !canMigrateTemplates) return;
          const matchId = Number(lockedModalMatch?.match_id || 0);
          const targetVersion = resolveMigrationTargetVersion(lockedModalMatch);
          if (!matchId || !targetVersion) {
            setMigrationError("Unable to resolve target template version for this match.");
            return;
          }
          setIsReviewingMigration(true);
          setMigrationError("");
          try {
            const result = await migrateMatchTemplate(matchId, {
              target_version: targetVersion,
              dry_run: true,
            });
            setMigrationPreview(result);
            if (String(result?.status || "").toUpperCase() !== "SAFE") {
              setMigrationError(
                migrationFailureMessage(result, "Migration is unsafe. Review issues before applying.")
              );
            }
          } catch (loadError) {
            const detail = loadError?.response?.data?.detail;
            const message = typeof detail === "string" ? detail : "Failed to run migration dry-run.";
            setMigrationError(message);
          } finally {
            setIsReviewingMigration(false);
          }
        }}
        onResolveAutomatically={async () => {
          if (!lockedModalMatch || !canMigrateTemplates) return;
          const matchId = Number(lockedModalMatch?.match_id || 0);
          const targetVersion = resolveMigrationTargetVersion(lockedModalMatch);
          if (!matchId || !targetVersion) {
            setMigrationError("Unable to resolve target template version for this match.");
            return;
          }

          setIsResolvingMigration(true);
          setMigrationError("");
          try {
            const dryRun = await migrateMatchTemplate(matchId, {
              target_version: targetVersion,
              dry_run: true,
            });
            setMigrationPreview(dryRun);
            if (String(dryRun?.status || "").toUpperCase() !== "SAFE") {
              setMigrationError(
                migrationFailureMessage(dryRun, "Migration dry-run reported unsafe changes.")
              );
              return;
            }

            const result = await migrateMatchTemplate(matchId, {
              target_version: targetVersion,
              dry_run: false,
            });
            if (String(result?.status || "").toUpperCase() !== "SUCCESS") {
              setMigrationError(migrationFailureMessage(result, "Template migration failed."));
              return;
            }
            closeLockedModal();
            navigate(`/coordinator/intramurals?match_id=${matchId}`);
          } catch (resolveError) {
            const detail = resolveError?.response?.data?.detail;
            const message = typeof detail === "string" ? detail : "Failed to apply template migration.";
            setMigrationError(message);
          } finally {
            setIsResolvingMigration(false);
          }
        }}
        migrationPreview={migrationPreview}
        migrationError={migrationError}
        isReviewing={isReviewingMigration}
        isResolving={isResolvingMigration}
        canMigrate={canMigrateTemplates}
      />
    </div>
  );
};

export default Dashboard;
