import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import { getSportDisplayName } from "../../utils/tournamentEventCategories";
import AppModal from "../../components/common/AppModal";
import TournamentModeFallback from "../../components/tournament/TournamentModeFallback";
import { getSportById } from "../../services/sportService";
import {
  getTeamRoster,
  getTeamRegistrationReadiness,
  getTournamentTeamRegistrations,
  resubmitTournamentTeamRegistration,
  submitTournamentTeamRegistration,
} from "../../services/teamService";
import { getTournaments } from "../../services/tournamentService";
import {
  getApplication,
  getCoachApplications,
  finalizeTeamRoster,
  publishTeamTryoutSchedule,
  getTeamTryoutSchedule,
  reviewMedicalCertificate,
  updateApplicationStatus,
} from "../../services/teamApplicationService";
import {
  finalizeEntryPoolSelection,
  finalizeEntryPoolCandidates,
  getCoachEntryPools,
  getEntryPoolTryoutSchedule,
  publishEntryPoolTryoutSchedule,
  reviewEntryPoolMedicalCertificate,
  updateEntryPoolApplicationDecision,
} from "../../services/entryPoolService";
import { getVenues } from "../../services/venueService";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import DashboardCard from "../../components/common/DashboardCard";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import {
  Clock,
  Lock,
  UserPlus,
  User,
  Mail,
  Phone,
  Building2,
  Target,
  HeartPulse,
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Calendar,
} from "lucide-react";
import { resolveMediaUrl } from "../../utils/media";
import {
  buildWorkspace,
  extractMedicalCertificateUrl,
  getMedicalCertificateStatus,
  getRegistrationWindowStatus,
  isRegistrationOpenStatus,
  isTryoutDone,
  TEAM_LOCKED_REGISTRATION_STATUSES,
  TEAM_RESUBMITTABLE_REGISTRATION_STATUSES,
} from "./recruitment/recruitmentWorkflow";
import RecruitmentProgress from "./recruitment/RecruitmentProgress";
import TeamSummaryCards from "./recruitment/TeamSummaryCards";
import ApplicantWorkspaceSection from "./recruitment/ApplicantWorkspaceSection";
import TryoutScheduleDrawer from "./recruitment/TryoutScheduleDrawer";
import MedicalCertificateProgress from "./recruitment/MedicalCertificateProgress";
import { useWorkspace } from "../../context/WorkspaceContext";
import { HistoricalBanner, IntramuralStatusBadge } from "../../components/intramural";
import {
  getTournamentAccessModeLabel,
  shouldShowCoachTools,
} from "../../utils/tournamentAccess";
import { useProfileDrawer, resolveProfileUserId } from "../../components/profile";

const toUpper = (value) => String(value || "").trim().toUpperCase();

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const applicantTryoutKey = (row) => {
  if (toUpper(row?.source_type) === "ENTRY_POOL_APPLICATION") {
    return `pool:${Number(row?.pool_id || row?.team_id || 0)}`;
  }
  return `team:${Number(row?.team_id || 0)}`;
};

const resolveRosterBounds = (sport) => {
  const configuration =
    sport?.configuration && typeof sport.configuration === "object"
      ? sport.configuration
      : sport?.sport_configuration && typeof sport.sport_configuration === "object"
        ? sport.sport_configuration
        : {};
  const participationType = String(
    configuration?.participation_type || sport?.category || ""
  ).trim().toLowerCase();
  if (participationType.includes("single") || participationType.includes("solo")) {
    return { minPlayers: 1, maxPlayers: 1, participationType: "single" };
  }
  if (participationType.includes("double") || participationType.includes("duo")) {
    return { minPlayers: 2, maxPlayers: 2, participationType: "double" };
  }
  const minPlayers = Number(configuration?.min_players ?? sport?.min_players ?? 0) || null;
  const maxPlayers = Number(configuration?.max_players ?? sport?.max_players ?? 0) || null;
  return {
    minPlayers,
    maxPlayers,
    participationType: "team",
  };
};

const formatRosterRequirement = ({ minPlayers, maxPlayers }) => {
  if (minPlayers && maxPlayers && minPlayers === maxPlayers) {
    return `${minPlayers} player${minPlayers === 1 ? "" : "s"} required`;
  }
  if (minPlayers && maxPlayers) return `${minPlayers}-${maxPlayers} players required`;
  if (minPlayers) return `At least ${minPlayers} players required`;
  if (maxPlayers) return `Up to ${maxPlayers} players allowed`;
  return "Roster requirement unavailable";
};

const chunkItems = (items, size) => {
  const normalizedSize = Math.max(1, Number(size) || 1);
  const chunks = [];
  for (let index = 0; index < items.length; index += normalizedSize) {
    chunks.push(items.slice(index, index + normalizedSize));
  }
  return chunks;
};

const PlayerApplications = () => {
  const { user } = useAuth();
  const { selectedIntramural, isViewingHistorical, workspace: activeWorkspaceContext } = useWorkspace();
  const selectedWorkspaceId = selectedIntramural?.id ?? null;
  const intramuralStatus = String(selectedIntramural?.status || activeWorkspaceContext?.status || "").toUpperCase();
  const registrationWindow = useMemo(
    () => getRegistrationWindowStatus(intramuralStatus, isViewingHistorical),
    [intramuralStatus, isViewingHistorical]
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [teamRegistrations, setTeamRegistrations] = useState([]);
  const [coachEntryPools, setCoachEntryPools] = useState([]);
  const [activeWorkspaceKey, setActiveWorkspaceKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [capacityInfo, setCapacityInfo] = useState(null);

  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isReviewingMedical, setIsReviewingMedical] = useState(false);

  const [capacityByTeamId, setCapacityByTeamId] = useState({});
  const [teamRegistrationBusyId, setTeamRegistrationBusyId] = useState(null);
  const [rowDecisionBusyId, setRowDecisionBusyId] = useState(null);
  const [medicalReviewBusyId, setMedicalReviewBusyId] = useState(null);
  const [readinessByTeamId, setReadinessByTeamId] = useState({});
  const [venues, setVenues] = useState([]);
  const [tryoutSchedulesByKey, setTryoutSchedulesByKey] = useState({});
  const [tryoutModal, setTryoutModal] = useState({
    open: false,
    group: null,
    scheduled_date: "",
    venue_id: "",
    instructions: "",
    busy: false,
    error: "",
  });
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const tournamentAccess = useTournamentAccess(selectedTournamentId);
  const coachApplicationManageMode = shouldShowCoachTools(tournamentAccess);
  const { openProfile } = useProfileDrawer();
  const requestedApplicationId = Number(searchParams.get("applicationId") || 0);
  const deepLinkHandledRef = useRef(false);

  const loadApplications = useCallback(async () => {
    if (!selectedTournamentId) {
      setApplications([]);
      setIsLoading(false);
      return;
    }
    if (selectedTournamentId && tournamentAccess.loading) return;
    if (selectedTournamentId && !coachApplicationManageMode) {
      setApplications([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setMessage("");
    try {
      const payload = await getCoachApplications(
        "ALL",
        selectedTournamentId ? Number(selectedTournamentId) : null
      );
      const rows = Array.isArray(payload?.items) ? payload.items : [];
      setApplications(rows);
    } catch (error) {
      setApplications([]);
      setMessage(error?.response?.data?.detail || "Failed to load player applications.");
    } finally {
      setIsLoading(false);
    }
  }, [coachApplicationManageMode, selectedTournamentId, tournamentAccess.loading]);

  const loadTeamRegistrations = useCallback(async () => {
    if (!selectedTournamentId || !coachApplicationManageMode) {
      setTeamRegistrations([]);
      return;
    }
    try {
      const payload = await getTournamentTeamRegistrations(Number(selectedTournamentId), {
        status: "ALL",
        limit: 200,
      });
      const rows = Array.isArray(payload?.items) ? payload.items : [];
      setTeamRegistrations(rows);
    } catch {
      setTeamRegistrations([]);
    }
  }, [coachApplicationManageMode, selectedTournamentId]);

  const loadCoachEntryPools = useCallback(async () => {
    if (!selectedTournamentId || !coachApplicationManageMode) {
      setCoachEntryPools([]);
      return;
    }
    try {
      const payload = await getCoachEntryPools(Number(selectedTournamentId));
      setCoachEntryPools(Array.isArray(payload) ? payload : []);
    } catch {
      setCoachEntryPools([]);
    }
  }, [coachApplicationManageMode, selectedTournamentId]);

  const loadCapacityMap = async (rows) => {
    const uniqueTeams = {};
    for (const row of rows) {
      if (toUpper(row?.source_type) === "ENTRY_POOL_APPLICATION") continue;
      if (!row?.team_id) continue;
      if (!uniqueTeams[row.team_id]) {
        uniqueTeams[row.team_id] = {
          teamId: row.team_id,
          sportId: row.sport_id,
        };
      }
    }

    const entries = await Promise.all(
      Object.values(uniqueTeams).map(async ({ teamId, sportId }) => {
        try {
          const [roster, sport] = await Promise.all([
            getTeamRoster(teamId, selectedTournamentId ? Number(selectedTournamentId) : null),
            sportId ? getSportById(sportId) : Promise.resolve(null),
          ]);
          const currentPlayers = Array.isArray(roster?.players) ? roster.players.length : 0;
          const { minPlayers, maxPlayers, participationType } = resolveRosterBounds(sport);
          const normalizedMax = Number.isFinite(Number(maxPlayers)) ? Number(maxPlayers) : null;
          const normalizedMin = Number.isFinite(Number(minPlayers)) ? Number(minPlayers) : null;
          const availableSlots =
            normalizedMax === null ? null : Math.max(0, normalizedMax - currentPlayers);
          return [
            teamId,
            {
              currentPlayers,
              minPlayers: normalizedMin,
              maxPlayers: normalizedMax,
              availableSlots,
              participationType,
            },
          ];
        } catch {
          return [
            teamId,
            {
              currentPlayers: null,
              minPlayers: null,
              maxPlayers: null,
              availableSlots: null,
              participationType: "team",
            },
          ];
        }
      })
    );

    const map = {};
    for (const [teamId, data] of entries) map[teamId] = data;
    setCapacityByTeamId(map);
  };

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
            setSelectedTournamentId(String(fallback.id));
          }
        } else if (items.length === 0) {
          setSelectedTournamentId("");
        }
      } catch {
        if (!mounted) return;
      }
    };
    loadTournaments();
    return () => {
      mounted = false;
    };
  }, [selectedTournamentId, selectedWorkspaceId]);

  useEffect(() => {
    loadApplications();
    loadTeamRegistrations();
    loadCoachEntryPools();
  }, [loadApplications, loadCoachEntryPools, loadTeamRegistrations]);

  useEffect(() => {
    if (!requestedApplicationId || deepLinkHandledRef.current) return;
    if (isLoading || applications.length === 0) return;
    const matchedApplication = applications.find((row) => Number(row?.id) === requestedApplicationId);
    if (!matchedApplication) return;
    deepLinkHandledRef.current = true;
    // Focus the workspace that owns the deep-linked application.
    const matchedKey = applicantTryoutKey(matchedApplication);
    if (matchedKey && matchedKey !== activeWorkspaceKey) setActiveWorkspaceKey(matchedKey);
    openApplicationDetail(
      requestedApplicationId,
      matchedApplication.source_type,
      matchedApplication.pool_id || matchedApplication.team_id
    );
  }, [applications, isLoading, requestedApplicationId, activeWorkspaceKey]);

  useEffect(() => {
    if (applications.length === 0) {
      setCapacityByTeamId({});
      return;
    }
    loadCapacityMap(applications);
  }, [applications, selectedTournamentId]);

  useEffect(() => {
    let mounted = true;
    const loadVenueOptions = async () => {
      try {
        const rows = await getVenues(false);
        if (!mounted) return;
        setVenues(Array.isArray(rows) ? rows : []);
      } catch {
        if (mounted) setVenues([]);
      }
    };
    loadVenueOptions();
    return () => {
      mounted = false;
    };
  }, []);

  const registrationByTeamId = useMemo(() => {
    const map = {};
    for (const row of teamRegistrations) {
      const teamId = Number(row?.team_id || 0);
      if (!teamId) continue;
      map[teamId] = row;
    }
    return map;
  }, [teamRegistrations]);

  const coachEntryPoolById = useMemo(() => {
    const map = {};
    for (const row of coachEntryPools) {
      const poolId = Number(row?.id || 0);
      if (!poolId) continue;
      map[poolId] = row;
    }
    return map;
  }, [coachEntryPools]);

  const acceptedTeamGroups = useMemo(() => {
    const grouped = new Map();
    for (const row of applications) {
      if (toUpper(row?.application_status) !== "ACCEPTED_AS_PLAYER") continue;
      const sourceType = toUpper(row?.source_type);

      if (sourceType === "ENTRY_POOL_APPLICATION") {
        const poolId = Number(row?.pool_id || row?.team_id || 0);
        if (!poolId) continue;
        const pool = coachEntryPoolById[poolId] || null;
        const groupKey = `pool:${poolId}`;
        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, {
            groupKey,
            groupType: "pool",
            poolId,
            teamId: poolId,
            teamName: row?.team_name || pool?.pool_name || `Pool #${poolId}`,
            tournamentId:
              row?.tournament_id || pool?.tournament_id || (selectedTournamentId ? Number(selectedTournamentId) : null),
            tournamentName: row?.tournament_name || pool?.tournament_name || "-",
            sportId: Number(row?.sport_id || pool?.sport_id || 0) || null,
            sportName: row?.sport_name || pool?.sport_name || "-",
            departmentId: Number(row?.department_id || pool?.department_id || 0) || null,
            departmentName: row?.department_name || pool?.department_name || "-",
            participantShape: toUpper(
              pool?.participant_shape ||
              (String(row?.team_name || "").toLowerCase().includes("duo") ||
                String(row?.position || "").toLowerCase().includes("double")
                ? "DUO"
                : "SOLO")
            ),
            eventName: pool?.event_name || "",
            poolStatus: pool?.status || "",
            maxEntriesPerDepartment: Number(pool?.max_entries_per_department || 0) || null,
            selectedEntriesCount: Number(pool?.selected_entries_count || 0) || 0,
            players: [],
          });
        }
        grouped.get(groupKey).players.push(row);
        continue;
      }

      const teamId = Number(row?.team_id || 0);
      if (!teamId) continue;
      const groupKey = `team:${teamId}`;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          groupKey,
          groupType: "team",
          teamId,
          teamName: row?.team_name || `Team #${teamId}`,
          tournamentId: row?.tournament_id || (selectedTournamentId ? Number(selectedTournamentId) : null),
          tournamentName: row?.tournament_name || "-",
          sportId: Number(row?.sport_id || 0) || null,
          sportName: row?.sport_name || "-",
          departmentId: Number(row?.department_id || 0) || null,
          departmentName: row?.department_name || "-",
          players: [],
        });
      }
      grouped.get(groupKey).players.push(row);
    }

    return Array.from(grouped.values())
      .map((group) => {
        if (group.groupType === "pool") {
          const participantShape = toUpper(group.participantShape || "SOLO");
          const pairSize = participantShape === "DUO" ? 2 : 1;
          const sortedPlayers = [...group.players].sort((left, right) =>
            String(left?.applicant_name || "").localeCompare(String(right?.applicant_name || ""))
          );
          const acceptedCount = sortedPlayers.length;
          const remainingEntries =
            group.maxEntriesPerDepartment === null
              ? null
              : Math.max(0, Number(group.maxEntriesPerDepartment) - Number(group.selectedEntriesCount || 0));
          const maxSelectablePlayers =
            remainingEntries === null ? null : remainingEntries * pairSize;
          const withinRemainingLimit =
            maxSelectablePlayers === null ? true : acceptedCount <= maxSelectablePlayers;
          const roundedAcceptedCount =
            participantShape === "DUO" ? acceptedCount - (acceptedCount % 2) : acceptedCount;
          const selectedPlayers = sortedPlayers.slice(0, roundedAcceptedCount);
          const selectedApplicationIds = selectedPlayers
            .map((player) => Number(player?.id || 0))
            .filter((value) => Number.isFinite(value) && value > 0);
          const selectedPairs =
            participantShape === "DUO"
              ? chunkItems(selectedApplicationIds, 2).filter((pair) => pair.length === 2)
              : [];
          const readyEntryCount =
            participantShape === "DUO" ? selectedPairs.length : selectedApplicationIds.length;
          const isValid =
            participantShape === "DUO"
              ? acceptedCount >= 2 && acceptedCount % 2 === 0 && withinRemainingLimit && readyEntryCount > 0
              : acceptedCount >= 1 && withinRemainingLimit && readyEntryCount > 0;
          const requirementLabel =
            participantShape === "DUO"
              ? "2 accepted players required per doubles entry"
              : "1 accepted player required per singles entry";
          const limitLabel =
            remainingEntries === null
              ? null
              : `${remainingEntries} ${remainingEntries === 1 ? "entry slot" : "entry slots"} remaining`;
          return {
            ...group,
            players: sortedPlayers,
            rosterInfo: {
              rosterCount: acceptedCount,
              minPlayers: pairSize,
              maxPlayers: pairSize,
            },
            requirementLabel,
            limitLabel,
            registration: null,
            currentStatus: toUpper(group.poolStatus),
            readyEntryCount,
            isValid,
            submissionPayload: {
              selected_application_ids: participantShape === "DUO" ? [] : selectedApplicationIds,
              selected_pairs: participantShape === "DUO" ? selectedPairs : [],
            },
          };
        }

        const rosterInfo = capacityByTeamId[group.teamId] || {};
        const rosterCount =
          Number.isFinite(Number(rosterInfo?.currentPlayers))
            ? Number(rosterInfo.currentPlayers)
            : group.players.length;
        const minPlayers = Number.isFinite(Number(rosterInfo?.minPlayers))
          ? Number(rosterInfo.minPlayers)
          : null;
        const maxPlayers = Number.isFinite(Number(rosterInfo?.maxPlayers))
          ? Number(rosterInfo.maxPlayers)
          : null;
        const isValid =
          (!minPlayers || rosterCount >= minPlayers) &&
          (!maxPlayers || rosterCount <= maxPlayers);
        return {
          ...group,
          players: [...group.players].sort((left, right) =>
            String(left?.applicant_name || "").localeCompare(String(right?.applicant_name || ""))
          ),
          rosterInfo: {
            ...rosterInfo,
            rosterCount,
            minPlayers,
            maxPlayers,
          },
          requirementLabel: formatRosterRequirement({ minPlayers, maxPlayers }),
          registration: registrationByTeamId[group.teamId] || null,
          currentStatus: toUpper(registrationByTeamId[group.teamId]?.status),
          isValid,
        };
      })
      .sort((left, right) => String(left.teamName).localeCompare(String(right.teamName)));
  }, [applications, capacityByTeamId, coachEntryPoolById, registrationByTeamId, selectedTournamentId]);

  // Unified workspace list: every team/pool that has ANY applicant for the
  // selected tournament. A workspace exists from the first application onward so
  // the coach can schedule a tryout before accepting anyone. Rich roster /
  // validity / submission data is merged in from acceptedTeamGroups when present
  // (keyed identically via applicantTryoutKey).
  const workspaces = useMemo(() => {
    const acceptedByKey = new Map(
      acceptedTeamGroups.map((group) => [group.groupKey, group])
    );
    const grouped = new Map();
    for (const row of applications) {
      const status = toUpper(row?.application_status);
      const isPool = toUpper(row?.source_type) === "ENTRY_POOL_APPLICATION";
      const groupKey = applicantTryoutKey(row);
      if (!grouped.has(groupKey)) {
        const poolId = Number(row?.pool_id || row?.team_id || 0);
        const teamId = Number(row?.team_id || 0);
        grouped.set(groupKey, {
          groupKey,
          groupType: isPool ? "pool" : "team",
          poolId: isPool ? poolId : null,
          teamId,
          teamName: row?.team_name || (isPool ? `Pool #${poolId}` : `Team #${teamId}`),
          tournamentId:
            row?.tournament_id || (selectedTournamentId ? Number(selectedTournamentId) : null),
          tournamentName: row?.tournament_name || "-",
          sportId: Number(row?.sport_id || 0) || null,
          sportName: row?.sport_name || "-",
          departmentId: Number(row?.department_id || 0) || null,
          departmentName: row?.department_name || "-",
          counts: { total: 0, forTryout: 0, accepted: 0, rejected: 0 },
          allApplicants: [],
        });
      }
      const group = grouped.get(groupKey);
      group.counts.total += 1;
      if (status === "FOR_TRYOUT") group.counts.forTryout += 1;
      else if (status === "ACCEPTED_AS_PLAYER") group.counts.accepted += 1;
      else if (status === "REJECTED") group.counts.rejected += 1;
      group.allApplicants.push(row);
    }
    return Array.from(grouped.values())
      .map((group) => {
        const accepted = acceptedByKey.get(group.groupKey) || null;
        return {
          ...group,
          // Fields the submit handler + accepted/medical sections rely on.
          rosterInfo: accepted?.rosterInfo || capacityByTeamId[group.teamId] || {},
          isValid: Boolean(accepted?.isValid),
          currentStatus: accepted?.currentStatus || "",
          registration: accepted?.registration || registrationByTeamId[group.teamId] || null,
          requirementLabel: accepted?.requirementLabel || "",
          participantShape: accepted?.participantShape || group.participantShape,
          maxEntriesPerDepartment: accepted?.maxEntriesPerDepartment || null,
          selectedEntriesCount: accepted?.selectedEntriesCount || 0,
          selectionMaxPlayers:
            accepted?.maxEntriesPerDepartment
              ? Math.max(0, Number(accepted.maxEntriesPerDepartment) - Number(accepted.selectedEntriesCount || 0)) *
              (toUpper(accepted?.participantShape) === "DUO" ? 2 : 1)
              : null,
          submissionPayload: accepted?.submissionPayload || null,
          // Accepted players keep the `players` key the submit handler expects.
          players: accepted?.players || [],
        };
      })
      .sort((left, right) => String(left.teamName).localeCompare(String(right.teamName)));
  }, [
    applications,
    acceptedTeamGroups,
    capacityByTeamId,
    registrationByTeamId,
    selectedTournamentId,
  ]);

  // The currently-focused workspace. Default to the first; honor a deep-linked
  // application by selecting the workspace that contains it.
  const activeWorkspace = useMemo(() => {
    if (workspaces.length === 0) return null;
    return (
      workspaces.find((group) => group.groupKey === activeWorkspaceKey) || workspaces[0]
    );
  }, [workspaces, activeWorkspaceKey]);

  useEffect(() => {
    if (workspaces.length === 0) {
      if (activeWorkspaceKey) setActiveWorkspaceKey("");
      return;
    }
    if (!workspaces.some((group) => group.groupKey === activeWorkspaceKey)) {
      setActiveWorkspaceKey(workspaces[0].groupKey);
    }
  }, [workspaces, activeWorkspaceKey]);

  useEffect(() => {
    let cancelled = false;
    const loadReadiness = async () => {
      const readinessEntries = await Promise.all(
        acceptedTeamGroups
          .filter((group) => group.groupType === "team" && group.teamId && group.tournamentId)
          .map(async (group) => {
            try {
              const readiness = await getTeamRegistrationReadiness(group.tournamentId, group.teamId);
              return [group.teamId, readiness];
            } catch {
              return [group.teamId, null];
            }
          })
      );
      if (cancelled) return;
      const readinessMap = {};
      for (const [teamId, value] of readinessEntries) readinessMap[teamId] = value;
      setReadinessByTeamId(readinessMap);
    };
    if (acceptedTeamGroups.length > 0) {
      loadReadiness();
    } else {
      setReadinessByTeamId({});
    }
    return () => {
      cancelled = true;
    };
  }, [acceptedTeamGroups]);

  useEffect(() => {
    let cancelled = false;
    const loadSchedules = async () => {
      const seen = new Map();
      for (const row of applications) {
        const key = applicantTryoutKey(row);
        if (seen.has(key)) continue;
        const isPool = toUpper(row?.source_type) === "ENTRY_POOL_APPLICATION";
        seen.set(key, {
          key,
          isPool,
          poolId: Number(row?.pool_id || row?.team_id || 0),
          teamId: Number(row?.team_id || 0),
          tournamentId: row?.tournament_id || (selectedTournamentId ? Number(selectedTournamentId) : null),
        });
      }
      const entries = await Promise.all(
        Array.from(seen.values()).map(async (item) => {
          try {
            const res = item.isPool
              ? await getEntryPoolTryoutSchedule(item.poolId)
              : await getTeamTryoutSchedule(item.teamId, item.tournamentId);
            return [item.key, res?.schedule || null];
          } catch {
            return [item.key, null];
          }
        })
      );
      if (cancelled) return;
      const scheduleMap = {};
      for (const [key, value] of entries) scheduleMap[key] = value;
      setTryoutSchedulesByKey(scheduleMap);
    };
    if (applications.length > 0) {
      loadSchedules();
    } else {
      setTryoutSchedulesByKey({});
    }
    return () => {
      cancelled = true;
    };
  }, [applications, selectedTournamentId]);

  const openTryoutModal = (group) => {
    const existing = tryoutSchedulesByKey[group.groupKey] || null;
    let initialDate = "";
    if (existing?.scheduled_date) {
      const parsed = new Date(existing.scheduled_date);
      if (!Number.isNaN(parsed.getTime())) {
        const tzOffset = parsed.getTimezoneOffset() * 60000;
        initialDate = new Date(parsed.getTime() - tzOffset).toISOString().slice(0, 16);
      }
    }
    setTryoutModal({
      open: true,
      group,
      scheduled_date: initialDate,
      venue_id: existing?.venue_id ? String(existing.venue_id) : "",
      instructions: existing?.instructions || "",
      busy: false,
      error: "",
    });
  };

  const closeTryoutModal = () => {
    if (tryoutModal.busy) return;
    setTryoutModal({
      open: false,
      group: null,
      scheduled_date: "",
      venue_id: "",
      instructions: "",
      busy: false,
      error: "",
    });
  };

  const submitTryoutSchedule = async () => {
    const group = tryoutModal.group;
    if (!group) return;
    if (!tryoutModal.scheduled_date) {
      setTryoutModal((prev) => ({ ...prev, error: "Tryout date and time are required." }));
      return;
    }
    setTryoutModal((prev) => ({ ...prev, busy: true, error: "" }));
    try {
      const payload = {
        scheduled_date: new Date(tryoutModal.scheduled_date).toISOString(),
        venue_id: tryoutModal.venue_id ? Number(tryoutModal.venue_id) : null,
        instructions: tryoutModal.instructions || null,
      };
      if (group.groupType === "pool") {
        await publishEntryPoolTryoutSchedule(group.poolId, payload);
      } else {
        await publishTeamTryoutSchedule(group.teamId, {
          ...payload,
          tournament_id: group.tournamentId ? Number(group.tournamentId) : null,
        });
      }
      setMessage(`Tryout schedule published for ${group.teamName}. Applicants have been notified.`);
      closeTryoutModal();
      // Refresh schedules.
      try {
        const refreshed =
          group.groupType === "pool"
            ? await getEntryPoolTryoutSchedule(group.poolId)
            : await getTeamTryoutSchedule(group.teamId, group.tournamentId);
        setTryoutSchedulesByKey((prev) => ({ ...prev, [group.groupKey]: refreshed?.schedule || null }));
      } catch {
        /* best-effort refresh */
      }
    } catch (error) {
      setTryoutModal((prev) => ({
        ...prev,
        busy: false,
        error: error?.response?.data?.detail || "Failed to publish tryout schedule.",
      }));
    }
  };

  const showSelectTournamentFallback = Boolean(
    !selectedTournamentId && tournaments.length > 0
  );
  const showAccessVerificationFallback = Boolean(
    selectedTournamentId &&
    !tournamentAccess.loading &&
    tournamentAccess.error &&
    !coachApplicationManageMode &&
    !tournamentAccess.isAssistantCoachMode
  );
  const showCoachViewerFallback = Boolean(
    selectedTournamentId &&
    !tournamentAccess.loading &&
    !tournamentAccess.error &&
    !coachApplicationManageMode &&
    !tournamentAccess.isAssistantCoachMode
  );
  const showAssistantCoachPlaceholder = Boolean(
    selectedTournamentId &&
    !tournamentAccess.loading &&
    tournamentAccess.isAssistantCoachMode
  );
  const pageTitle = showAssistantCoachPlaceholder
    ? "Assistant Coach Mode"
    : showCoachViewerFallback || showAccessVerificationFallback
      ? tournamentAccess.isPlayerMode
        ? "Tournament Applications"
        : `${getTournamentAccessModeLabel(tournamentAccess)} View`
      : showSelectTournamentFallback
        ? "Select a Tournament"
        : "Coach Recruitment";
  const pageSubtitle = showAssistantCoachPlaceholder
    ? "Read-only support access. Final application decisions still require the assigned coach."
    : showCoachViewerFallback
      ? "Coach application tools are unavailable for this tournament. Public tournament information remains available."
      : showAccessVerificationFallback
        ? "Unable to verify your tournament access. Showing viewer-safe information only."
        : showSelectTournamentFallback
          ? "Choose a tournament to see your available tools."
          : "Manage applicants, schedule tryouts, build your official roster, and submit your team for facilitator review.";
  const pageBreadcrumbs = showAssistantCoachPlaceholder
    ? "Assistant Coach / Player Applications"
    : showCoachViewerFallback || showAccessVerificationFallback
      ? `${getTournamentAccessModeLabel(tournamentAccess)} / Applications`
      : showSelectTournamentFallback
        ? "Tournament Access / Applications"
        : "Coach / Recruitment";

  const openApplicationDetail = async (applicationId, sourceType, poolId = null) => {
    setSelectedApplicationId(applicationId);
    setIsDetailLoading(true);
    setCapacityInfo(null);
    try {
      let application = null;

      if (sourceType === "ENTRY_POOL_APPLICATION") {
        const matchingApp = applications.find(a => String(a.id) === String(applicationId) && a.source_type === "ENTRY_POOL_APPLICATION");
        application = matchingApp || null;
      } else {
        application = await getApplication(applicationId);
      }

      setSelectedApplication(application);

      if (application?.team_id && sourceType !== "ENTRY_POOL_APPLICATION") {
        const roster = await getTeamRoster(
          application.team_id,
          application?.tournament_id || (selectedTournamentId ? Number(selectedTournamentId) : null)
        );
        const sport = application.sport_id ? await getSportById(application.sport_id) : null;
        const currentPlayers = Array.isArray(roster?.players) ? roster.players.length : 0;
        const eventReadiness = readinessByTeamId[Number(application.team_id)] || null;
        const maxPlayers =
          eventReadiness?.max_players ??
          sport?.max_players ??
          sport?.configuration?.max_players ??
          sport?.sport_configuration?.max_players ??
          null;
        const normalizedMax = Number.isFinite(Number(maxPlayers)) ? Number(maxPlayers) : null;
        const availableSlots =
          normalizedMax === null ? null : Math.max(0, normalizedMax - currentPlayers);
        setCapacityInfo({
          currentPlayers,
          maxPlayers: normalizedMax,
          availableSlots,
        });
      }
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to load application details.");
      setSelectedApplicationId(null);
      setSelectedApplication(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedApplicationId(null);
    setSelectedApplication(null);
    setCapacityInfo(null);
    if (searchParams.get("applicationId")) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("applicationId");
        next.delete("source");
        next.delete("poolId");
        return next;
      }, { replace: true });
    }
  };

  const runRowDecision = async (row, newStatus) => {
    if (!row?.id) return;
    setRowDecisionBusyId(row.id);
    setMessage("");
    try {
      if (row.source_type === "ENTRY_POOL_APPLICATION") {
        await updateEntryPoolApplicationDecision(row.id, { status: newStatus, decision_note: null });
      } else {
        await updateApplicationStatus(row.id, { new_status: newStatus, decision_note: null });
      }
      setMessage(
        `${row.applicant_name || "Applicant"} ${newStatus === "ACCEPTED_AS_PLAYER" ? "accepted" : "rejected"}.`
      );
      await loadApplications();
      await loadTeamRegistrations();
      await loadCoachEntryPools();
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to update application status.");
    } finally {
      setRowDecisionBusyId(null);
    }
  };

  const finalizeSelectedRoster = async (selectedRows) => {
    if (!activeWorkspace || !selectedTournamentId) return;
    const selectedIds = selectedRows.map((row) => Number(row?.id || 0)).filter(Boolean);
    if (!selectedIds.length) return;
    setRowDecisionBusyId("finalize-roster");
    setMessage("");
    try {
      if (activeWorkspace.groupType === "pool") {
        await finalizeEntryPoolCandidates(activeWorkspace.poolId, selectedIds);
      } else {
        await finalizeTeamRoster(activeWorkspace.teamId, selectedTournamentId, selectedIds);
      }
      setMessage(`${selectedIds.length} player${selectedIds.length === 1 ? "" : "s"} added to the final roster.`);
      await loadApplications();
      await loadTeamRegistrations();
      await loadCoachEntryPools();
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Unable to finalize the selected roster.");
      throw error;
    } finally {
      setRowDecisionBusyId(null);
    }
  };

  const runMedicalReview = async (decision, applicationOverride = null) => {
    const application = applicationOverride || selectedApplication;
    if (!application?.id) return;
    setMedicalReviewBusyId(application.id);
    setIsReviewingMedical(true);
    setMessage("");
    try {
      const payload = {
        decision,
        note: decision === "REJECTED" ? "Please upload a clearer or valid medical certificate." : null,
      };
      const sourceType = application.source_type || searchParams.get("source");
      if (sourceType === "ENTRY_POOL_APPLICATION") {
        await reviewEntryPoolMedicalCertificate(application.id, payload);
      } else {
        await reviewMedicalCertificate(application.id, payload);
      }
      setMessage(
        decision === "RECEIVED"
          ? "Medical certificate marked as received."
          : "Medical certificate returned to the player for resubmission."
      );
      await loadApplications();
      await loadTeamRegistrations();
      await loadCoachEntryPools();
      if (selectedApplication && Number(selectedApplication.id) === Number(application.id)) {
        await openApplicationDetail(
          application.id,
          sourceType,
          application.pool_id || application.team_id
        );
      }
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Unable to update medical certificate status.");
    } finally {
      setIsReviewingMedical(false);
      setMedicalReviewBusyId(null);
    }
  };

  const openUserProfile = (userId) => {
    const resolved = resolveProfileUserId(userId);
    if (!resolved) return;
    openProfile({
      userId: resolved,
      tournamentId: selectedTournamentId ? Number(selectedTournamentId) : null,
    });
  };

  const closeUserProfile = () => { };

  const submitAcceptedTeamRegistration = async (group) => {
    if (!selectedTournamentId) return;

    if (!registrationWindow.isOpen) {
      setMessage(
        registrationWindow.reason ||
        "Registration is not open. Teams and entries cannot be submitted to the sports facilitator."
      );
      return;
    }

    if (group?.groupType === "pool") {
      const poolId = Number(group?.poolId || 0);
      const currentStatus = toUpper(group?.currentStatus);
      if (!poolId || !group?.isValid) return;
      if (["SUBMITTED_FOR_REVIEW", "APPROVED", "CLOSED"].includes(currentStatus)) {
        return;
      }

      setTeamRegistrationBusyId(group.groupKey);
      setMessage("");
      try {
        await finalizeEntryPoolSelection(poolId, group.submissionPayload || {
          selected_application_ids: [],
          selected_pairs: [],
        });
        setMessage(`Submitted ${group.teamName} to the sports facilitator.`);
        await loadApplications();
        await loadTeamRegistrations();
        await loadCoachEntryPools();
      } catch (error) {
        setMessage(
          error?.response?.data?.detail ||
          `Failed to submit ${group.teamName} to the sports facilitator.`
        );
      } finally {
        setTeamRegistrationBusyId(null);
      }
      return;
    }

    const teamId = Number(group?.teamId || 0);
    if (!teamId) return;

    const existingRegistration = group?.registration || null;
    const currentStatus = toUpper(existingRegistration?.status);
    if (TEAM_LOCKED_REGISTRATION_STATUSES.has(currentStatus)) {
      return;
    }

    const contactEmail = String(user?.email || "").trim();
    if (!contactEmail) {
      setMessage("Your coach account needs an email before team submission can proceed.");
      return;
    }

    const payload = {
      team_id: teamId,
      team_name: group.teamName,
      sport_id: Number(group.sportId),
      department_id: Number(group.departmentId),
      expected_roster_size: Number(group?.rosterInfo?.rosterCount || group.players.length || 0),
      registration_payload: {
        contact_email: contactEmail,
        coach_notes: `Submitted from accepted player requests for ${group.teamName}.`,
        eligibility_confirmed: true,
        department_approval_confirmed: true,
      },
    };

    setTeamRegistrationBusyId(group.groupKey);
    setMessage("");
    try {
      if (
        existingRegistration &&
        TEAM_RESUBMITTABLE_REGISTRATION_STATUSES.has(currentStatus)
      ) {
        await resubmitTournamentTeamRegistration(
          Number(selectedTournamentId),
          Number(existingRegistration.id),
          {
            expected_roster_size: payload.expected_roster_size,
            registration_payload: payload.registration_payload,
          }
        );
        setMessage(`Team registration resubmitted for ${group.teamName}.`);
      } else {
        await submitTournamentTeamRegistration(Number(selectedTournamentId), payload);
        setMessage(`Team registration submitted for ${group.teamName}.`);
      }
      await loadApplications();
      await loadTeamRegistrations();
      await loadCoachEntryPools();
    } catch (error) {
      setMessage(
        error?.response?.data?.detail ||
        `Failed to submit ${group.teamName} to the sports facilitator.`
      );
    } finally {
      setTeamRegistrationBusyId(null);
    }
  };

  // Normalized workflow view of the active workspace (drives progress, next
  // action, checklist, submit). Built from backend-sourced fields only.
  const activeSchedule = activeWorkspace
    ? tryoutSchedulesByKey[activeWorkspace.groupKey] || null
    : null;
  const activeReadiness =
    activeWorkspace?.groupType === "team"
      ? readinessByTeamId[activeWorkspace.teamId] || null
      : null;
  const workspace = useMemo(
    () => buildWorkspace(activeWorkspace, activeSchedule, activeReadiness, registrationWindow),
    [activeWorkspace, activeSchedule, activeReadiness, registrationWindow]
  );
  const activeApplicants = activeWorkspace?.allApplicants || [];
  const activeAcceptedPlayers = activeWorkspace?.players || [];
  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false);

  const handleScheduleTryout = () => {
    if (activeWorkspace) openTryoutModal(activeWorkspace);
  };

  const handleEditScheduleFromDrawer = () => {
    setScheduleDrawerOpen(false);
    if (activeWorkspace) openTryoutModal(activeWorkspace);
  };

  const submitButtonLabel =
    activeWorkspace?.groupType === "pool"
      ? "Submit to Facilitator"
      : TEAM_RESUBMITTABLE_REGISTRATION_STATUSES.has(toUpper(workspace?.currentStatus))
        ? "Resubmit Team Registration"
        : "Submit Team Registration";
  const selectedApplicationSourceType = selectedApplication?.source_type || searchParams.get("source");
  const selectedApplicationSchedule = selectedApplication
    ? tryoutSchedulesByKey[applicantTryoutKey(selectedApplication)] || null
    : null;
  const selectedApplicationTryoutDone = isTryoutDone(selectedApplicationSchedule);

  return (
    <div className="os-page-shell">
      {isViewingHistorical && <HistoricalBanner />}
      <PageHeaderCard
        title={pageTitle}
        subtitle={pageSubtitle}
        breadcrumbs={pageBreadcrumbs}
        action={
          ''
        }
      />

      {message ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200">
          {message}
        </div>
      ) : null}

      {selectedTournamentId && tournamentAccess.loading ? (
        <TournamentModeFallback
          title="Checking tournament access"
          message="Loading your selected-tournament access before opening coach application tools..."
          className="mb-6"
        />
      ) : null}

      {showSelectTournamentFallback ? (
        <TournamentModeFallback
          title="Select a tournament"
          message="Choose a tournament to see your access and available tools."
          className="mb-6"
        />
      ) : null}

      {showAccessVerificationFallback ? (
        <TournamentModeFallback
          title="Viewer-safe mode"
          message="Unable to verify your tournament access. Showing viewer-safe information only."
          tone="warning"
          className="mb-6"
        />
      ) : null}

      {showCoachViewerFallback ? (
        null
      ) : null}

      {showSelectTournamentFallback ||
        showAccessVerificationFallback ||
        showCoachViewerFallback ||
        showAssistantCoachPlaceholder ? null : (
        <>
          {isViewingHistorical ? (
            <HistoricalBanner intramural={selectedIntramural} className="mb-6" />
          ) : registrationWindow.isPlanning ? (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              <div className="flex min-w-0 items-center gap-2.5">
                <Clock size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Planning Phase • Registration Not Open
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300/80">
                    This intramural is currently in the Planning phase. You can manage recruitment, tryouts, and accepted players, but team submissions to the sports facilitator will be available once registration opens.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <IntramuralStatusBadge status={intramuralStatus || "DRAFT"} />
              </div>
            </div>
          ) : registrationWindow.isClosed ? (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10">
              <div className="flex min-w-0 items-center gap-2.5">
                <Lock size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                    Registration Closed
                  </p>
                  <p className="text-xs text-rose-700 dark:text-rose-300/80">
                    Registration is closed for this intramural. Team and entry submissions can no longer be sent to the sports facilitator.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <IntramuralStatusBadge status={intramuralStatus} />
              </div>
            </div>
          ) : null}

          {workspaces.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No applicants yet"
              message="Players will appear here once they apply. Share your tournament so athletes can submit their applications."
            />
          ) : (
            <div className="space-y-6">
              {workspaces.length > 1 ? (
                <DashboardCard>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Team / Group
                  </label>
                  <select
                    value={activeWorkspace?.groupKey || ""}
                    onChange={(event) => setActiveWorkspaceKey(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:max-w-md"
                  >
                    {workspaces.map((group) => (
                      <option key={`workspace-option-${group.groupKey}`} value={group.groupKey}>
                        {group.teamName} — {group.sportName} ({group.counts.total} applicant
                        {group.counts.total === 1 ? "" : "s"})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    You manage {workspaces.length} teams in this tournament. Switch between them to guide each one separately.
                  </p>
                </DashboardCard>
              ) : null}

              <TeamSummaryCards workspace={workspace} />

              {/* Table + workflow progress rail. On desktop the rail shares a
              stretched grid row with the table card so it always levels to the
              bottom of the table; on mobile the progress card stacks on top. */}
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-stretch">
                <div className="order-2 lg:order-1">
                  <DashboardCard>
                    <ApplicantWorkspaceSection
                      workspace={workspace}
                      applicants={activeApplicants}
                      acceptedPlayers={activeAcceptedPlayers}
                      schedule={activeSchedule}
                      isPool={activeWorkspace?.groupType === "pool"}
                      rowDecisionBusyId={rowDecisionBusyId}
                      submitBusy={teamRegistrationBusyId === activeWorkspace?.groupKey}
                      canManage={coachApplicationManageMode}
                      submitLabel={submitButtonLabel}
                      onRowDecision={runRowDecision}
                      onFinalizeRoster={finalizeSelectedRoster}
                      onMedicalReview={(row, decision) => runMedicalReview(decision, row)}
                      medicalReviewBusyId={medicalReviewBusyId}
                      onOpenDetail={(row) =>
                        openApplicationDetail(row.id, row.source_type, row.pool_id || row.team_id)
                      }
                      onOpenProfile={openUserProfile}
                      onViewSchedule={() => setScheduleDrawerOpen(true)}
                      onScheduleTryout={handleScheduleTryout}
                      onSubmit={() => activeWorkspace && submitAcceptedTeamRegistration(activeWorkspace)}
                    />
                  </DashboardCard>
                </div>

                <div className="order-1 lg:order-2">
                  <RecruitmentProgress workspace={workspace} />
                </div>
              </div>

              {/* {activeWorkspace?.groupType === "team" ? (
            <MedicalCertificateProgress
              players={activeAcceptedPlayers}
            />
          ) : null} */}
            </div>
          )}
        </>
      )}

      <TryoutScheduleDrawer
        open={scheduleDrawerOpen}
        onClose={() => setScheduleDrawerOpen(false)}
        schedule={activeSchedule}
        applicantCount={activeWorkspace?.counts?.total || 0}
        canManage={coachApplicationManageMode}
        onEdit={handleEditScheduleFromDrawer}
      />

      <AppModal
        open={Boolean(selectedApplicationId)}
        onClose={closeModal}
        title="Review Applicant"
        subtitle="Applicant profile, position, and medical clearance."
        maxWidthClass="max-w-2xl"
        footer={
          <div className="flex w-full items-center justify-end">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        }
      >
        {isDetailLoading || !selectedApplication ? (
          <LoadingState message="Loading applicant profile..." />
        ) : (
          (() => {
            const rawHealthNotes = String(selectedApplication.health_notes || "").trim();
            const certificateUrl = extractMedicalCertificateUrl(rawHealthNotes);
            const medicalStatus = getMedicalCertificateStatus(selectedApplication);
            const cleanHealthNotes = rawHealthNotes
              .replace(/\r/g, "\n")
              .split("\n")
              .filter(
                (line) =>
                  !line.toLowerCase().startsWith("medical certificate attachment:") &&
                  !line.toLowerCase().startsWith("medical certificate status:")
              )
              .join("\n")
              .trim();

            const medicalStatusLabel =
              medicalStatus === "RECEIVED"
                ? "Received & Verified"
                : medicalStatus === "REJECTED"
                  ? "Needs Resubmission"
                  : medicalStatus === "PENDING"
                    ? (certificateUrl ? "Waiting for Review" : "Waiting for Upload")
                    : "Not Submitted";

            const medicalBadgeTone =
              medicalStatus === "RECEIVED"
                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30"
                : medicalStatus === "REJECTED"
                  ? "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30"
                  : certificateUrl
                    ? "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30"
                    : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";

            return (
              <div className="space-y-6">
                {/* 1. Applicant Header (Minimalist & Flat) */}
                <div className="flex flex-col gap-4 pb-5 border-b border-slate-200 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-base font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      {(selectedApplication.applicant_name || "A").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                        {selectedApplication.applicant_name || "Unknown Applicant"}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusBadge status={selectedApplication.application_status} />
                        {/* {(selectedApplication.department_name || selectedApplication.department_id) && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Building2 className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                            {selectedApplication.department_name || selectedApplication.department_id}
                          </span>
                        )} */}
                      </div>
                    </div>
                  </div>

                  {/* {resolveProfileUserId(selectedApplication.applicant_id) && (
                    <button
                      type="button"
                      onClick={() => openUserProfile(selectedApplication.applicant_id)}
                      className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs transition hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
                      <span>Full Profile</span>
                      <ExternalLink className="h-3 w-3 text-slate-400 dark:text-slate-400" />
                    </button>
                  )} */}
                </div>

                {/* 2. Applicant Info & Position (Position directly under Applicant, no contact no) */}
                <div className="space-y-3 pb-5 border-b border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Applicant &amp; Position
                  </div>

                  <div className="grid gap-4 sm:grid-cols-1">
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Preferred Position
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <Target className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <span>{selectedApplication.position || "Not specified"}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Email Address
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                        <span className="truncate">{selectedApplication.applicant_email || "-"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Assignment & Tryout (Flat minimalist rows) */}
                <div className="space-y-3 pb-5 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Assignment &amp; Tryout
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        {selectedApplicationSourceType === "ENTRY_POOL_APPLICATION" ? "Entry" : "Team"}
                      </div>
                      <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {selectedApplication.team_name || "-"}
                      </div>
                      {capacityInfo && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Roster: {capacityInfo.currentPlayers ?? "-"} / {capacityInfo.maxPlayers ?? "-"}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Sport &amp; Tournament
                      </div>
                      <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {getSportDisplayName(selectedApplication, selectedApplication.sport_id || "-")}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedApplication.tournament_name || "Legacy / Not set"}
                      </div>
                    </div>
                  </div>

                  {/* Tryout schedule row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {selectedApplicationSchedule
                            ? selectedApplicationTryoutDone
                              ? "Tryout Completed"
                              : "Tryout Scheduled"
                            : "No Tryout Scheduled"}
                        </span>
                        {selectedApplicationSchedule?.scheduled_date && (
                          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                            ({formatDate(selectedApplicationSchedule.scheduled_date)})
                          </span>
                        )}
                      </div>
                    </div>
                    {/* <button
                      type="button"
                      onClick={() => {
                        if (selectedApplicationSchedule) setScheduleDrawerOpen(true);
                        else if (activeWorkspace) openTryoutModal(activeWorkspace);
                      }}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                      {selectedApplicationSchedule ? "View Tryout" : "Schedule Tryout"}
                    </button> */}
                  </div>
                </div>

                {/* 3. Health Notes & Medical Clearance (Directly under Applicant) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <HeartPulse className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Health Notes &amp; Medical Clearance
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${medicalBadgeTone}`}>
                      {medicalStatusLabel}
                    </span>
                  </div>

                  {selectedApplication.medical_certificate_note && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedApplication.medical_certificate_note}
                    </p>
                  )}

                  {certificateUrl ? (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <a
                        href={resolveMediaUrl(certificateUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs"
                      >
                        <FileText className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
                        <span>Open Medical Certificate</span>
                        <ExternalLink className="h-3 w-3 text-slate-400 dark:text-slate-400" />
                      </a>

                      {coachApplicationManageMode && medicalStatus !== "RECEIVED" && (
                        <button
                          type="button"
                          disabled={isReviewingMedical}
                          onClick={() => runMedicalReview("RECEIVED")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:opacity-60 shadow-xs"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{isReviewingMedical ? "Saving..." : "Mark as Received"}</span>
                        </button>
                      )}

                      {coachApplicationManageMode && medicalStatus !== "REJECTED" && (
                        <button
                          type="button"
                          disabled={isReviewingMedical}
                          onClick={() => runMedicalReview("REJECTED")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 dark:border-rose-700/60 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 transition hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-60 shadow-xs"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>{isReviewingMedical ? "Saving..." : "Request Resubmission"}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No medical certificate document uploaded yet.
                    </p>
                  )}

                  {cleanHealthNotes ? (
                    <div className="pt-1 text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Remarks: </span>
                      <span className="whitespace-pre-wrap">{cleanHealthNotes}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })()
        )}
      </AppModal>

      <AppModal
        open={tryoutModal.open}
        onClose={closeTryoutModal}
        title={tryoutSchedulesByKey[tryoutModal.group?.groupKey] ? "Update Tryout Schedule" : "Schedule Tryout"}
        subtitle="Publishing notifies every applicant currently marked For Tryout. New applicants are notified automatically."
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Date &amp; Time
            <input
              type="datetime-local"
              value={tryoutModal.scheduled_date}
              onChange={(event) =>
                setTryoutModal((prev) => ({ ...prev, scheduled_date: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Venue
            <select
              value={tryoutModal.venue_id}
              onChange={(event) =>
                setTryoutModal((prev) => ({ ...prev, venue_id: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Select a venue (optional)</option>
              {venues.map((venue) => (
                <option key={`tryout-venue-${venue.id}`} value={venue.id}>
                  {venue.name || venue.venue_name || `Venue #${venue.id}`}
                  {venue.location ? ` — ${venue.location}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Instructions
            <textarea
              rows={3}
              value={tryoutModal.instructions}
              onChange={(event) =>
                setTryoutModal((prev) => ({ ...prev, instructions: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="What applicants should bring or where to meet."
            />
          </label>
          {tryoutModal.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              {tryoutModal.error}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeTryoutModal}
              disabled={tryoutModal.busy}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitTryoutSchedule}
              disabled={tryoutModal.busy}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {tryoutModal.busy ? "Publishing..." : "Publish Schedule"}
            </button>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

export default PlayerApplications;
