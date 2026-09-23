import ScheduleCheckDialog from "../../components/schedule/ScheduleCheckDialog";
import ScheduleEmptyState from "../../components/schedule/ScheduleEmptyState";
import MatchDetailModal from "../../components/schedule/modals/MatchDetailModal";
import ScheduleIssueModal from "../../components/schedule/modals/ScheduleIssueModal";
import VenueProfilesModal from "../../components/schedule/modals/VenueProfilesModal";
import GenerationHelpModal from "../../components/schedule/modals/GenerationHelpModal";
import RegenerateConfirmModal from "../../components/schedule/modals/RegenerateConfirmModal";
import EditScheduleModal from "../../components/schedule/modals/EditScheduleModal";
import ProgramBlockModal from "../../components/schedule/modals/ProgramBlockModal";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, LoaderCircle, MapPin } from "lucide-react";
import AppModal from "../../components/common/AppModal";
import ScheduleHeatmap from "../../components/dashboard/ScheduleHeatmap";
import ScheduleCalendar from "../../components/schedule/ScheduleCalendar";
import ScheduleCalendarWorkspace from "../../components/schedule/ScheduleCalendarWorkspace";
import VenueMasterScheduleBoard from "../../components/schedule/VenueMasterScheduleBoard";
import VenueScheduleFilterBar from "../../components/schedule/VenueScheduleFilterBar";
import VenueScheduleHeader from "../../components/schedule/VenueScheduleHeader";
import {
  buildIssueDrawerSections,
  buildScheduleIssueEvidenceRows,
  buildUnscheduledDiagnosticNotes,
  collectScheduleIssueMatchIds,
  getScheduleIssueNextSteps,
  getScheduleIssueFriendlyMessage,
  getScheduleIssueFriendlyTitle,
  getScheduleIssueWhyItMatters,
  groupScheduleConflicts,
  mapRecommendationCenterItems,
} from "../../components/schedule/scheduleIssuePresentation";
import AiPreflightResultsPanel from "./schedules/AiPreflightResultsPanel";
import AiRecommendationCenter from "./schedules/AiRecommendationCenter";
import ScheduleHealthSummary from "./schedules/ScheduleHealthSummary";
import ScheduleIssueDrawer from "./schedules/ScheduleIssueDrawer";
import VenueProfilesPanel from "./schedules/VenueProfilesPanel";
// eslint-disable-next-line no-unused-vars
import { buildEventAwareSportLabel, getStatusTone, isMeaningfulEventName, getSportLabel, getVenueKey, normalizeEvents } from "../../components/schedule/venueScheduleUtils";
// eslint-disable-next-line no-unused-vars
import { participantShapeBadgeClass, participantShapeLabel } from "../../utils/tournamentEventCategories";
import { createProgramBlock, deleteProgramBlock, generateSchedule, getProgramBlocks, runSchedulePreflight, getScheduleAnalytics, getScheduleEvents, publishSchedule, applyScheduleRecommendation, updateProgramBlock, validateSchedule, rescheduleMatch } from "../../services/scheduleService";
import { getTournaments } from "../../services/tournamentService";
import { getTournamentVenueAvailability, getVenues } from "../../services/venueService";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import useTournamentAccess from "../../hooks/useTournamentAccess";
import { HistoricalBanner } from "../../components/intramural";
import { resolveOperationalDestination } from "../../utils/operationalNavigation";
import {
  canUseScheduleGeneration,
  buildOfficialProgramSetupRows,
  classifyScheduleCheck,
  classifyScheduleFailure,
  isSchedulePageResolving,
  presentScheduleIssue,
  validateOfficialProgramSetup,
  resolveScheduleSelectionScope,
  resolveScheduleEmptyState,
} from "../../components/schedule/scheduleWorkflow";
// eslint-disable-next-line no-unused-vars
import { parseHour, overlapsTimeWindow, findOverlappingProgramBlock, formatTimeRangeLabel, parseProgramBlockDateTime, buildBlockedMessage, isMatchStartDisabled, isLiveScoringDisabled, PROGRAM_BLOCK_TYPE_LABELS, formatProgramBlockTypeLabel, formatPreflightCategoryLabel, getConfidenceTone, formatPreflightTimestamp, getPreflightStatusExplanation, FIX_TARGET_ACTIONS, CATEGORY_ORDER, formatSnakeLabel, formatEvidenceLabel, formatEvidenceValue, formatVenueLabel, formatDateTimeRange, formatMatchMeta, getMatchDisplayName, getMatchRoundText, getReasonLabel, formatUnscheduledMatches, buildEvidenceRows, normalizeResolutionOptions, RESOLUTION_OPTION_PRIORITY, RESOLUTION_OPTION_TITLES, RESOLUTION_OPTION_EXPLANATIONS, getResolutionOptionPriority, getResolutionOptionTitle, getContextualResolutionTitle, getResolutionOptionExplanation, sortResolutionOptions, canApplyRecommendationOption, isVerifiedRecommendationOption, isAutoApplicableRecommendationOption, getSupportedRecommendationMutation, hasCompleteSupportedMutation, resolveRecommendationMatchId, isFullyApplicableRecommendationOption, getRecommendationTrustLabel, getRecommendationTrustTone, getRecommendationActionLabel, computeStableHash, getIssueActionLabel, getIssueSeverityLabel, getIssueQuickActions, getIssueUserTitle, groupIssuesByCategory, buildHumanConflictMessage, normalizeContractSeverity, normalizeApiDetailMessage, getConflictSeverityTone, getConflictBadgeTone, ISSUE_SEVERITY_PRIORITY, collectIssueMatchIds, buildIssueTitle, buildIssueSeverityBadgeTone, normalizeScheduleIssue, getProgramBlockTypeTone, formatDateInput, formatTimeInput, combineDateAndTime, extractNumericId, normalizeCalendarEventPayload } from "./schedules/scheduleHelpers";
const UNSCHEDULED_ISSUE_CODES = new Set(["MISSING_SCHEDULE_SLOT", "NO_VALID_SLOT", "MISSING_VENUE_ASSIGNMENT"]);
const normalizeIdList = value => {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(entry => Number(entry)).filter(entry => Number.isInteger(entry) && entry > 0)));
};
const Schedules = () => {
  const navigate = useNavigate();
  const {
    isSportsCoordinator
  } = useAuth();
  const {
    selectedIntramural,
    isViewingHistorical
  } = useWorkspace();
  const selectedWorkspaceId = selectedIntramural?.id ?? null;
  const schedulePanelRef = useRef(null);
  const popoverRef = useRef(null);
  const scheduleLoadRequestRef = useRef(0);
  const tournamentListLoadRequestRef = useRef(0);
  const validationLoadRequestRef = useRef(0);
  const generationRequestRef = useRef(0);
  const preflightRequestRef = useRef(0);
  const focusHighlightTimeoutRef = useRef(null);
  const focusRevealAttemptRef = useRef(null);

  // -----------------------------
  // State
  // -----------------------------
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [tournamentListLoading, setTournamentListLoading] = useState(true);
  const [resolvedTournamentContextKey, setResolvedTournamentContextKey] = useState("");
  const [resolvedScheduleTournamentId, setResolvedScheduleTournamentId] = useState("");
  const [presentedScheduleTournamentId, setPresentedScheduleTournamentId] = useState("");
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [minRestMinutes, setMinRestMinutes] = useState("30");
  const [autoFixOnConflict, setAutoFixOnConflict] = useState(true);
  const [viewMode, setViewMode] = useState("tournament");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedSport, setSelectedSport] = useState("all");
  const [selectedEventCategory, setSelectedEventCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDate, setSelectedDate] = useState("all");
  const [selectedVenue, setSelectedVenue] = useState("all");
  const [programBlocks, setProgramBlocks] = useState([]);
  const [calendarBlockedWindows, setCalendarBlockedWindows] = useState([]);
  const [programBlockDraft, setProgramBlockDraft] = useState({
    title: "",
    block_type: "CUSTOM",
    date: "",
    start_time: "08:00",
    end_time: "09:00",
    is_recurring_daily: false,
    description: ""
  });
  const [programBlockSubmitting, setProgramBlockSubmitting] = useState(false);
  const [editingProgramBlockId, setEditingProgramBlockId] = useState(null);
  const [availabilityByVenueId, setAvailabilityByVenueId] = useState({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [status, setStatus] = useState({
    type: "",
    message: "",
    suggestions: []
  });
  const [validationResult, setValidationResult] = useState(null);
  const [generationResult, setGenerationResult] = useState(null);
  const [preflightResult, setPreflightResult] = useState(null);
  const [preflightRunning, setPreflightRunning] = useState(false);
  const [preflightModalOpen, setPreflightModalOpen] = useState(false);
  const [scheduleCheckMode, setScheduleCheckMode] = useState("checking");
  const [scheduleCheckIssues, setScheduleCheckIssues] = useState([]);
  const [pendingCheckedGeneration, setPendingCheckedGeneration] = useState(null);
  const [generationHelpOpen, setGenerationHelpOpen] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [preflightFingerprint, setPreflightFingerprint] = useState("");
  const [schedulingMode, setSchedulingMode] = useState("BALANCED");
  const [pendingGenerateMode, setPendingGenerateMode] = useState("BALANCED");
  const [generationFlowStep, setGenerationFlowStep] = useState("idle");
  const [insightWarningState, setInsightWarningState] = useState({});
  const [recommendationDowngradeMap, setRecommendationDowngradeMap] = useState({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [isProgramBlockModalOpen, setIsProgramBlockModalOpen] = useState(false);
  const [programSetupMode, setProgramSetupMode] = useState(false);
  const [programSetupRows, setProgramSetupRows] = useState([]);
  const [programSetupErrors, setProgramSetupErrors] = useState({});
  const [pendingProgramGeneration, setPendingProgramGeneration] = useState(null);
  const [issueDrawerOpen, setIssueDrawerOpen] = useState(false);
  const [venueDrawerOpen, setVenueDrawerOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [focusedScheduleTarget, setFocusedScheduleTarget] = useState(null);
  const [hoverPopover, setHoverPopover] = useState(null);
  const [pinnedPopover, setPinnedPopover] = useState(null);
  const [editForm, setEditForm] = useState({
    matchId: null,
    sportName: "",
    matchLabel: "",
    eventName: "",
    competitionTypeLabel: "",
    venueId: "",
    date: "",
    startTime: "",
    endTime: "",
    durationMinutes: 70
  });
  const {
    tournamentAccess,
    loading: tournamentAccessLoading,
  } = useTournamentAccess(selectedTournamentId || undefined);
  const canGenerateSchedule = canUseScheduleGeneration(tournamentAccess);
  const makeRecommendationDowngradeKey = useCallback((matchId, option) => {
    const parsedMatchId = Number(matchId);
    const optionType = String(option?.option_type || "").toUpperCase().trim();
    if (!Number.isFinite(parsedMatchId) || parsedMatchId <= 0 || !optionType) return "";
    return `${Math.trunc(parsedMatchId)}|${optionType}`;
  }, []);
  const isRecommendationDowngraded = useCallback((matchId, option) => {
    const key = makeRecommendationDowngradeKey(matchId, option);
    if (!key) return false;
    return Boolean(recommendationDowngradeMap[key]);
  }, [makeRecommendationDowngradeKey, recommendationDowngradeMap]);
  useEffect(() => () => {
    if (focusHighlightTimeoutRef.current) {
      window.clearTimeout(focusHighlightTimeoutRef.current);
    }
    if (focusRevealAttemptRef.current) {
      window.clearTimeout(focusRevealAttemptRef.current);
    }
  }, []);
  const isAutoApplicableVerifiedOption = useCallback(({
    matchId,
    option
  }) => {
    if (isRecommendationDowngraded(matchId, option)) return false;
    return isFullyApplicableRecommendationOption({
      option,
      matchId
    });
  }, [isRecommendationDowngraded]);

  // -----------------------------
  // Derived Data
  // -----------------------------
  const selectedTournament = useMemo(() => tournaments.find(tournament => Number(tournament.id) === Number(selectedTournamentId)) || null, [selectedTournamentId, tournaments]);
  const tournamentStartDate = useMemo(() => selectedTournament?.start_date ? new Date(`${selectedTournament.start_date}T00:00:00`) : null, [selectedTournament]);
  const tournamentEndDate = useMemo(() => selectedTournament?.end_date ? new Date(`${selectedTournament.end_date}T00:00:00`) : selectedTournament?.start_date ? new Date(`${selectedTournament.start_date}T00:00:00`) : null, [selectedTournament]);
  const includeEvening = Boolean(selectedTournament?.include_evening ?? analytics?.include_evening ?? false);
  const calendarStartHour = parseHour(selectedTournament?.schedule_start_hour ?? analytics?.display_start_hour, 5, 0, 23);
  const calendarEndHour = parseHour(selectedTournament?.schedule_end_hour ?? analytics?.display_end_hour, includeEvening ? 22 : 18, 1, 24);
  const normalizedEvents = useMemo(() => normalizeEvents(events), [events]);
  const matchEventById = useMemo(() => {
    const map = new Map();
    normalizedEvents.forEach(event => {
      const matchId = Number(event?.match_id || event?.id || 0);
      if (!Number.isFinite(matchId) || matchId <= 0) return;
      map.set(Math.trunc(matchId), event);
    });
    return map;
  }, [normalizedEvents]);
  const venueNameById = useMemo(() => {
    const map = new Map();
    (Array.isArray(venues) ? venues : []).forEach(venue => {
      const venueId = Number(venue?.id || 0);
      if (!Number.isFinite(venueId) || venueId <= 0) return;
      map.set(Math.trunc(venueId), formatVenueLabel(venue));
    });
    normalizedEvents.forEach(event => {
      const venueId = Number(event?.venue_id || event?.venueId || 0);
      if (!Number.isFinite(venueId) || venueId <= 0) return;
      if (!map.has(Math.trunc(venueId))) {
        map.set(Math.trunc(venueId), formatVenueLabel(event?.venue, venueId));
      }
    });
    return map;
  }, [normalizedEvents, venues]);
  const getVenueLabelById = useCallback((venueId, fallbackName = "") => {
    const parsedId = Number(venueId || 0);
    const known = Number.isFinite(parsedId) && parsedId > 0 ? venueNameById.get(Math.trunc(parsedId)) : "";
    if (known) return known;
    if (String(fallbackName || "").trim()) return String(fallbackName).trim();
    return Number.isFinite(parsedId) && parsedId > 0 ? "Unassigned venue" : "Not assigned";
  }, [venueNameById]);
  const validationAffectedMatchById = useMemo(() => {
    const map = new Map();
    const conflicts = Array.isArray(validationResult?.conflicts) ? validationResult.conflicts : [];
    conflicts.forEach(conflict => {
      const evidence = conflict?.evidence && typeof conflict.evidence === "object" ? conflict.evidence : {};
      const affected = Array.isArray(evidence?.affected_matches) ? evidence.affected_matches : [];
      affected.forEach(row => {
        const matchId = Number(row?.match_id || row?.id || 0);
        if (!Number.isFinite(matchId) || matchId <= 0) return;
        map.set(Math.trunc(matchId), row);
      });
    });
    return map;
  }, [validationResult]);
  const buildFriendlyMatchSummary = useCallback((matchId, fallback = {}) => {
    const numericMatchId = Number(matchId || fallback?.match_id || fallback?.id || 0);
    const event = Number.isFinite(numericMatchId) && numericMatchId > 0 ? matchEventById.get(Math.trunc(numericMatchId)) : null;
    const evidenceFallback = Number.isFinite(numericMatchId) && numericMatchId > 0 ? validationAffectedMatchById.get(Math.trunc(numericMatchId)) || null : null;
    const merged = {
      ...(evidenceFallback || {}),
      ...(fallback && typeof fallback === "object" ? fallback : {}),
      ...(event || {})
    };
    const primaryLabel = getMatchDisplayName(merged);
    const startAt = merged?.start || merged?.scheduled_start || merged?.start_time || null;
    const endAt = merged?.end || merged?.scheduled_end || merged?.end_time || null;
    const hasTime = Boolean(startAt && endAt);
    const timeRange = hasTime ? formatDateTimeRange(startAt, endAt) : "Not scheduled yet";
    const venueId = merged?.venue_id || null;
    const venueNameRaw = getVenueLabelById(venueId, merged?.venue || merged?.venue_name || "");
    const venueName = String(venueNameRaw || "").trim() || "Not assigned";
    const roundText = String(merged?.round_name || merged?.round || "").trim();
    const meta = formatMatchMeta({
      match_id: Number.isFinite(numericMatchId) && numericMatchId > 0 ? Math.trunc(numericMatchId) : "?",
      round: roundText
    });
    return {
      matchId: Number.isFinite(numericMatchId) && numericMatchId > 0 ? Math.trunc(numericMatchId) : null,
      primaryLabel,
      teamsText: "",
      sportName: String(merged?.sport_display_name || merged?.sport_name || merged?.sport || "Match"),
      meta,
      timeRange,
      venueName,
      venueId: Number(venueId || 0) > 0 ? Number(venueId) : null
    };
  }, [getVenueLabelById, matchEventById, validationAffectedMatchById]);
  const sportOptions = useMemo(() => {
    const unique = new Map();
    normalizedEvents.forEach(event => {
      if (!event.sportKey) return;
      if (!unique.has(event.sportKey)) {
        unique.set(event.sportKey, getSportLabel(event.sportKey));
      }
    });
    return Array.from(unique.entries()).map(([value, label]) => ({
      value,
      label
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [normalizedEvents]);
  const eventCategoryOptions = useMemo(() => {
    if (selectedSport === "all") return [];
    const unique = new Map();
    normalizedEvents.forEach(event => {
      if (event.sportKey !== selectedSport) return;
      if (!event.eventCategoryKey) return;
      if (!isMeaningfulEventName(event.eventName, event.sportName)) return;
      if (!unique.has(event.eventCategoryKey)) {
        unique.set(event.eventCategoryKey, event.eventName);
      }
    });
    return Array.from(unique.entries()).map(([value, label]) => ({
      value,
      label
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [normalizedEvents, selectedSport]);
  const selectedEventCategoryTarget = useMemo(() => {
    if (selectedSport === "all" || selectedEventCategory === "all") return null;
    return normalizedEvents.find(event => event.sportKey === selectedSport && event.eventCategoryKey === selectedEventCategory) || null;
  }, [normalizedEvents, selectedEventCategory, selectedSport]);
  const selectedScheduleScope = useMemo(
    () => resolveScheduleSelectionScope(
      normalizedEvents,
      selectedSport,
      selectedEventCategory
    ),
    [normalizedEvents, selectedEventCategory, selectedSport]
  );
  const selectedScheduleSportId = selectedScheduleScope.sportId;
  const selectedScheduleEventId =
    selectedScheduleScope.tournamentSportEventId;
  const venueOptions = useMemo(() => {
    const venueMap = new Map();
    normalizedEvents.forEach(event => {
      const key = getVenueKey(event);
      if (!venueMap.has(key)) {
        venueMap.set(key, event.venueLabel);
      }
    });
    return Array.from(venueMap.entries()).map(([value, label]) => ({
      value,
      label
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [normalizedEvents]);
  const statusOptions = useMemo(() => {
    const set = new Set();
    normalizedEvents.forEach(event => {
      const key = String(event.status || "").trim();
      if (key) set.add(key);
    });
    return Array.from(set).map(value => ({
      value,
      label: value
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [normalizedEvents]);
  const dateOptions = useMemo(() => {
    const map = new Map();
    normalizedEvents.forEach(event => {
      const dateKey = String(event.dateKey || "").trim();
      if (!dateKey) return;
      if (!map.has(dateKey)) {
        map.set(dateKey, event.start.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric"
        }));
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label
    })).sort((a, b) => a.value.localeCompare(b.value));
  }, [normalizedEvents]);
  const venueUsageCountByVenueId = useMemo(() => {
    const counts = {};
    normalizedEvents.forEach(event => {
      const venueId = Number(event?.venue_id || event?.venueId || 0);
      if (!Number.isFinite(venueId) || venueId <= 0) return;
      const normalizedVenueId = Math.trunc(venueId);
      counts[normalizedVenueId] = Number(counts[normalizedVenueId] || 0) + 1;
    });
    return counts;
  }, [normalizedEvents]);
  const venuePreview = useMemo(() => {
    const usedVenueIds = new Set();
    const fallbackVenueById = new Map();
    normalizedEvents.forEach(event => {
      const venueId = Number(event?.venue_id || event?.venueId || 0);
      if (!Number.isFinite(venueId) || venueId <= 0) return;
      const normalizedVenueId = Math.trunc(venueId);
      usedVenueIds.add(normalizedVenueId);
      if (!fallbackVenueById.has(normalizedVenueId)) {
        fallbackVenueById.set(normalizedVenueId, {
          id: normalizedVenueId,
          name: String(event?.venue || event?.venue_name || event?.venueLabel || `Venue #${normalizedVenueId}`).trim(),
          location: "",
          is_indoor: Boolean(event?.venue?.is_indoor),
          supported_sports: []
        });
      }
    });
    const rows = (Array.isArray(venues) ? venues : []).filter(venue => usedVenueIds.has(Number(venue?.id || 0))).map(venue => ({
      ...venue,
      supported_sports: Array.isArray(venue?.supported_sports) ? venue.supported_sports : []
    }));
    const knownIds = new Set(rows.map(venue => Number(venue?.id || 0)));
    fallbackVenueById.forEach((venue, venueId) => {
      if (!knownIds.has(venueId)) rows.push(venue);
    });
    return rows.slice().sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
  }, [normalizedEvents, venues]);
  const visibleEvents = useMemo(() => normalizedEvents.filter(event => {
    if (selectedSport !== "all" && event.sportKey !== selectedSport) return false;
    if (selectedEventCategory !== "all" && event.eventCategoryKey !== selectedEventCategory) return false;
    if (selectedStatus !== "all" && String(event.status || "") !== selectedStatus) return false;
    if (selectedDate !== "all" && event.dateKey !== selectedDate) return false;
    if (selectedVenue !== "all" && getVenueKey(event) !== selectedVenue) return false;
    return true;
  }), [normalizedEvents, selectedDate, selectedEventCategory, selectedSport, selectedStatus, selectedVenue]);
  const visibleTournamentBlocks = useMemo(() => (Array.isArray(calendarBlockedWindows) ? calendarBlockedWindows : []).filter(block => block?.start instanceof Date && block?.end instanceof Date).sort((a, b) => a.start.getTime() - b.start.getTime()), [calendarBlockedWindows]);
  const scheduleVersionToken = useMemo(() => {
    if (!Array.isArray(normalizedEvents) || normalizedEvents.length === 0) return "no-schedule";
    const rows = normalizedEvents.map(event => {
      const eventId = event.match_id || event.id || "";
      const venueId = event.venue_id || event.venueId || event.venue || "";
      const startMs = event.start instanceof Date ? event.start.getTime() : Number(new Date(event.start || "").getTime()) || 0;
      const endMs = event.end instanceof Date ? event.end.getTime() : Number(new Date(event.end || "").getTime()) || 0;
      return `${eventId}|${venueId}|${startMs}|${endMs}`;
    }).sort().join("~");
    return computeStableHash(rows);
  }, [normalizedEvents]);
  const insightStateStorageKey = useMemo(() => `omnisport:schedule-warning-state:${selectedTournamentId || "none"}`, [selectedTournamentId]);
  // eslint-disable-next-line no-unused-vars
  const insightContextKey = useMemo(() => `${selectedTournamentId || "none"}:${scheduleVersionToken}`, [selectedTournamentId, scheduleVersionToken]);
  // eslint-disable-next-line no-unused-vars
  const generationOperatingSummary = useMemo(() => {
    if (!(tournamentStartDate instanceof Date) || !(tournamentEndDate instanceof Date)) return [];
    const start = new Date(tournamentStartDate);
    const end = new Date(tournamentEndDate);
    const rows = [];
    while (start <= end) {
      const dayStart = new Date(start);
      dayStart.setHours(calendarStartHour, 0, 0, 0);
      const dayEnd = new Date(start);
      if (calendarEndHour === 24) {
        dayEnd.setHours(23, 59, 0, 0);
      } else {
        dayEnd.setHours(calendarEndHour, 0, 0, 0);
      }
      const dayBlocks = visibleTournamentBlocks.filter(block => block.start.toDateString() === start.toDateString() && overlapsTimeWindow(dayStart, dayEnd, block.start, block.end));
      const blockedMinutes = dayBlocks.reduce((total, block) => {
        const blockStart = block.start < dayStart ? dayStart : block.start;
        const blockEnd = block.end > dayEnd ? dayEnd : block.end;
        const minutes = Math.max(0, Math.round((blockEnd.getTime() - blockStart.getTime()) / (1000 * 60)));
        return total + minutes;
      }, 0);
      const totalMinutes = Math.max(0, Math.round((dayEnd.getTime() - dayStart.getTime()) / (1000 * 60)));
      rows.push({
        date: new Date(start),
        totalMinutes,
        blockedMinutes,
        availableMinutes: Math.max(0, totalMinutes - blockedMinutes),
        blocks: dayBlocks
      });
      start.setDate(start.getDate() + 1);
    }
    return rows;
  }, [calendarEndHour, calendarStartHour, tournamentEndDate, tournamentStartDate, visibleTournamentBlocks]);
  const activePopover = pinnedPopover || hoverPopover;
  const buildPopoverAnchor = useCallback(nativeEvent => {
    if (!nativeEvent || typeof nativeEvent.clientX !== "number" || typeof nativeEvent.clientY !== "number") {
      return {
        x: 20,
        y: 20
      };
    }
    const panelRect = schedulePanelRef.current?.getBoundingClientRect();
    if (!panelRect) {
      return {
        x: nativeEvent.clientX,
        y: nativeEvent.clientY
      };
    }
    return {
      x: nativeEvent.clientX - panelRect.left + 8,
      y: nativeEvent.clientY - panelRect.top + 8
    };
  }, []);
  const asPopoverItem = useCallback(rawItem => {
    const kind = String(rawItem?.__kind || "").toUpperCase();
    if (kind === "PROGRAM_BLOCK") {
      return {
        type: "PROGRAM_BLOCK",
        title: "Program Block",
        item: rawItem
      };
    }
    // eslint-disable-next-line no-unused-vars
    const matchId = rawItem?.match_id || rawItem?.id || null;
    const matchTitle = getMatchDisplayName(rawItem);
    return {
      type: "MATCH",
      title: matchTitle || "Match details unavailable",
      item: rawItem,
      issueSummary: rawItem?.issueSummary || null
    };
  }, []);
  const handleCalendarItemHover = useCallback((item, mouseEvent) => {
    if (pinnedPopover) return;
    setHoverPopover({
      ...asPopoverItem(item),
      anchor: buildPopoverAnchor(mouseEvent),
      pinned: false
    });
  }, [asPopoverItem, buildPopoverAnchor, pinnedPopover]);
  const handleCalendarItemHoverEnd = useCallback(() => {
    if (pinnedPopover) return;
    setHoverPopover(null);
  }, [pinnedPopover]);
  const handleCalendarItemSelect = useCallback((item, mouseEvent) => {
    const payload = asPopoverItem(item);
    setPinnedPopover({
      ...payload,
      anchor: buildPopoverAnchor(mouseEvent),
      pinned: true
    });
    setHoverPopover(null);
    if (payload.type === "MATCH") {
      setSelectedEvent(item);
    }
  }, [asPopoverItem, buildPopoverAnchor]);
  const closePinnedPopover = useCallback(() => {
    setPinnedPopover(null);
    setHoverPopover(null);
  }, []);
  const activeConflictSummary = validationResult?.summary || null;

  // Group validation conflicts by type — one card per type, not one row per match
  const groupedConflicts = useMemo(() => {
    return groupScheduleConflicts(validationResult?.conflicts, {
      normalizeContractSeverity,
      normalizeResolutionOptions,
    });
  }, [validationResult]);
  // eslint-disable-next-line no-unused-vars
  const calendarConflictGroups = useMemo(() => groupedConflicts.filter(group => !UNSCHEDULED_ISSUE_CODES.has(String(group?.type || "").toUpperCase())), [groupedConflicts]);
  // eslint-disable-next-line no-unused-vars
  const unscheduledConflictGroups = useMemo(() => groupedConflicts.filter(group => UNSCHEDULED_ISSUE_CODES.has(String(group?.type || "").toUpperCase())), [groupedConflicts]);
  const conflictSeveritySummary = useMemo(() => {
    const summary = {
      blocking: 0,
      warning: 0,
      info: 0
    };
    groupedConflicts.forEach(group => {
      const severity = normalizeContractSeverity(group.severity, group.blocking);
      if (severity === "BLOCKING") {
        summary.blocking += group.count;
      } else if (severity === "INFO") {
        summary.info += group.count;
      } else {
        summary.warning += group.count;
      }
    });
    return summary;
  }, [groupedConflicts]);
  // eslint-disable-next-line no-unused-vars
  const formatConflictType = type => String(type || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const collectGroupMatchIds = useCallback(group => collectScheduleIssueMatchIds(group), []);
  // eslint-disable-next-line no-unused-vars
  const getGroupFriendlyTitle = useCallback(group => {
    return getScheduleIssueFriendlyTitle(group, { getVenueLabelById, buildIssueTitle });
  }, [getVenueLabelById]);
  // eslint-disable-next-line no-unused-vars
  const getGroupFriendlyMessage = useCallback(group => {
    return getScheduleIssueFriendlyMessage(group, { getVenueLabelById, formatDateTimeRange });
  }, [getVenueLabelById]);
  // eslint-disable-next-line no-unused-vars
  const getGroupWhyMatters = useCallback(group => getScheduleIssueWhyItMatters(group), []);
  // eslint-disable-next-line no-unused-vars
  const getGroupNextSteps = useCallback(group => getScheduleIssueNextSteps(group), []);
  // eslint-disable-next-line no-unused-vars
  const getAffectedMatchSummaries = useCallback(group => {
    const ids = collectGroupMatchIds(group);
    const evidence = group?.evidence && typeof group.evidence === "object" ? group.evidence : {};
    const affectedMatches = Array.isArray(evidence?.affected_matches) ? evidence.affected_matches : [];
    const fallbackById = new Map();
    affectedMatches.forEach(row => {
      const matchId = Number(row?.match_id || row?.id || 0);
      if (!Number.isFinite(matchId) || matchId <= 0) return;
      fallbackById.set(Math.trunc(matchId), row);
    });
    return ids.slice(0, 8).map(matchId => buildFriendlyMatchSummary(matchId, fallbackById.get(matchId) || {}));
  }, [buildFriendlyMatchSummary, collectGroupMatchIds]);
  // eslint-disable-next-line no-unused-vars
  const buildFriendlyEvidenceRows = useCallback(group => {
    return buildScheduleIssueEvidenceRows(group, { getVenueLabelById, formatDateTimeRange, buildEvidenceRows });
  }, [getVenueLabelById]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(insightStateStorageKey);
      if (!raw) {
        setInsightWarningState({});
        return;
      }
      const parsed = JSON.parse(raw);
      setInsightWarningState(parsed && typeof parsed === "object" ? parsed : {});
    } catch (error) {
      console.error(error);
      setInsightWarningState({});
    }
  }, [insightStateStorageKey]);
  useEffect(() => {
    try {
      window.localStorage.setItem(insightStateStorageKey, JSON.stringify(insightWarningState || {}));
    } catch (error) {
      console.error(error);
    }
  }, [insightStateStorageKey, insightWarningState]);

  // -----------------------------
  // Data Loading
  // -----------------------------
  const loadTournamentList = useCallback(async () => {
    const requestId = ++tournamentListLoadRequestRef.current;
    const contextKey = selectedWorkspaceId ? String(selectedWorkspaceId) : "all";
    setTournamentListLoading(true);
    try {
      const rows = await getTournaments(selectedWorkspaceId ? {
        workspaceId: selectedWorkspaceId
      } : {});
      if (requestId !== tournamentListLoadRequestRef.current) return;
      const safeRows = Array.isArray(rows) ? rows : [];
      setTournaments(safeRows);
      if (safeRows.length > 0) {
        setSelectedTournamentId(prev => {
          const stored = String(prev || "").trim();
          const storedExists = stored && safeRows.some(row => String(row.id) === stored);
          return storedExists ? stored : String(safeRows[0].id);
        });
      } else {
        setSelectedTournamentId("");
      }
    } catch (apiError) {
      if (requestId !== tournamentListLoadRequestRef.current) return;
      console.error(apiError);
      setTournaments([]);
      setSelectedTournamentId("");
      setStatus({
        type: "error",
        message: "Unable to load tournaments.",
        suggestions: []
      });
    } finally {
      if (requestId === tournamentListLoadRequestRef.current) {
        setResolvedTournamentContextKey(contextKey);
        setTournamentListLoading(false);
      }
    }
  }, [selectedWorkspaceId]);
  const loadVenueList = useCallback(async () => {
    try {
      const data = await getVenues(true);
      setVenues(Array.isArray(data) ? data : []);
    } catch (apiError) {
      console.error(apiError);
      setVenues([]);
    }
  }, []);
  const loadProgramBlocks = useCallback(async tournamentId => {
    if (!tournamentId) {
      setProgramBlocks([]);
      return [];
    }
    try {
      const response = await getProgramBlocks(Number(tournamentId));
      const rows = Array.isArray(response?.blocks) ? response.blocks : [];
      setProgramBlocks(rows);
      return rows;
    } catch (apiError) {
      console.error(apiError);
      setProgramBlocks([]);
      return [];
    }
  }, []);
  const loadScheduleData = useCallback(async tournamentId => {
    const parsedTournamentId = Number.parseInt(String(tournamentId), 10);
    if (!Number.isFinite(parsedTournamentId) || parsedTournamentId <= 0) {
      scheduleLoadRequestRef.current += 1;
      setEvents([]);
      setCalendarBlockedWindows([]);
      setAnalytics(null);
      setSelectedEvent(null);
      return {
        events: [],
        analytics: null
      };
    }
    const requestId = ++scheduleLoadRequestRef.current;
    setLoading(true);
    try {
      const analyticsPromise = getScheduleAnalytics(
        parsedTournamentId,
        Number.parseInt(minRestMinutes, 10) || 30,
      ).then(response => {
        if (requestId === scheduleLoadRequestRef.current) {
          setAnalytics(response || null);
        }
        return response || null;
      }).catch(apiError => {
        console.error(apiError);
        if (requestId === scheduleLoadRequestRef.current) setAnalytics(null);
        return null;
      });
      const eventsResponse = await getScheduleEvents(parsedTournamentId);
      if (requestId !== scheduleLoadRequestRef.current) {
        return {
          events: [],
          analytics: null
        };
      }
      const loadedEvents = Array.isArray(eventsResponse?.events) ? eventsResponse.events : [];
      const loadedProgramBlocks = Array.isArray(eventsResponse?.program_blocks) ? eventsResponse.program_blocks.map(block => {
        const start = parseProgramBlockDateTime(block?.start);
        const end = parseProgramBlockDateTime(block?.end);
        if (!start || !end || end <= start) return null;
        return {
          ...block,
          start,
          end
        };
      }).filter(Boolean) : [];
      setEvents(loadedEvents);
      setCalendarBlockedWindows(loadedProgramBlocks);
      setProgramBlocks(Array.isArray(eventsResponse?.program_blocks) ? eventsResponse.program_blocks : []);
      void analyticsPromise;
      return {
        events: loadedEvents,
        analytics: null
      };
    } catch (apiError) {
      if (requestId !== scheduleLoadRequestRef.current) {
        return {
          events: [],
          analytics: null
        };
      }
      console.error(apiError);
      setEvents([]);
      setCalendarBlockedWindows([]);
      setAnalytics(null);
      setSelectedEvent(null);
      setStatus({
        type: "error",
        message: normalizeApiDetailMessage(apiError?.response?.data?.detail) || "Unable to load schedule data for the selected tournament.",
        suggestions: []
      });
      return {
        events: [],
        analytics: null
      };
    } finally {
      if (requestId === scheduleLoadRequestRef.current) {
        setLoading(false);
      }
    }
  }, [minRestMinutes]);
  useEffect(() => {
    loadTournamentList();
    loadVenueList();
  }, [loadTournamentList, loadVenueList]);
  useEffect(() => {
    let active = true;
    const loadAvailabilityPreview = async () => {
      const previewVenues = Array.isArray(venuePreview) ? venuePreview : [];
      if (!venueDrawerOpen || !selectedTournamentId || previewVenues.length === 0) {
        setAvailabilityByVenueId({});
        return;
      }
      const payload = await getTournamentVenueAvailability(Number(selectedTournamentId), {
        venueIds: previewVenues.map(venue => venue.id),
        startDate: selectedTournament?.start_date || "",
        endDate: selectedTournament?.end_date || "",
      });
      if (!active) return;
      const next = {};
      previewVenues.forEach(venue => {
        next[venue.id] = [];
      });
      (Array.isArray(payload?.venues) ? payload.venues : []).forEach(venue => {
        next[venue.venue_id] = Array.isArray(venue.availability) ? venue.availability : [];
      });
      setAvailabilityByVenueId(next);
    };
    loadAvailabilityPreview().catch(apiError => {
      if (!active) return;
      console.error(apiError);
      setAvailabilityByVenueId({});
    });
    return () => {
      active = false;
    };
  }, [selectedTournament?.end_date, selectedTournament?.start_date, selectedTournamentId, venueDrawerOpen, venuePreview]);
  useEffect(() => {
    if (!selectedTournamentId) return;
    scheduleLoadRequestRef.current += 1;
    validationLoadRequestRef.current += 1;
    generationRequestRef.current += 1;
    preflightRequestRef.current += 1;
    setValidationResult(null);
    setGenerationResult(null);
    setPreflightResult(null);
    setPreflightModalOpen(false);
    setPreflightFingerprint("");
    setSelectedEvent(null);
    setIssueDrawerOpen(false);
    setPinnedPopover(null);
    setHoverPopover(null);
    setRecommendationDowngradeMap({});
    setGenerationFlowStep("idle");
    setGenerating(false);
    setValidating(false);
    setPreflightRunning(false);
  }, [selectedTournamentId]);
  useEffect(() => {
    if (tournamentStartDate instanceof Date && !Number.isNaN(tournamentStartDate.getTime())) {
      setCalendarDate(tournamentStartDate);
    }
  }, [tournamentStartDate, selectedTournamentId]);
  useEffect(() => {
    const handlePointerDown = event => {
      if (!pinnedPopover) return;
      if (popoverRef.current?.contains(event.target)) return;
      const matchCard = event.target?.closest?.(".os-match-event-card");
      const blockCard = event.target?.closest?.(".os-program-block-bg");
      if (matchCard || blockCard) return;
      setPinnedPopover(null);
      setHoverPopover(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [pinnedPopover]);
  const refreshValidationSummary = useCallback(async (tournamentId, options = {}) => {
    if (!tournamentId) return null;
    const parsedTournamentId = Number.parseInt(String(tournamentId), 10);
    if (!Number.isFinite(parsedTournamentId) || parsedTournamentId <= 0) {
      setValidationResult(null);
      return null;
    }
    const requestId = ++validationLoadRequestRef.current;
    try {
      const payload = await validateSchedule(parsedTournamentId, {
        sportId: selectedScheduleSportId,
        tournamentSportEventId: selectedScheduleEventId,
      });
      if (requestId !== validationLoadRequestRef.current) return null;
      setValidationResult(payload || null);
      return payload || null;
    } catch (apiError) {
      if (requestId === validationLoadRequestRef.current) {
        setValidationResult(null);
      }
      console.error(apiError);
      if (options?.throwOnError) {
        throw apiError;
      }
      return null;
    }
  }, [selectedScheduleEventId, selectedScheduleSportId]);
  const refreshScheduleAndValidation = useCallback(async tournamentId => {
    if (!tournamentId) {
      setValidationResult(null);
      return {
        events: [],
        analytics: null,
        validation: null
      };
    }
    const [schedulePayload, validationPayload] = await Promise.all([
      loadScheduleData(tournamentId),
      refreshValidationSummary(tournamentId),
    ]);
    return {
      ...(schedulePayload || {
        events: [],
        analytics: null
      }),
      validation: validationPayload || null
    };
  }, [loadScheduleData, refreshValidationSummary]);
  useEffect(() => {
    const tournamentId = String(selectedTournamentId || "").trim();
    if (!tournamentId) {
      setResolvedScheduleTournamentId("");
      setPresentedScheduleTournamentId("");
      return undefined;
    }
    let active = true;
    void refreshScheduleAndValidation(tournamentId).finally(() => {
      if (active) setResolvedScheduleTournamentId(tournamentId);
    });
    return () => {
      active = false;
    };
  }, [refreshScheduleAndValidation, selectedTournamentId]);
  useEffect(() => {
    const tournamentId = String(selectedTournamentId || "").trim();
    if (!tournamentId) {
      setPresentedScheduleTournamentId("");
      return;
    }
    if (
      resolvedScheduleTournamentId === tournamentId &&
      !tournamentAccessLoading
    ) {
      setPresentedScheduleTournamentId(tournamentId);
    }
  }, [
    resolvedScheduleTournamentId,
    selectedTournamentId,
    tournamentAccessLoading,
  ]);
  const hasAnyConflictForMatch = useCallback((validationPayload, matchId) => {
    const numericMatchId = Number(matchId);
    if (!Number.isFinite(numericMatchId) || numericMatchId <= 0) return false;
    const conflicts = Array.isArray(validationPayload?.conflicts) ? validationPayload.conflicts : [];
    return conflicts.some(conflict => {
      const ids = collectIssueMatchIds(conflict);
      return ids.has(Math.trunc(numericMatchId));
    });
  }, []);
  const applyReschedule = useCallback(async ({
    matchId,
    start,
    end,
    venueId = null,
    autoFix = false,
    conflictAsFailure = false,
    successMessage = "Reschedule request completed."
  }) => {
    if (!matchId) return null;
    setActionLoading(true);
    setStatus({
      type: "info",
      message: "Submitting reschedule request...",
      suggestions: []
    });
    try {
      const response = await rescheduleMatch({
        match_id: matchId,
        scheduled_start: start,
        scheduled_end: end,
        venue_id: venueId,
        auto_fix: Boolean(autoFix)
      });
      const suggestions = Array.isArray(response?.suggestions) ? response.suggestions : [];
      const typedConflicts = Array.isArray(response?.conflicts) ? response.conflicts : [];
      const conflictMessages = typedConflicts.map(item => buildHumanConflictMessage(item)).filter(Boolean);
      if (conflictAsFailure && response?.status === "conflict") {
        setStatus({
          type: "error",
          message: conflictMessages[0] || response?.message || "Schedule conflict detected. Match was returned to its previous slot.",
          suggestions: []
        });
        const refreshed = await refreshScheduleAndValidation(selectedTournamentId);
        const refreshedEvents = Array.isArray(refreshed?.events) ? refreshed.events : [];
        const nextSelected = refreshedEvents.find(row => Number(row?.match_id || row?.id) === Number(matchId));
        if (nextSelected) {
          setSelectedEvent(nextSelected);
        }
        return null;
      }
      const kind = response?.status === "conflict" ? "warning" : response?.status === "success" ? "success" : response?.status === "auto_fixed" ? "warning" : "info";
      const refreshed = await refreshScheduleAndValidation(selectedTournamentId);
      const refreshedEvents = Array.isArray(refreshed?.events) ? refreshed.events : [];
      const refreshedValidation = refreshed?.validation || null;
      const stillHasIssue = hasAnyConflictForMatch(refreshedValidation, matchId);
      if (response?.status && String(response.status).toLowerCase() !== "conflict") {
        setGenerationResult(null);
        setStatus({
          type: stillHasIssue ? "warning" : "success",
          message: stillHasIssue ? "Change applied, but the issue still remains. Review the updated issue details." : "Fix applied. The issue was resolved.",
          suggestions: stillHasIssue ? suggestions.map(item => ({
            ...item,
            match_id: matchId
          })) : []
        });
      } else {
        setStatus({
          type: kind,
          message: conflictMessages[0] || response?.message || successMessage,
          suggestions: suggestions.map(item => ({
            ...item,
            match_id: matchId
          }))
        });
      }
      const nextSelected = refreshedEvents.find(row => Number(row?.match_id || row?.id) === Number(matchId));
      if (nextSelected) {
        setSelectedEvent(nextSelected);
      }
      return response;
    } catch (apiError) {
      console.error(apiError);
      setStatus({
        type: "error",
        message: normalizeApiDetailMessage(apiError?.response?.data?.detail) || "Reschedule request failed. Please try again.",
        suggestions: []
      });
      const refreshed = await refreshScheduleAndValidation(selectedTournamentId);
      const refreshedEvents = Array.isArray(refreshed?.events) ? refreshed.events : [];
      const nextSelected = refreshedEvents.find(row => Number(row?.match_id || row?.id) === Number(matchId));
      if (nextSelected) {
        setSelectedEvent(nextSelected);
      }
      return null;
    } finally {
      setActionLoading(false);
    }
  }, [hasAnyConflictForMatch, refreshScheduleAndValidation, selectedTournamentId]);

  // -----------------------------
  // User Actions / Mutations
  // -----------------------------
  const handleEventDrop = useCallback(async dropPayload => {
    const {
      matchId,
      venueId,
      start,
      end
    } = normalizeCalendarEventPayload(dropPayload);
    if (!matchId || !start || !end || !venueId) {
      setStatus({
        type: "error",
        message: "Drag update failed: match, venue, or slot data is missing.",
        suggestions: []
      });
      await refreshScheduleAndValidation(selectedTournamentId);
      return;
    }
    const blockedWindow = findOverlappingProgramBlock(start, end, calendarBlockedWindows);
    if (blockedWindow) {
      setStatus({
        type: "error",
        message: buildBlockedMessage(blockedWindow),
        suggestions: []
      });
      await refreshScheduleAndValidation(selectedTournamentId);
      return;
    }
    await applyReschedule({
      matchId,
      start,
      end,
      venueId,
      autoFix: false,
      conflictAsFailure: true,
      successMessage: "Match moved successfully."
    });
  }, [applyReschedule, calendarBlockedWindows, refreshScheduleAndValidation, selectedTournamentId]);
  const handleEventResize = useCallback(async resizePayload => {
    const {
      matchId,
      venueId,
      start,
      end
    } = normalizeCalendarEventPayload(resizePayload);
    if (!matchId || !start || !end || !venueId) {
      setStatus({
        type: "error",
        message: "Resize update failed: match, venue, or slot data is missing.",
        suggestions: []
      });
      await refreshScheduleAndValidation(selectedTournamentId);
      return;
    }
    const blockedWindow = findOverlappingProgramBlock(start, end, calendarBlockedWindows);
    if (blockedWindow) {
      setStatus({
        type: "error",
        message: buildBlockedMessage(blockedWindow),
        suggestions: []
      });
      await refreshScheduleAndValidation(selectedTournamentId);
      return;
    }
    await applyReschedule({
      matchId,
      start,
      end,
      venueId,
      autoFix: false,
      conflictAsFailure: true,
      successMessage: "Match duration updated successfully."
    });
  }, [applyReschedule, calendarBlockedWindows, refreshScheduleAndValidation, selectedTournamentId]);
  const handleApplyRecommendationOption = useCallback(async ({
    matchId,
    option
  }) => {
    if (!option) return;
    const resolvedMatchId = resolveRecommendationMatchId({
      matchId,
      option
    });
    if (!resolvedMatchId) {
      setStatus({
        type: "info",
        message: "This recommendation is guide-only in this phase.",
        suggestions: []
      });
      return;
    }
    const optionType = String(option?.option_type || "").toUpperCase().trim();
    if (!isAutoApplicableVerifiedOption({
      option,
      matchId: resolvedMatchId
    })) {
      setStatus({
        type: "info",
        message: "This recommendation is guide-only in this phase.",
        suggestions: []
      });
      return;
    }
    setActionLoading(true);
    setStatus({
      type: "info",
      message: "Applying fix...",
      suggestions: []
    });
    try {
      const response = await applyScheduleRecommendation({
        match_id: Number(resolvedMatchId),
        option_type: optionType,
        label: option?.label || null,
        confidence: option?.confidence || null,
        mutations: Array.isArray(option?.mutations) ? option.mutations : []
      });
      setGenerationResult(null);
      const refreshed = await refreshScheduleAndValidation(selectedTournamentId);
      const refreshedEvents = Array.isArray(refreshed?.events) ? refreshed.events : [];
      const refreshedValidation = refreshed?.validation || null;
      const targetEvent = refreshedEvents.find(row => Number(row?.match_id || row?.id) === Number(resolvedMatchId));
      const stillHasIssue = hasAnyConflictForMatch(refreshedValidation, resolvedMatchId);
      const inferredResolved = Boolean(targetEvent) && !stillHasIssue;
      const backendOutcome = String(response?.apply_outcome || "").toUpperCase();
      const backendOutcomeMessage = String(response?.outcome_message || "").trim();
      const resolved = backendOutcome === "RESOLVED" ? true : backendOutcome === "PARTIAL" ? false : inferredResolved;
      const downgradeKey = makeRecommendationDowngradeKey(resolvedMatchId, option);
      if (downgradeKey) {
        setRecommendationDowngradeMap(prev => {
          const next = {
            ...(prev || {})
          };
          if (resolved) {
            delete next[downgradeKey];
          } else {
            next[downgradeKey] = true;
          }
          return next;
        });
      }
      setStatus({
        type: resolved ? "success" : "warning",
        message: resolved ? backendOutcomeMessage || "Fix applied. Refreshing schedule..." : backendOutcomeMessage || "Fix applied, but the issue still remains. Review the updated issue details.",
        suggestions: []
      });
      const nextSelected = refreshedEvents.find(row => Number(row?.match_id || row?.id) === Number(resolvedMatchId));
      if (nextSelected) {
        setSelectedEvent(nextSelected);
      }
    } catch (apiError) {
      console.error(apiError);
      const detailMsg = normalizeApiDetailMessage(apiError?.response?.data?.detail) || "";
      const detail = apiError?.response?.data?.detail;
      const detailCode = String((detail && typeof detail === "object" ? detail.code : "") || "").toUpperCase();
      const isStale = detailCode === "RECOMMENDATION_STALE" || detailCode === "RECOMMENDATION_OPTION_INVALID" || detailCode === "RECOMMENDATION_OPTION_NOT_APPLICABLE" || apiError?.response?.status === 409 || detailMsg.toLowerCase().includes("stale") || detailMsg.toLowerCase().includes("invalid") || detailMsg.toLowerCase().includes("no longer valid");
      const isConflict = detailCode === "RECOMMENDATION_REVALIDATION_FAILED";
      setStatus({
        type: "error",
        message: isConflict ? "This fix cannot be applied because it would create a conflict with another scheduled match." : isStale ? "This suggestion is no longer available. Run AI Preflight again." : detailMsg || "Failed to apply recommendation. Please refresh and try again.",
        suggestions: []
      });
      await refreshScheduleAndValidation(selectedTournamentId);
    } finally {
      setActionLoading(false);
    }
  }, [hasAnyConflictForMatch, isAutoApplicableVerifiedOption, makeRecommendationDowngradeKey, refreshScheduleAndValidation, selectedTournamentId]);
  const resetProgramBlockDraft = useCallback(() => {
    setEditingProgramBlockId(null);
    setProgramBlockDraft({
      title: "",
      block_type: "CUSTOM",
      date: "",
      start_time: "08:00",
      end_time: "09:00",
      is_recurring_daily: false,
      description: ""
    });
  }, []);
  // eslint-disable-next-line no-unused-vars
  const handleOpenProgramBlockManager = useCallback(() => {
    setIsProgramBlockModalOpen(true);
    resetProgramBlockDraft();
  }, [resetProgramBlockDraft]);
  const handleCloseProgramBlockManager = useCallback(() => {
    if (programBlockSubmitting) return;
    setIsProgramBlockModalOpen(false);
    setProgramSetupMode(false);
    setProgramSetupErrors({});
    setPendingProgramGeneration(null);
    resetProgramBlockDraft();
  }, [programBlockSubmitting, resetProgramBlockDraft]);
  const handleSaveProgramBlockEdit = useCallback(async () => {
    if (!selectedTournamentId || !editingProgramBlockId) return;
    const startAt = combineDateAndTime("2026-01-01", programBlockDraft.start_time);
    const endAt = combineDateAndTime("2026-01-01", programBlockDraft.end_time);
    if (!startAt || !endAt || endAt <= startAt) {
      setStatus({
        type: "error",
        message: "Program block start time must be earlier than end time.",
        suggestions: []
      });
      return;
    }
    if (!programBlockDraft.is_recurring_daily && !programBlockDraft.date) {
      setStatus({
        type: "error",
        message: "Select a valid date for this non-recurring program block.",
        suggestions: []
      });
      return;
    }
    setProgramBlockSubmitting(true);
    try {
      const payload = {
        title: String(programBlockDraft.title || "").trim() || "Program Block",
        block_type: programBlockDraft.block_type,
        date: programBlockDraft.is_recurring_daily ? null : programBlockDraft.date || null,
        start_time: programBlockDraft.start_time,
        end_time: programBlockDraft.end_time,
        is_recurring_daily: Boolean(programBlockDraft.is_recurring_daily),
        description: String(programBlockDraft.description || "").trim() || null
      };
      await updateProgramBlock(Number(selectedTournamentId), Number(editingProgramBlockId), payload);
      await Promise.all([loadProgramBlocks(selectedTournamentId), refreshScheduleAndValidation(selectedTournamentId)]);
      setStatus({
        type: "success",
        message: "Program block updated.",
        suggestions: []
      });
      setIsProgramBlockModalOpen(true);
      resetProgramBlockDraft();
    } catch (apiError) {
      console.error(apiError);
      setStatus({
        type: "error",
        message: normalizeApiDetailMessage(apiError?.response?.data?.detail) || "Unable to update program block.",
        suggestions: []
      });
    } finally {
      setProgramBlockSubmitting(false);
    }
  }, [editingProgramBlockId, loadProgramBlocks, programBlockDraft, refreshScheduleAndValidation, resetProgramBlockDraft, selectedTournamentId]);
  const handleDeleteProgramBlock = useCallback(async blockId => {
    if (!selectedTournamentId || !blockId) return;
    setProgramBlockSubmitting(true);
    try {
      await deleteProgramBlock(Number(selectedTournamentId), Number(blockId));
      if (Number(editingProgramBlockId) === Number(blockId)) {
        resetProgramBlockDraft();
      }
      await Promise.all([loadProgramBlocks(selectedTournamentId), refreshScheduleAndValidation(selectedTournamentId)]);
      setStatus({
        type: "success",
        message: "Program block removed.",
        suggestions: []
      });
    } catch (apiError) {
      console.error(apiError);
      setStatus({
        type: "error",
        message: normalizeApiDetailMessage(apiError?.response?.data?.detail) || "Unable to remove program block.",
        suggestions: []
      });
    } finally {
      setProgramBlockSubmitting(false);
    }
  }, [editingProgramBlockId, loadProgramBlocks, refreshScheduleAndValidation, resetProgramBlockDraft, selectedTournamentId]);
  const handleEditProgramBlock = useCallback(block => {
    if (!block?.id) return;
    setIsProgramBlockModalOpen(true);
    setEditingProgramBlockId(Number(block.id));
    setProgramBlockDraft({
      title: String(block.title || ""),
      block_type: String(block.block_type || "CUSTOM"),
      date: block.is_recurring_daily ? "" : String(block.date || ""),
      start_time: String(block.start_time || "08:00").slice(0, 5),
      end_time: String(block.end_time || "09:00").slice(0, 5),
      is_recurring_daily: Boolean(block.is_recurring_daily),
      description: String(block.description || "")
    });
  }, []);
  const openOfficialProgramSetup = useCallback(async generationOptions => {
    const rows = await loadProgramBlocks(selectedTournamentId);
    setProgramSetupRows(buildOfficialProgramSetupRows({
      programBlocks: rows,
      tournamentStartDate: String(selectedTournament?.start_date || ""),
      tournamentEndDate: String(selectedTournament?.end_date || "")
    }));
    setProgramSetupErrors({});
    setPendingProgramGeneration(generationOptions || null);
    setProgramSetupMode(true);
    setPreflightModalOpen(false);
    setIsProgramBlockModalOpen(true);
  }, [loadProgramBlocks, selectedTournament?.end_date, selectedTournament?.start_date, selectedTournamentId]);
  const handleProgramSetupRowChange = useCallback((blockType, field, value) => {
    setProgramSetupRows(rows => rows.map(row => row.type === blockType ? {
      ...row,
      [field]: value
    } : row));
    setProgramSetupErrors(errors => {
      if (!errors[blockType]) return errors;
      const next = { ...errors };
      delete next[blockType];
      return next;
    });
  }, []);
  const resolveSchedulingMode = useCallback(requestedMode => {
    const normalizedMode = String(requestedMode || "BALANCED").toUpperCase();
    return ["BALANCED", "COMPACT", "SPREAD"].includes(normalizedMode) ? normalizedMode : "BALANCED";
  }, []);
  const runPreflightStep = useCallback(async (options = {}) => {
    if (!selectedTournamentId) return null;
    const requestId = ++preflightRequestRef.current;
    const selectedSportRow = selectedSport === "all" ? null : normalizedEvents.find(event => event.sportKey === selectedSport);
    const requestedIntent = String(options?.intent || "check_current").toLowerCase();
    const preflightIntent = ["check_current", "regenerate_replace", "incremental_add"].includes(requestedIntent) ? requestedIntent : "check_current";
    const exactCheck = Boolean(options?.exactCheck);
    const response = await runSchedulePreflight(Number(selectedTournamentId), {
      sport_id: selectedSportRow?.sport_id ?? null,
      tournament_sport_event_id: selectedEventCategoryTarget?.tournament_sport_event_id ?? null,
      start_date: selectedTournament?.start_date || null,
      end_date: selectedTournament?.end_date || null,
      include_existing_schedules: true,
      preflight_intent: preflightIntent,
      exact_check: exactCheck,
      scheduling_mode: resolveSchedulingMode(options?.schedulingMode || schedulingMode)
    });
    if (requestId !== preflightRequestRef.current) {
      return null;
    }
    setPreflightResult(response || null);
    setPreflightFingerprint(String(response?.configuration_fingerprint || ""));
    return response;
  }, [normalizedEvents, resolveSchedulingMode, schedulingMode, selectedEventCategoryTarget?.tournament_sport_event_id, selectedSport, selectedTournament?.end_date, selectedTournament?.start_date, selectedTournamentId]);
  const handleProgramSetupContinue = useCallback(async () => {
    if (!selectedTournamentId || !pendingProgramGeneration) return;
    const validationErrors = validateOfficialProgramSetup({
      rows: programSetupRows,
      tournamentStartDate: String(selectedTournament?.start_date || ""),
      tournamentEndDate: String(selectedTournament?.end_date || "")
    });
    if (Object.keys(validationErrors).length) {
      setProgramSetupErrors(validationErrors);
      return;
    }

    setProgramBlockSubmitting(true);
    try {
      const currentByType = new Map(programBlocks.map(block => [String(block.block_type || "").toUpperCase(), block]));
      const disabledExisting = programSetupRows.filter(row => !row.enabled && row.existingId);
      for (const row of disabledExisting) {
        await deleteProgramBlock(Number(selectedTournamentId), Number(row.existingId));
      }

      const enabledRows = programSetupRows.filter(row => row.enabled).sort((left, right) => String(right.startTime).localeCompare(String(left.startTime)));
      for (const row of enabledRows) {
        const payload = {
          title: row.label,
          block_type: row.type,
          date: row.date,
          start_time: row.startTime,
          end_time: row.endTime,
          is_recurring_daily: false,
          description: null
        };
        const existing = currentByType.get(row.type);
        if (existing?.id) {
          await updateProgramBlock(Number(selectedTournamentId), Number(existing.id), payload);
        } else {
          await createProgramBlock(Number(selectedTournamentId), payload);
        }
      }

      await Promise.all([loadProgramBlocks(selectedTournamentId), loadScheduleData(selectedTournamentId)]);
      setIsProgramBlockModalOpen(false);
      setProgramSetupMode(false);
      setPreflightModalOpen(true);
      setScheduleCheckMode("checking");
      setPreflightRunning(true);
      const preflight = await runPreflightStep({
        intent: pendingProgramGeneration.isRegeneration ? "regenerate_replace" : "incremental_add",
        exactCheck: true,
        schedulingMode: pendingProgramGeneration.schedulingMode
      });
      if (!preflight) return;
      const check = classifyScheduleCheck(preflight);
      if (check.outcome === "blocked") {
        setScheduleCheckIssues(check.blockers);
        setScheduleCheckMode("blocked");
        setPendingCheckedGeneration(null);
        return;
      }
      const finalOptions = {
        ...pendingProgramGeneration,
        preflightFingerprint: preflight.configuration_fingerprint || null
      };
      setPendingCheckedGeneration(finalOptions);
      setScheduleCheckIssues(check.outcome === "warning" ? check.warnings : []);
      setScheduleCheckMode(check.outcome === "warning" ? "warning" : "ready");
    } catch (apiError) {
      console.error(apiError);
      setProgramSetupErrors({
        FORM: [normalizeApiDetailMessage(apiError?.response?.data?.detail) || "Unable to save the program schedule."]
      });
      setIsProgramBlockModalOpen(true);
      setProgramSetupMode(true);
      setPreflightModalOpen(false);
    } finally {
      setProgramBlockSubmitting(false);
      setPreflightRunning(false);
    }
  }, [loadProgramBlocks, loadScheduleData, pendingProgramGeneration, programBlocks, programSetupRows, runPreflightStep, selectedTournament?.end_date, selectedTournament?.start_date, selectedTournamentId]);
  const performScheduleGeneration = useCallback(async (options = {}) => {
    if (!selectedTournamentId) return null;
    const requestId = ++generationRequestRef.current;
    const selectedSportRow = selectedSport === "all" ? null : normalizedEvents.find(event => event.sportKey === selectedSport);
    const workflowMode = String(options?.workflowMode || "FINAL").toUpperCase();
    const modeToUse = resolveSchedulingMode(options?.schedulingMode || pendingGenerateMode || schedulingMode);
    const allowPartialCommit = Boolean(options?.allowPartialCommit);
    const regenerationMode = Boolean(options?.isRegeneration);
    setGenerating(true);
    setGenerationResult(null);
    setGenerationFlowStep("generating");
    setStatus({
      type: "info",
      message: "Step 3: Generating schedule...",
      suggestions: []
    });
    try {
      const response = await generateSchedule({
        tournamentId: Number(selectedTournamentId),
        sportId: selectedSportRow?.sport_id ?? null,
        tournamentSportEventId: selectedEventCategoryTarget?.tournament_sport_event_id ?? null,
        workflowMode,
        dateRange: {
          start: selectedTournament?.start_date || null,
          end: selectedTournament?.end_date || null
        },
        minRestMinutes: Number.parseInt(minRestMinutes, 10) || 30,
        useAutonomousScheduler: true,
        schedulingMode: modeToUse,
        preflightIntent: regenerationMode ? "regenerate_replace" : "incremental_add",
        allowPartialCommit,
        preflightFingerprint:
          options?.preflightFingerprint ||
          preflightResult?.configuration_fingerprint ||
          preflightFingerprint ||
          null
      });
      if (requestId !== generationRequestRef.current) {
        return null;
      }
      setGenerationResult(response || null);
      const genStatus = String(response?.status || "").toUpperCase();
      const scheduledCount = Number(response?.scheduled_count || 0);
      const realUnscheduled = (response?.unscheduled_matches ?? []).filter(m => !m?.is_placeholder);
      const blockingCount = Number(response?.blocking_count || 0);
      const hasBlockingIssues = Boolean(response?.has_blocking_issues) || blockingCount > 0 || genStatus === "GENERATED_WITH_BLOCKING_ISSUES";
      setGenerationFlowStep("validating_schedule");
      setStatus({
        type: "info",
        message: "Step 4: Validating schedule...",
        suggestions: []
      });
      await refreshValidationSummary(selectedTournamentId);
      setGenerationFlowStep("refreshing_calendar_issues");
      setStatus({
        type: "info",
        message: "Step 5: Refreshing calendar issues...",
        suggestions: []
      });
      await loadScheduleData(selectedTournamentId);
      setStatus({
        type: genStatus === "SUCCESS" && !hasBlockingIssues ? "success" : hasBlockingIssues ? "warning" : "info",
        message: hasBlockingIssues
          ? workflowMode === "DRAFT"
            ? "Draft plan generated with issues. Review blockers before finalizing."
            : "Final schedule generated with issues. Review blockers before publishing."
          : regenerationMode
            ? `Schedule regenerated. ${scheduledCount} matches scheduled, ${realUnscheduled.length} playable matches unscheduled, ${blockingCount} blocking conflicts. Safety check passed.`
            : workflowMode === "DRAFT"
              ? "Draft plan generated successfully. It remains provisional and unpublished."
              : `Final schedule generated successfully. ${scheduledCount} matches scheduled with ${blockingCount} blocking conflicts. Publish it when ready.`,
        suggestions: []
      });
      return response;
    } catch (apiError) {
      if (requestId !== generationRequestRef.current) {
        return null;
      }
      console.error(apiError);
      setGenerationResult(null);
      const detail = apiError?.response?.data?.detail;
      const detailCode = String(detail?.code || "").toUpperCase();
      if (detailCode === "SCHEDULE_PREFLIGHT_STALE") {
        const staleRetryCount = Number(options?.staleRetryCount || 0);
        if (staleRetryCount >= 1) {
          setScheduleCheckMode("error");
          setScheduleCheckIssues([presentScheduleIssue({
            code: "SCHEDULE_PREFLIGHT_STALE",
            severity: "BLOCKING",
            blocking: true,
            message: "The schedule setup changed again while generation was starting. Close this message and try once more after setup changes are finished."
          })]);
          setPreflightModalOpen(true);
          return null;
        }
        setPreflightResult(null);
        setScheduleCheckMode("checking");
        setScheduleCheckIssues([]);
        setPreflightModalOpen(true);
        setStatus({
          type: "info",
          message: "The schedule setup changed. Running the schedule check again.",
          suggestions: []
        });
        try {
          const refreshed = await runPreflightStep({
            intent: normalizedEvents.length > 0 ? "regenerate_replace" : "incremental_add",
            exactCheck: true,
            schedulingMode: modeToUse
          });
          if (refreshed) {
            const check = classifyScheduleCheck(refreshed);
            const authoritativeFingerprint =
              String(detail?.current_fingerprint || "").trim() ||
              refreshed?.configuration_fingerprint ||
              null;
            if (check.outcome === "blocked") {
              setScheduleCheckIssues(check.blockers);
              setScheduleCheckMode("blocked");
            } else if (check.outcome === "warning") {
              setScheduleCheckIssues(check.warnings);
              setPendingCheckedGeneration({
                ...options,
                schedulingMode: modeToUse,
                preflightFingerprint: authoritativeFingerprint,
                staleRetryCount: staleRetryCount + 1
              });
              setScheduleCheckMode("warning");
            } else {
              setPendingCheckedGeneration({
                ...options,
                schedulingMode: modeToUse,
                preflightFingerprint: authoritativeFingerprint,
                staleRetryCount: staleRetryCount + 1,
                autoRetryAfterStale: true
              });
              setScheduleCheckIssues([]);
              setScheduleCheckMode("checking");
              setStatus({
                type: "info",
                message: "The schedule check was refreshed. Generating with the current setup now.",
                suggestions: []
              });
            }
          }
        } catch (refreshError) {
          console.error(refreshError);
          setScheduleCheckMode("error");
          setScheduleCheckIssues([]);
        }
        return null;
      }
      const failure = classifyScheduleFailure(apiError);
      if (failure.kind === "solver_failure") {
        setScheduleCheckMode("solver_failure");
        setScheduleCheckIssues([
          presentScheduleIssue({
            code: detailCode,
            severity: "WARNING",
            blocking: false,
            message: normalizeApiDetailMessage(detail)
          })
        ]);
      } else if (failure.kind === "blocked") {
        setScheduleCheckMode("blocked");
        setScheduleCheckIssues(failure.blockers.map(presentScheduleIssue));
      } else {
        setScheduleCheckMode("system_error");
        setScheduleCheckIssues([]);
      }
      setPreflightModalOpen(true);
      setStatus({
        type: "error",
        message: failure.kind === "solver_failure"
          ? "Some matches could not be given a suitable time and venue."
          : failure.kind === "blocked"
            ? "Some schedule setup items need to be fixed first."
            : "We couldn't generate the schedule. Please try again.",
        suggestions: []
      });
      return null;
    } finally {
      if (requestId === generationRequestRef.current) {
        setGenerating(false);
        setGenerationFlowStep("idle");
      }
    }
  }, [loadScheduleData, minRestMinutes, normalizedEvents, pendingGenerateMode, preflightFingerprint, preflightResult?.configuration_fingerprint, refreshValidationSummary, resolveSchedulingMode, runPreflightStep, schedulingMode, selectedEventCategoryTarget?.tournament_sport_event_id, selectedSport, selectedTournament?.end_date, selectedTournament?.start_date, selectedTournamentId]);
  const handlePublishSchedule = useCallback(async () => {
    if (!selectedTournamentId) return;
    const selectedSportRow = selectedSport === "all" ? null : normalizedEvents.find(event => event.sportKey === selectedSport);
    setStatus({
      type: "info",
      message: "Publishing final schedule...",
      suggestions: []
    });
    try {
      await publishSchedule({
        tournamentId: Number(selectedTournamentId),
        sportId: selectedSportRow?.sport_id ?? null,
        tournamentSportEventId: selectedEventCategoryTarget?.tournament_sport_event_id ?? null
      });
      await refreshScheduleAndValidation(selectedTournamentId);
      setStatus({
        type: "success",
        message: "Final schedule published. Notifications and reminders are now enabled.",
        suggestions: []
      });
    } catch (apiError) {
      setStatus({
        type: "error",
        message: normalizeApiDetailMessage(apiError?.response?.data?.detail) || "Failed to publish the final schedule.",
        suggestions: []
      });
    }
  }, [normalizedEvents, refreshScheduleAndValidation, selectedEventCategoryTarget?.tournament_sport_event_id, selectedSport, selectedTournamentId]);
  const handleGuidedScheduleGeneration = useCallback(async (options = {}) => {
    if (!selectedTournamentId || generating || preflightRunning || !canGenerateSchedule) return;
    const modeToUse = resolveSchedulingMode(options?.schedulingMode || schedulingMode);
    const existingSchedulePresent = Array.isArray(normalizedEvents) && normalizedEvents.length > 0;
    const requestedMode = String(options?.mode || "").toLowerCase();
    const shouldRegenerate = requestedMode === "regenerate" || requestedMode !== "generate" && existingSchedulePresent;
    const confirmRegenerate = Boolean(options?.confirmRegenerate);
    const allowPartial = Boolean(options?.allowPartial);
    if (shouldRegenerate && existingSchedulePresent && !confirmRegenerate) {
      setRegenerateConfirmOpen(true);
      return;
    }
    setRegenerateConfirmOpen(false);
    setPendingGenerateMode(modeToUse);
    setPendingCheckedGeneration(null);
    setScheduleCheckMode("checking");
    setScheduleCheckIssues([]);
    setPreflightModalOpen(true);
    setPreflightRunning(true);
    try {
      setGenerationFlowStep("checking_setup");
      setStatus({
        type: "info",
        message: "Checking schedule readiness…",
        suggestions: []
      });
      const preflight = await runPreflightStep({
        intent: shouldRegenerate ? "regenerate_replace" : "incremental_add",
        exactCheck: true,
        schedulingMode: modeToUse
      });
      if (!preflight) return;
      const check = classifyScheduleCheck(preflight);
      if (check.outcome === "blocked") {
        setGenerationResult(null);
        setScheduleCheckIssues(check.blockers);
        setScheduleCheckMode("blocked");
        setPreflightModalOpen(true);
        setStatus({
          type: "warning",
          message: "The schedule cannot be generated until the required items are fixed.",
          suggestions: []
        });
        return;
      }
      const generationOptions = {
        allowPartialCommit: allowPartial,
        isRegeneration: shouldRegenerate,
        schedulingMode: modeToUse,
        workflowMode: options?.workflowMode || "FINAL",
        preflightFingerprint: preflight?.configuration_fingerprint || null
      };
      if (check.outcome === "warning") {
        setPendingCheckedGeneration({ ...generationOptions, continueToProgramSetup: true });
        setScheduleCheckIssues(check.warnings);
        setScheduleCheckMode("warning");
        setPreflightModalOpen(true);
        setStatus({
          type: "warning",
          message: "Review the schedule warnings before continuing.",
          suggestions: []
        });
        return;
      }
      setPendingCheckedGeneration({ ...generationOptions, continueToProgramSetup: true });
      setScheduleCheckIssues([]);
      setScheduleCheckMode("configure_ready");
      setPreflightModalOpen(true);
    } catch (apiError) {
      console.error(apiError);
      setScheduleCheckMode("system_error");
      setScheduleCheckIssues([]);
      setPreflightModalOpen(true);
      setStatus({
        type: "error",
        message: "We couldn't generate the schedule. Please try again.",
        suggestions: []
      });
    } finally {
      setPreflightRunning(false);
      setGenerationFlowStep("idle");
    }
  }, [canGenerateSchedule, generating, normalizedEvents, preflightRunning, resolveSchedulingMode, runPreflightStep, schedulingMode, selectedTournamentId]);
  const handleContinueAfterWarnings = useCallback(async () => {
    if (!pendingCheckedGeneration || generating || preflightRunning) return;
    if (pendingCheckedGeneration.continueToProgramSetup) {
      const nextOptions = { ...pendingCheckedGeneration };
      delete nextOptions.continueToProgramSetup;
      setPendingCheckedGeneration(null);
      await openOfficialProgramSetup(nextOptions);
      return;
    }
    setScheduleCheckMode("generating");
    const response = await performScheduleGeneration(pendingCheckedGeneration);
    if (response) {
      setPreflightModalOpen(false);
      setPendingCheckedGeneration(null);
      setScheduleCheckIssues([]);
    }
  }, [generating, openOfficialProgramSetup, pendingCheckedGeneration, performScheduleGeneration, preflightRunning]);
  useEffect(() => {
    if (!pendingCheckedGeneration?.autoRetryAfterStale || generating || preflightRunning) return;
    const retryOptions = { ...pendingCheckedGeneration };
    delete retryOptions.autoRetryAfterStale;
    setPendingCheckedGeneration(null);
    void performScheduleGeneration(retryOptions).then(response => {
      if (response) {
        setPreflightModalOpen(false);
        setScheduleCheckIssues([]);
      }
    });
  }, [generating, pendingCheckedGeneration, performScheduleGeneration, preflightRunning]);
  const handleRunPreflightCheck = useCallback(async (options = {}) => {
    if (!selectedTournamentId || preflightRunning) return;
    const shouldOpenModal = options?.openModal !== false;
    if (shouldOpenModal) {
      setPreflightModalOpen(true);
    }
    setPreflightRunning(true);
    try {
      const response = await runPreflightStep(options);
      if (!response) return;
      const statusLabel = String(response?.status || "").toUpperCase();
      setStatus({
        type: statusLabel === "BLOCKED" ? "warning" : statusLabel === "WARNING" ? "warning" : "success",
        message: statusLabel === "BLOCKED" ? "Preflight blocked schedule generation." : statusLabel === "WARNING" ? "Preflight completed with warnings." : "Preflight completed. Schedule is ready for generation.",
        suggestions: []
      });
    } catch (apiError) {
      console.error(apiError);
      setStatus({
        type: "error",
        message: normalizeApiDetailMessage(apiError?.response?.data?.detail) || "Failed to run schedule preflight.",
        suggestions: []
      });
    } finally {
      setPreflightRunning(false);
    }
  }, [preflightRunning, runPreflightStep, selectedTournamentId]);
  const handleValidateSchedule = useCallback(async () => {
    try {
      if (!selectedTournamentId || validating) return;
      setValidating(true);
      const payload = await refreshValidationSummary(selectedTournamentId, {
        throwOnError: true,
        skipBracketCheck: true,
      });
      const summary = payload?.summary || {};
      const totalConflicts = Number(summary.total_conflicts || 0);
      const hasConflict = totalConflicts > 0;
      setStatus({
        type: hasConflict ? "warning" : "success",
        message: hasConflict ? `Validation found ${totalConflicts} conflict(s) across the generated tournament schedule.` : "Validation complete. No schedule conflicts detected by backend validator.",
        suggestions: []
      });
    } catch (apiError) {
      setStatus({
        type: "error",
        message: normalizeApiDetailMessage(apiError?.response?.data?.detail) || "Schedule validation failed. Please retry after refreshing schedule data.",
        suggestions: []
      });
      setValidationResult(null);
    } finally {
      setValidating(false);
    }
  }, [refreshValidationSummary, selectedTournamentId, validating]);
  const handleEditSelectedMatch = useCallback(event => {
    if (!event) return;
    const matchId = event.match_id || event.id;
    const startAt = event.start instanceof Date ? event.start : new Date(event.start);
    const endAt = event.end instanceof Date ? event.end : new Date(event.end);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      setStatus({
        type: "error",
        message: "Unable to open schedule editor: current match slot is invalid.",
        suggestions: []
      });
      return;
    }
    const durationMinutes = Math.max(1, Math.round((endAt.getTime() - startAt.getTime()) / (1000 * 60)));
    setEditForm({
      matchId,
      sportName: event.sportDisplayLabel || event.sport || "Match",
      matchLabel: event.matchLabel || event.title || "Match details unavailable",
      eventName: event.eventName || "",
      competitionTypeLabel: event.competitionTypeLabel || "",
      venueId: event.venue_id ? String(event.venue_id) : "",
      date: formatDateInput(startAt),
      startTime: formatTimeInput(startAt),
      endTime: formatTimeInput(endAt),
      durationMinutes
    });
    setEditError("");
    setEditModalOpen(true);
  }, [setStatus]);
  const handleStartSelectedMatch = useCallback(event => {
    if (!event) return;
    // eslint-disable-next-line no-unused-vars
    const matchId = event.match_id || event.id;
    setStatus({
      type: "info",
      message: "Selected match is ready to start. Proceed to live scoring when teams are on deck.",
      suggestions: []
    });
  }, [setStatus]);
  const handleOpenLiveScoring = useCallback(event => {
    const matchId = event?.match_id || event?.id;
    if (!matchId) return;
    navigate(`/coordinator/matches/${matchId}/live-scoring`);
  }, [navigate]);
  const handleEditVenueChange = useCallback(value => {
    setEditForm(prev => ({
      ...prev,
      venueId: value
    }));
  }, []);
  const handleEditDateChange = useCallback(value => {
    setEditForm(prev => ({
      ...prev,
      date: value
    }));
  }, []);
  const handleEditStartChange = useCallback(value => {
    setEditForm(prev => {
      const next = {
        ...prev,
        startTime: value
      };
      const computedStart = combineDateAndTime(prev.date, value);
      if (!computedStart) return next;
      const computedEnd = new Date(computedStart.getTime() + prev.durationMinutes * 60 * 1000);
      next.endTime = formatTimeInput(computedEnd);
      return next;
    });
  }, []);
  const handleEditEndChange = useCallback(value => {
    setEditForm(prev => ({
      ...prev,
      endTime: value
    }));
  }, []);
  const handleCloseEditModal = useCallback(() => {
    if (editSubmitting) return;
    setEditModalOpen(false);
    setEditError("");
  }, [editSubmitting]);
  const handleSubmitEditModal = useCallback(async event => {
    event.preventDefault();
    setEditError("");
    const startAt = combineDateAndTime(editForm.date, editForm.startTime);
    const endAt = combineDateAndTime(editForm.date, editForm.endTime);
    if (!editForm.matchId || !editForm.venueId || !startAt || !endAt) {
      setEditError("Please provide venue, date, start time, and end time.");
      return;
    }
    if (endAt <= startAt) {
      setEditError("Start time must be before end time.");
      return;
    }
    const blockedWindow = findOverlappingProgramBlock(startAt, endAt, calendarBlockedWindows);
    if (blockedWindow) {
      setEditError(buildBlockedMessage(blockedWindow));
      return;
    }
    setEditSubmitting(true);
    const response = await applyReschedule({
      matchId: editForm.matchId,
      start: startAt,
      end: endAt,
      venueId: Number.parseInt(editForm.venueId, 10) || null
    });
    setEditSubmitting(false);
    if (!response) {
      setEditError("Unable to update schedule. Please try again.");
      return;
    }
    if (response.status === "conflict") {
      const conflictText = Array.isArray(response.conflicts) ? response.conflicts.map(conflict => buildHumanConflictMessage(conflict)).filter(Boolean).join(" ") : response.message || "Requested slot conflicts with existing schedule.";
      setEditError(conflictText);
      return;
    }
    setEditModalOpen(false);
    setEditError("");
  }, [applyReschedule, calendarBlockedWindows, editForm]);
  const compactStatusClass = status.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200" : status.type === "warning" ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200" : status.type === "error" ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200" : "border-blue-300 bg-blue-50 text-blue-700 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-200";
  const healthyLive = analytics ? !visibleEvents.some(event => getStatusTone(event.status) === "conflict") : true;
  const showLiveWarningBanner = Boolean(
    status.message && ["success", "warning", "error"].includes(status.type)
  ) || !healthyLive;
  const hasActiveFilters = useMemo(() => selectedSport !== "all" || selectedEventCategory !== "all" || selectedStatus !== "all" || selectedDate !== "all" || selectedVenue !== "all", [selectedDate, selectedEventCategory, selectedSport, selectedStatus, selectedVenue]);
  // eslint-disable-next-line no-unused-vars
  const hasHeatmapData = Boolean(Array.isArray(analytics?.time_slot_heatmap?.matrix) && analytics.time_slot_heatmap.matrix.length > 0);
  const handleViewModeChange = useCallback(nextView => {
    const next = String(nextView || "tournament").toLowerCase();
    setViewMode(next);
    if (next === "tournament" && tournamentStartDate instanceof Date && !Number.isNaN(tournamentStartDate.getTime())) {
      setCalendarDate(new Date(tournamentStartDate));
    }
  }, [tournamentStartDate]);
  const handleClearFilters = useCallback(() => {
    setSelectedSport("all");
    setSelectedEventCategory("all");
    setSelectedStatus("all");
    setSelectedDate("all");
    setSelectedVenue("all");
    setViewMode("tournament");
    if (tournamentStartDate instanceof Date && !Number.isNaN(tournamentStartDate.getTime())) {
      setCalendarDate(new Date(tournamentStartDate));
    }
  }, [tournamentStartDate]);
  useEffect(() => {
    if (selectedSport === "all" || eventCategoryOptions.length === 0) {
      if (selectedEventCategory !== "all") setSelectedEventCategory("all");
      return;
    }
    if (selectedEventCategory !== "all" && !eventCategoryOptions.some(option => option.value === selectedEventCategory)) {
      setSelectedEventCategory("all");
    }
  }, [eventCategoryOptions, selectedEventCategory, selectedSport]);
  // eslint-disable-next-line no-unused-vars
  const handleInsightAction = useCallback(action => {
    if (!action || typeof action !== "object") return;
    if (action.type === "regenerate_spread") {
      setSchedulingMode("SPREAD");
      setPendingGenerateMode("SPREAD");
      void handleGuidedScheduleGeneration({
        schedulingMode: "SPREAD",
        mode: "regenerate"
      });
      return;
    }
    if (action.type === "open_schedule_settings") {
      setStatus({
        type: "info",
        message: "Use the Schedule Style control in the header, then regenerate.",
        suggestions: []
      });
      return;
    }
    if (action.type === "acknowledge_warning" && action.issueKey) {
      setInsightWarningState(prev => ({
        ...(prev || {}),
        [action.issueKey]: "acknowledged"
      }));
      setStatus({
        type: "info",
        message: "Warning acknowledged for this schedule version.",
        suggestions: []
      });
      return;
    }
    if (action.type === "dismiss_warning" && action.issueKey) {
      setInsightWarningState(prev => ({
        ...(prev || {}),
        [action.issueKey]: "dismissed"
      }));
      setStatus({
        type: "info",
        message: "Warning dismissed for this schedule version.",
        suggestions: []
      });
    }
  }, [handleGuidedScheduleGeneration]);
  const hasScheduleRows = normalizedEvents.length > 0;
  const hasDraftSchedule = normalizedEvents.some(event => String(event?.workflow_mode || "").toUpperCase() === "DRAFT" || String(event?.schedule_state || "").toUpperCase() === "DRAFT");
  const hasFinalSchedule = normalizedEvents.some(event => String(event?.workflow_mode || "").toUpperCase() === "FINAL" && String(event?.schedule_state || "").toUpperCase() === "FINAL");
  const hasPublishedSchedule = normalizedEvents.some(event => String(event?.schedule_state || "").toUpperCase() === "PUBLISHED");
  const showValidationSummary = Boolean(activeConflictSummary);
  const hasTournamentSelected = Boolean(selectedTournamentId);
  const tournamentContextKey = selectedWorkspaceId ? String(selectedWorkspaceId) : "all";
  const schedulePageResolving = isSchedulePageResolving({
    tournamentListLoading,
    tournamentContextKey,
    resolvedTournamentContextKey,
    selectedTournamentId,
    presentedTournamentId: presentedScheduleTournamentId,
  });
  const scheduleEmptyState = resolveScheduleEmptyState({
    hasIntramural: Boolean(selectedIntramural),
    hasTournament: hasTournamentSelected,
    hasSchedule: hasScheduleRows,
    canGenerate: canGenerateSchedule && !tournamentAccessLoading,
    preflightStatus: preflightResult?.status,
    blockingCount: Array.isArray(preflightResult?.blocking_issues)
      ? preflightResult.blocking_issues.length
      : 0,
    warningCount: Array.isArray(preflightResult?.warnings)
      ? preflightResult.warnings.length
      : 0,
  });
  const resolveScheduleDestination = useCallback((action) => resolveOperationalDestination(
    action,
    tournamentAccess,
    {
      workspace_id: selectedWorkspaceId,
      tournament_id: selectedTournamentId,
      sport_id: selectedSport === "all"
        ? null
        : normalizedEvents.find(event => event.sportKey === selectedSport)?.sport_id ?? null,
      section: action === "program_blocks" ? "timeline" : undefined
    }
  ), [normalizedEvents, selectedSport, selectedTournamentId, selectedWorkspaceId, tournamentAccess]);
  const handleScheduleResolution = useCallback((issue) => {
    const destination = resolveScheduleDestination(issue?.destination);
    if (destination) navigate(destination);
  }, [navigate, resolveScheduleDestination]);
  const selectedTournamentVenueIds = useMemo(() => normalizeIdList(selectedTournament?.venue_ids), [selectedTournament]);
  const showLegacyVenueFallbackNotice = Boolean(hasTournamentSelected && selectedTournamentVenueIds.length === 0);
  const refreshDisabledReason = !hasTournamentSelected ? "Select a tournament first." : loading ? "Refresh is already running." : "";
  // eslint-disable-next-line no-unused-vars
  const generateDisabledReason = !hasTournamentSelected ? "Select a tournament first." : generating || preflightRunning ? "Scheduler is already running." : "";
  const guidedGenerationBusy = preflightRunning || generating || generationFlowStep !== "idle";
  const guidedGenerationLabel = hasScheduleRows ? "Regenerate Schedule" : "Generate Schedule";
  const guidedGenerationBusyLabel = useMemo(() => {
    if (generationFlowStep === "checking_setup") return "Step 1: Checking setup...";
    if (generationFlowStep === "running_exact_check") return "Step 2: Checking every match...";
    if (generationFlowStep === "generating") return "Step 3: Generating...";
    if (generationFlowStep === "validating_schedule") return "Step 4: Validating...";
    if (generationFlowStep === "refreshing_calendar_issues") return "Step 5: Refreshing issues...";
    return hasScheduleRows ? "Regenerating Schedule..." : "Generating Schedule...";
  }, [generationFlowStep, hasScheduleRows]);
  const popoverDisplayStyle = useMemo(() => {
    if (!activePopover?.anchor) return {
      left: 16,
      top: 16
    };
    const maxWidth = 360;
    const panelWidth = schedulePanelRef.current?.clientWidth || 0;
    const panelHeight = schedulePanelRef.current?.clientHeight || 0;
    const safeLeft = Math.max(8, Math.min(activePopover.anchor.x, Math.max(8, panelWidth - maxWidth - 12)));
    const safeTop = Math.max(8, Math.min(activePopover.anchor.y, Math.max(8, panelHeight - 260)));
    return {
      left: safeLeft,
      top: safeTop
    };
  }, [activePopover]);
  const activePopoverItem = activePopover?.item || null;
  const activePopoverMatchId = activePopoverItem?.match_id || activePopoverItem?.id || null;
  const activePopoverIssueSummary = activePopover?.type === "MATCH" ? activePopoverItem?.issueSummary || {
    highestSeverity: "NONE",
    issues: [],
    recommendedActions: [],
    resolutionOptions: []
  } : null;
  const activePopoverIssueSeverity = String(activePopoverIssueSummary?.highestSeverity || "NONE").toUpperCase();
  const activePopoverIssues = Array.isArray(activePopoverIssueSummary?.issues) ? activePopoverIssueSummary.issues : [];
  const activePopoverPrimaryIssue = activePopoverIssues[0] || null;
  // eslint-disable-next-line no-unused-vars
  const activePopoverRecommendedActions = Array.isArray(activePopoverIssueSummary?.recommendedActions) ? activePopoverIssueSummary.recommendedActions : [];
  const activePopoverResolutionOptions = sortResolutionOptions(Array.isArray(activePopoverIssueSummary?.resolutionOptions) ? activePopoverIssueSummary.resolutionOptions : []);
  // eslint-disable-next-line no-unused-vars
  const activePopoverFirstApplicableOption = activePopoverResolutionOptions.find(option => isAutoApplicableVerifiedOption({
    option,
    matchId: activePopoverMatchId
  })) || null;
  const activePopoverMatchLocked = String(activePopoverItem?.status || "").toUpperCase().includes("COMPLETED") || String(activePopoverItem?.status || "").toUpperCase().includes("FINAL");
  // eslint-disable-next-line no-unused-vars
  const matchStartDisabledReason = activePopover?.type === "MATCH" ? isMatchStartDisabled(activePopoverItem) : "";
  // eslint-disable-next-line no-unused-vars
  const liveScoringDisabledReason = activePopover?.type === "MATCH" ? isLiveScoringDisabled(activePopoverItem) : "";
  const preflightBlockingIssues = useMemo(() => Array.isArray(preflightResult?.blocking_issues) ? preflightResult.blocking_issues : [], [preflightResult]);
  const preflightWarningIssues = useMemo(() => Array.isArray(preflightResult?.warnings) ? preflightResult.warnings : [], [preflightResult]);
  const preflightInfoIssues = useMemo(() => Array.isArray(preflightResult?.info) ? preflightResult.info : [], [preflightResult]);
  const preflightExactStatus = String(preflightResult?.exact_feasibility_status || "NOT_RUN").toUpperCase();

  // Extract exact feasibility issue from warnings if exact check failed
  const exactFeasibilityIssue = useMemo(() => {
    if (preflightExactStatus !== "FAILED") return null;
    return [...preflightBlockingIssues, ...preflightWarningIssues].find(issue => String(issue?.code || "").toUpperCase() === "EXACT_PLACEMENT_FAILED") || null;
  }, [preflightBlockingIssues, preflightExactStatus, preflightWarningIssues]);

  // Extract unscheduled matches from exact feasibility issue
  const exactFeasibilityUnscheduledMatches = useMemo(() => {
    if (!exactFeasibilityIssue?.evidence?.unscheduled_matches) return [];
    return formatUnscheduledMatches(exactFeasibilityIssue.evidence.unscheduled_matches);
  }, [exactFeasibilityIssue]);
  const exactFeasibilityRealMatches = useMemo(() => exactFeasibilityUnscheduledMatches.filter(m => !m.is_placeholder), [exactFeasibilityUnscheduledMatches]);
  const exactFeasibilityPlaceholders = useMemo(() => exactFeasibilityUnscheduledMatches.filter(m => m.is_placeholder), [exactFeasibilityUnscheduledMatches]);
  const hasExactFeasibilityFailure = preflightExactStatus === "FAILED" && exactFeasibilityRealMatches.length > 0;
  const warningIssuesExcludingEstimatedPlacement = useMemo(() => preflightWarningIssues.filter(issue => {
    const code = String(issue?.code || "").toUpperCase();
    return code !== "EXACT_PLACEMENT_NOT_VERIFIED" && code !== "EXACT_PLACEMENT_FAILED";
  }), [preflightWarningIssues]);
  // Generation result unscheduled matches (for after generation)
  const generationUnscheduledReal = useMemo(() => (generationResult?.unscheduled_matches || []).filter(m => !m?.is_placeholder), [generationResult]);
  const generationUnscheduledPlaceholders = useMemo(() => (generationResult?.unscheduled_matches || []).filter(m => Boolean(m?.is_placeholder)), [generationResult]);
  const validationUnscheduledReal = useMemo(() => {
    const rowsByMatchId = new Map();
    const conflicts = Array.isArray(validationResult?.conflicts) ? validationResult.conflicts : [];
    const pushRow = (rawRow, conflict) => {
      const matchId = Number(rawRow?.match_id || rawRow?.id || 0);
      if (!Number.isFinite(matchId) || matchId <= 0) return;
      const code = String(conflict?.code || conflict?.type || rawRow?.reason_code || "NO_VALID_SLOT").toUpperCase();
      const reasonText = String(rawRow?.reason || conflict?.reason || conflict?.message || "No valid slot found under current schedule constraints.").trim();
      const existing = rowsByMatchId.get(Math.trunc(matchId)) || {};
      rowsByMatchId.set(Math.trunc(matchId), {
        ...existing,
        ...rawRow,
        match_id: Math.trunc(matchId),
        reason_code: code,
        reason: reasonText,
        reasonLabel: getReasonLabel(code),
        is_placeholder: Boolean(rawRow?.is_placeholder),
        suggested_fixes: Array.isArray(conflict?.recommended_actions) ? conflict.recommended_actions : [],
        resolution_options: normalizeResolutionOptions([...(Array.isArray(existing?.resolution_options) ? existing.resolution_options : []), ...(Array.isArray(conflict?.resolution_options) ? conflict.resolution_options : [])])
      });
    };
    conflicts.forEach(conflict => {
      const code = String(conflict?.code || conflict?.type || "").toUpperCase();
      if (code !== "MISSING_SCHEDULE_SLOT" && code !== "NO_VALID_SLOT") return;
      const evidence = conflict?.evidence && typeof conflict.evidence === "object" ? conflict.evidence : {};
      const affectedRows = Array.isArray(evidence?.affected_matches) ? evidence.affected_matches : [];
      affectedRows.forEach(row => pushRow(row, conflict));
      if (affectedRows.length > 0) return;
      const ids = collectIssueMatchIds(conflict);
      ids.forEach(matchId => {
        const fallback = validationAffectedMatchById.get(Math.trunc(matchId)) || {};
        pushRow({
          ...fallback,
          match_id: Math.trunc(matchId)
        }, conflict);
      });
    });
    return Array.from(rowsByMatchId.values()).filter(row => !row?.is_placeholder).sort((a, b) => Number(a?.match_id || 0) - Number(b?.match_id || 0));
  }, [validationAffectedMatchById, validationResult]);
  const calendarUnscheduledReal = useMemo(() => {
    const byMatchId = new Map();
    [...exactFeasibilityRealMatches, ...generationUnscheduledReal, ...validationUnscheduledReal].forEach(row => {
      const matchId = Number(row?.match_id || 0);
      if (!Number.isFinite(matchId) || matchId <= 0) return;
      const existing = byMatchId.get(matchId);
      if (!existing) {
        byMatchId.set(matchId, {
          ...row
        });
        return;
      }
      byMatchId.set(matchId, {
        ...existing,
        ...row,
        suggested_fixes: Array.from(new Set([...(Array.isArray(existing?.suggested_fixes) ? existing.suggested_fixes : []), ...(Array.isArray(row?.suggested_fixes) ? row.suggested_fixes : [])])),
        resolution_options: normalizeResolutionOptions([...(Array.isArray(existing?.resolution_options) ? existing.resolution_options : []), ...(Array.isArray(row?.resolution_options) ? row.resolution_options : [])])
      });
    });
    return Array.from(byMatchId.values()).sort((a, b) => Number(a?.match_id || 0) - Number(b?.match_id || 0));
  }, [exactFeasibilityRealMatches, generationUnscheduledReal, validationUnscheduledReal]);
  const calendarUnscheduledPlaceholders = useMemo(() => {
    const byMatchId = new Map();
    [...exactFeasibilityPlaceholders, ...generationUnscheduledPlaceholders].forEach(row => {
      const matchId = Number(row?.match_id || 0);
      if (!Number.isFinite(matchId) || matchId <= 0) return;
      if (!byMatchId.has(matchId)) {
        byMatchId.set(matchId, {
          ...row
        });
      }
    });
    return Array.from(byMatchId.values()).sort((a, b) => Number(a?.match_id || 0) - Number(b?.match_id || 0));
  }, [exactFeasibilityPlaceholders, generationUnscheduledPlaceholders]);
  const matchIssuesByMatchId = useMemo(() => {
    const map = new Map();
    const ensureEntry = matchId => {
      if (!map.has(matchId)) {
        map.set(matchId, {
          highestSeverity: "NONE",
          issues: [],
          recommendedActions: [],
          resolutionOptions: []
        });
      }
      return map.get(matchId);
    };
    const appendIssueForMatch = (matchId, rawIssue, defaultSeverity = "WARNING", source = "validation") => {
      const numericMatchId = Number(matchId);
      if (!Number.isFinite(numericMatchId) || numericMatchId <= 0) return;
      const entry = ensureEntry(numericMatchId);
      const severity = normalizeContractSeverity(rawIssue?.severity || defaultSeverity, Boolean(rawIssue?.blocking) || defaultSeverity === "BLOCKING");
      const normalizedOptions = sortResolutionOptions(normalizeResolutionOptions(rawIssue?.resolution_options || rawIssue?.resolutionOptions || []));
      const normalizedRecommendedActions = Array.isArray(rawIssue?.recommended_actions) ? rawIssue.recommended_actions.map(item => String(item || "").trim()).filter(Boolean) : Array.isArray(rawIssue?.suggested_fixes) ? rawIssue.suggested_fixes.map(item => String(item || "").trim()).filter(Boolean) : [];
      const normalizedIssue = {
        source,
        code: String(rawIssue?.code || "").toUpperCase().trim(),
        category: String(rawIssue?.category || "GENERAL").toUpperCase().trim(),
        severity,
        blocking: severity === "BLOCKING",
        confidence: String(rawIssue?.confidence || "").toUpperCase().trim() || null,
        message: String(rawIssue?.message || rawIssue?.reasonLabel || "").trim(),
        reason: String(rawIssue?.reason || "").trim(),
        evidence: rawIssue?.evidence && typeof rawIssue.evidence === "object" ? rawIssue.evidence : {},
        recommended_actions: normalizedRecommendedActions,
        resolution_options: normalizedOptions
      };
      entry.issues.push(normalizedIssue);
      if ((ISSUE_SEVERITY_PRIORITY[severity] ?? 0) > (ISSUE_SEVERITY_PRIORITY[entry.highestSeverity] ?? 0)) {
        entry.highestSeverity = severity;
      }
      normalizedRecommendedActions.forEach(action => {
        if (!entry.recommendedActions.includes(action)) {
          entry.recommendedActions.push(action);
        }
      });
      normalizedOptions.forEach(option => {
        const key = `${String(option?.option_type || "").toUpperCase()}|${String(option?.label || "").trim()}`;
        if (!entry.resolutionOptions.some(existing => `${String(existing?.option_type || "").toUpperCase()}|${String(existing?.label || "").trim()}` === key)) {
          entry.resolutionOptions.push(option);
        }
      });
    };
    (validationResult?.conflicts || []).forEach(conflict => {
      const matchIds = collectIssueMatchIds(conflict);
      matchIds.forEach(matchId => appendIssueForMatch(matchId, conflict, normalizeContractSeverity(conflict?.severity, Boolean(conflict?.blocking)), "validation"));
    });
    calendarUnscheduledReal.forEach(row => {
      appendIssueForMatch(row?.match_id, {
        code: row?.reason_code || "NO_VALID_SLOT",
        category: "TIME_WINDOW",
        severity: "BLOCKING",
        blocking: true,
        message: row?.reasonLabel || getReasonLabel(row?.reason_code),
        reason: row?.reason || "No valid slot available under current schedule constraints.",
        evidence: {
          reason_code: row?.reason_code || "NO_VALID_SLOT",
          source: "UNSCHEDULED",
          is_placeholder: Boolean(row?.is_placeholder),
          sport_name: row?.sport_name || "",
          round: row?.round || row?.round_name || "",
          team1_id: row?.team1_id ?? null,
          team1_name: row?.team1_name || row?.team1_label || "",
          team2_id: row?.team2_id ?? null,
          team2_name: row?.team2_name || row?.team2_label || "",
          placeholder_label: row?.placeholder_label || "",
          scheduled_start: row?.scheduled_start || null,
          scheduled_end: row?.scheduled_end || null,
          venue_id: row?.venue_id ?? null,
          venue_name: row?.venue_name || ""
        },
        recommended_actions: Array.isArray(row?.suggested_fixes) ? row.suggested_fixes : [],
        resolution_options: row?.resolution_options || []
      }, "BLOCKING", "unscheduled");
    });
    calendarUnscheduledPlaceholders.forEach(row => {
      appendIssueForMatch(row?.match_id, {
        code: row?.reason_code || "PLACEHOLDER_FUTURE_ROUND",
        category: "PLACEHOLDER",
        severity: "INFO",
        blocking: false,
        message: row?.reasonLabel || "Waiting for earlier rounds",
        reason: row?.reason || "This match will be scheduled once earlier-round winners are known.",
        evidence: {
          reason_code: row?.reason_code || "PLACEHOLDER_FUTURE_ROUND",
          source: "PLACEHOLDER",
          is_placeholder: true
        },
        recommended_actions: [],
        resolution_options: row?.resolution_options || []
      }, "INFO", "placeholder");
    });
    const result = {};
    map.forEach((value, key) => {
      result[key] = {
        highestSeverity: value.highestSeverity,
        issues: value.issues,
        recommendedActions: value.recommendedActions,
        resolutionOptions: sortResolutionOptions(value.resolutionOptions)
      };
    });
    return result;
  }, [calendarUnscheduledPlaceholders, calendarUnscheduledReal, validationResult]);
  const normalizedEventsWithIssues = useMemo(() => normalizedEvents.map(event => {
    const matchId = Number(event?.match_id || event?.id || 0);
    const issueSummary = (Number.isFinite(matchId) && matchId > 0 ? matchIssuesByMatchId[matchId] : null) || {
      highestSeverity: "NONE",
      issues: [],
      recommendedActions: [],
      resolutionOptions: []
    };
    return {
      ...event,
      issueSummary,
      highestIssueSeverity: issueSummary.highestSeverity || "NONE"
    };
  }), [matchIssuesByMatchId, normalizedEvents]);
  const visibleEventsWithIssues = useMemo(() => normalizedEventsWithIssues.filter(event => {
    if (selectedSport !== "all" && event.sportKey !== selectedSport) return false;
    if (selectedEventCategory !== "all" && event.eventCategoryKey !== selectedEventCategory) return false;
    if (selectedStatus !== "all" && String(event.status || "") !== selectedStatus) return false;
    if (selectedDate !== "all" && event.dateKey !== selectedDate) return false;
    if (selectedVenue !== "all" && getVenueKey(event) !== selectedVenue) return false;
    return true;
  }), [normalizedEventsWithIssues, selectedDate, selectedEventCategory, selectedSport, selectedStatus, selectedVenue]);
  const realIssueMatchIds = useMemo(() => {
    const ids = new Set();
    calendarUnscheduledReal.forEach(row => {
      const parsed = Number(row?.match_id);
      if (Number.isFinite(parsed) && parsed > 0) ids.add(parsed);
    });
    return Array.from(ids);
  }, [calendarUnscheduledReal]);
  const realUnscheduledIssueCount = realIssueMatchIds.length;
  const fairnessComponents = useMemo(
    () => analytics?.fairness?.components && typeof analytics.fairness.components === "object"
      ? analytics.fairness.components
      : {},
    [analytics?.fairness?.components]
  );
  // eslint-disable-next-line no-unused-vars
  const fairnessConcernItems = useMemo(() => {
    const entries = Object.entries(fairnessComponents || {});
    return entries.map(([key, component]) => {
      const hasData = component?.has_sufficient_data !== false;
      const score = Number(component?.display_score ?? component?.score);
      const lowScore = Number.isFinite(score) && score < 70;
      if (!hasData && !component?.meaning) return null;
      if (!lowScore && hasData) return null;
      return {
        key,
        title: formatSnakeLabel(key),
        hasData,
        score: Number.isFinite(score) ? score : null,
        meaning: String(component?.meaning || "Not enough fairness evidence yet."),
        recommendedAction: String(component?.recommended_action || "Generate or validate more schedule data."),
        status: hasData ? "unresolved" : "guide-only"
      };
    }).filter(Boolean);
  }, [fairnessComponents]);
  const blockingIssueCount = Number(validationResult?.blocking_count ?? conflictSeveritySummary.blocking ?? 0);
  const warningIssueCount = Number(validationResult?.warning_count ?? conflictSeveritySummary.warning ?? 0);
  const issueBadgeCount = Math.max(0, blockingIssueCount) + Math.max(0, warningIssueCount) + Math.max(0, realUnscheduledIssueCount);
  // eslint-disable-next-line no-unused-vars
  const guideOnlySuggestionItems = useMemo(() => {
    const items = [];
    const pushGuideOnly = (match, source) => {
      const options = normalizeResolutionOptions(match?.resolution_options);
      options.forEach(option => {
        const trustLabel = getRecommendationTrustLabel(option);
        const trust = String(trustLabel || "").toUpperCase();
        if (trust !== "GUIDE ONLY" && trust !== "SUGGESTED ACTION") return;
        items.push({
          source,
          matchId: Number(match?.match_id || 0) || null,
          sportName: match?.sport_name || "",
          label: getContextualResolutionTitle(option, match),
          explanation: getResolutionOptionExplanation(option),
          trustLabel,
          status: trust === "SUGGESTED ACTION" ? "unresolved" : "guide-only"
        });
      });
    };
    calendarUnscheduledReal.forEach(match => pushGuideOnly(match, "Unscheduled"));
    return items.slice(0, 16);
  }, [calendarUnscheduledReal]);
  const handlePreflightQuickAction = useCallback(action => {
    if (!action) return;
    if (!action.route) {
      handleRunPreflightCheck({
        openModal: true
      });
      return;
    }
    navigate(action.route);
  }, [handleRunPreflightCheck, navigate]);
  // eslint-disable-next-line no-unused-vars
  const handleReviewTimeAndVenueSetup = useCallback(() => {
    const firstReasonCode = String(exactFeasibilityRealMatches[0]?.reason_code || "").toUpperCase();
    if (firstReasonCode === "NO_COMPATIBLE_VENUE" || firstReasonCode === "VENUE_CAPACITY_EXCEEDED") {
      const destination = resolveScheduleDestination("venues");
      if (destination) navigate(destination);
      return;
    }
    if (firstReasonCode === "SPORT_DURATION_TOO_LONG") {
      navigate("/coordinator/sports");
      return;
    }
    navigate("/coordinator/tournaments");
  }, [exactFeasibilityRealMatches, navigate, resolveScheduleDestination]);
  const scheduledIssueRows = useMemo(() => normalizedEventsWithIssues.filter(event => String(event?.highestIssueSeverity || "NONE").toUpperCase() !== "NONE").map(event => ({
    matchId: Number(event?.match_id || event?.id || 0) || null,
    severity: String(event?.highestIssueSeverity || "NONE").toUpperCase(),
    sport: event?.sport || "Sport",
    teams: event?.matchLabel || event?.title || "Teams pending",
    issueSummary: event?.issueSummary || null,
    issue: event?.issueSummary?.issues?.[0] || null,
    status: event?.status || "Scheduled"
  })), [normalizedEventsWithIssues]);
  const blockingMatchIssueRows = useMemo(() => scheduledIssueRows.filter(row => row.severity === "BLOCKING"), [scheduledIssueRows]);
  const warningMatchIssueRows = useMemo(() => scheduledIssueRows.filter(row => row.severity === "WARNING"), [scheduledIssueRows]);
  const infoMatchIssueRows = useMemo(() => scheduledIssueRows.filter(row => row.severity === "INFO"), [scheduledIssueRows]);
  const handleFocusIssueMatch = useCallback(matchId => {
    const parsed = Number(matchId);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFocusedScheduleTarget(null);
      setStatus({
        type: "info",
        message: "This issue is not tied to a scheduled match yet.",
        suggestions: []
      });
      return;
    }
    closePinnedPopover();
    const target = visibleEventsWithIssues.find(event => Number(event?.match_id || event?.id) === parsed);
    if (!target) {
      const hiddenTarget = normalizedEventsWithIssues.find(event => Number(event?.match_id || event?.id) === parsed);
      setFocusedScheduleTarget(null);
      if (hiddenTarget) {
        setSelectedEvent(hiddenTarget);
        if (hiddenTarget?.start) {
          const hiddenDate = new Date(hiddenTarget.start);
          if (!Number.isNaN(hiddenDate.getTime())) {
            setCalendarDate(hiddenDate);
          }
        }
        const filtersAreActive = selectedSport !== "all" || selectedStatus !== "all" || selectedDate !== "all" || selectedVenue !== "all";
        setStatus({
          type: "info",
          message: filtersAreActive ? "This match is hidden by your current filters, so it cannot be highlighted yet." : "This match is not visible in the current schedule view yet.",
          suggestions: filtersAreActive ? ["Clear or adjust filters to reveal the affected match."] : []
        });
        return;
      }
      const unscheduledTarget = calendarUnscheduledReal.find(event => Number(event?.match_id || event?.id) === parsed);
      if (unscheduledTarget) {
        setStatus({
          type: "info",
          message: "This match is not on the calendar yet because it still needs a valid time and venue.",
          suggestions: ["Use the issue drawer guidance to create a valid slot first."]
        });
        return;
      }
      setStatus({
        type: "info",
        message: "We could not find a calendar event for this issue yet.",
        suggestions: ["This usually means the fix requires setup changes before the match can appear on the calendar."]
      });
      return;
    }
    const nextViewMode = viewMode === "list" ? tournamentStartDate instanceof Date && !Number.isNaN(tournamentStartDate.getTime()) ? "tournament" : "week" : viewMode;
    if (nextViewMode !== viewMode) {
      setViewMode(nextViewMode);
      setStatus({
        type: "info",
        message: "Switched back to Calendar View and highlighted the affected match.",
        suggestions: []
      });
    }
    if (target?.start) {
      const nextDate = new Date(target.start);
      if (!Number.isNaN(nextDate.getTime())) {
        setCalendarDate(nextDate);
      }
    }
    setSelectedEvent(target);
    const nextFocusedTarget = {
      matchId: parsed,
      eventId: target?.id ?? target?.match_id ?? null,
      venueId: target?.venue_id ?? target?.venueId ?? null,
      start: target?.start || null,
      end: target?.end || null,
      issueCode: target?.issueSummary?.issues?.[0]?.code || target?.issueSummary?.issues?.[0]?.type || null,
      createdAt: Date.now()
    };
    setFocusedScheduleTarget(nextFocusedTarget);
    if (focusHighlightTimeoutRef.current) {
      window.clearTimeout(focusHighlightTimeoutRef.current);
    }
    focusHighlightTimeoutRef.current = window.setTimeout(() => {
      setFocusedScheduleTarget(current => current?.createdAt === nextFocusedTarget.createdAt ? null : current);
    }, 6500);
  }, [calendarUnscheduledReal, closePinnedPopover, normalizedEventsWithIssues, selectedDate, selectedSport, selectedStatus, selectedVenue, tournamentStartDate, viewMode, visibleEventsWithIssues]);
  useEffect(() => {
    if (!focusedScheduleTarget || viewMode === "list") return undefined;
    const targetMatchId = Number(focusedScheduleTarget.matchId);
    if (!Number.isFinite(targetMatchId) || targetMatchId <= 0) return undefined;
    const targetVisible = visibleEventsWithIssues.some(event => Number(event?.match_id || event?.id) === targetMatchId);
    if (!targetVisible) return undefined;
    const prefersReducedMotion = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let attemptCount = 0;
    const focusNode = () => {
      if (cancelled) return;
      const node = schedulePanelRef.current?.querySelector?.(`.os-match-event-card[data-match-id="${targetMatchId}"]`);
      if (!node) {
        if (attemptCount < 10) {
          attemptCount += 1;
          focusRevealAttemptRef.current = window.setTimeout(focusNode, 120);
        }
        return;
      }
      if (typeof node.scrollIntoView === "function") {
        node.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "center",
          inline: "nearest"
        });
      }
      if (typeof node.focus === "function") {
        window.requestAnimationFrame(() => {
          node.focus({
            preventScroll: true
          });
        });
      }
    };
    const frameId = window.requestAnimationFrame(focusNode);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      if (focusRevealAttemptRef.current) {
        window.clearTimeout(focusRevealAttemptRef.current);
      }
    };
  }, [focusedScheduleTarget, viewMode, visibleEventsWithIssues]);
  const handleOpenIssueDrawerSection = useCallback((sectionKey = "") => {
    const normalized = String(sectionKey || "").trim();
    setIssueDrawerOpen(true);
    if (!normalized) return;
    window.setTimeout(() => {
      const target = document.querySelector(`[data-issue-section="${normalized}"]`);
      if (target && typeof target.scrollIntoView === "function") {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }, 120);
  }, []);
  const runCommandCenterGenerate = useCallback(() => {
    void handleGuidedScheduleGeneration({
      schedulingMode,
      workflowMode: "FINAL"
    });
  }, [handleGuidedScheduleGeneration, schedulingMode]);
  const openPrimaryIssueSection = useCallback(() => {
    if (hasExactFeasibilityFailure || realUnscheduledIssueCount > 0) {
      handleOpenIssueDrawerSection("unscheduled-matches");
      return;
    }
    if (blockingIssueCount > 0 || warningIssueCount > 0) {
      handleOpenIssueDrawerSection("calendar-conflicts");
      return;
    }
    handleOpenIssueDrawerSection("");
  }, [blockingIssueCount, handleOpenIssueDrawerSection, hasExactFeasibilityFailure, realUnscheduledIssueCount, warningIssueCount]);
  const validationReadyForFinalize = Boolean(validationResult?.can_finalize || validationResult?.valid_for_finalize);
  const commandCenterPrimaryAction = useMemo(() => {
    if (!hasScheduleRows) return null;
    if (hasPublishedSchedule) return null;
    if (guidedGenerationBusy) {
      return {
        label: guidedGenerationLabel,
        busyLabel: guidedGenerationBusyLabel,
        busy: true,
        disabled: true,
        disabledReason: "Scheduler is already running.",
        onClick: null
      };
    }
    return {
      label: "Regenerate Draft",
      busy: false,
      disabled: !canGenerateSchedule || tournamentAccessLoading,
      disabledReason: !canGenerateSchedule
        ? "Schedule generation is available to the Sports Coordinator."
        : tournamentAccessLoading
          ? "Checking schedule access."
          : "",
      onClick: runCommandCenterGenerate
    };
  }, [canGenerateSchedule, guidedGenerationBusy, guidedGenerationBusyLabel, guidedGenerationLabel, hasPublishedSchedule, hasScheduleRows, runCommandCenterGenerate, tournamentAccessLoading]);
  const headerDirectActions = useMemo(() => {
    if (!hasTournamentSelected || !canGenerateSchedule || tournamentAccessLoading) return [];
    return [{
      key: "preflight",
      label: preflightRunning ? "Checking…" : "Run Preflight",
      onClick: () => handleRunPreflightCheck({
        intent: "check_current",
        exactCheck: false,
        openModal: true,
      }),
      disabled: preflightRunning || generating,
      disabledReason: preflightRunning || generating ? "A schedule operation is already running." : "",
    }];
  }, [canGenerateSchedule, generating, handleRunPreflightCheck, hasTournamentSelected, preflightRunning, tournamentAccessLoading]);
  const headerSecondaryActions = useMemo(() => {
    if (!hasScheduleRows) return [];
    const actions = [{
      key: "validate",
      label: validating ? "Validating…" : "Validate",
      onClick: handleValidateSchedule,
      disabled: validating,
      disabledReason: validating ? "Validation is already running." : ""
    }, {
      key: "publish",
      label: hasPublishedSchedule ? "Published" : "Publish Schedule",
      onClick: handlePublishSchedule,
      disabled: hasPublishedSchedule || !hasFinalSchedule || !validationReadyForFinalize || Boolean(validationResult?.has_blocking_issues),
      disabledReason: hasPublishedSchedule ? "The final schedule is already published." : !hasFinalSchedule ? "Generate the final schedule first." : !validationReadyForFinalize || Boolean(validationResult?.has_blocking_issues) ? "Resolve schedule blockers before publishing." : ""
    }];
    const venuesDestination = resolveScheduleDestination("venues");
    if (venuesDestination) {
      actions.push({
        key: "venue-profiles",
        label: "Manage Venues",
        icon: MapPin,
        onClick: () => navigate(venuesDestination),
        disabled: false
      });
    }
    if (issueBadgeCount > 0) {
      actions.push({
        key: "issues",
        label: "Open Issues",
        onClick: openPrimaryIssueSection,
        disabled: false
      });
    }
    return actions;
  }, [handlePublishSchedule, handleValidateSchedule, hasFinalSchedule, hasPublishedSchedule, hasScheduleRows, issueBadgeCount, navigate, openPrimaryIssueSection, resolveScheduleDestination, validationReadyForFinalize, validationResult?.has_blocking_issues, validating]);
  const headerStatusBadges = useMemo(() => {
    const badges = [];
    // Only surface statuses that need user attention. The preflight state has
    // its own compact indicator below the header, so it is intentionally not
    // duplicated here.
    if (hasTournamentSelected && showValidationSummary && !validationReadyForFinalize) {
      badges.push({
        key: "validation-status",
        label: "Validation: Needs Review",
        tone: "warning"
      });
    }
    if (hasPublishedSchedule) {
      badges.push({
        key: "schedule-state",
        label: "Published",
        tone: "success"
      });
    } else if (hasFinalSchedule) {
      badges.push({
        key: "schedule-state",
        label: "Final",
        tone: "info"
      });
    } else if (hasDraftSchedule) {
      badges.push({
        key: "schedule-state",
        label: "Draft",
        tone: "warning"
      });
    }
    return badges;
  }, [hasDraftSchedule, hasFinalSchedule, hasPublishedSchedule, hasTournamentSelected, showValidationSummary, validationReadyForFinalize]);
  const aiExplainerIssues = useMemo(() => {
    const sourceRows = [];
    const pushSource = (issue, source = "preflight", fallback = null) => {
      if (!issue) return;
      sourceRows.push({
        issue,
        source,
        fallback
      });
    };
    preflightBlockingIssues.forEach(issue => pushSource(issue, "preflight"));
    warningIssuesExcludingEstimatedPlacement.forEach(issue => pushSource(issue, "preflight"));
    preflightInfoIssues.forEach(issue => pushSource(issue, "preflight"));
    (Array.isArray(validationResult?.conflicts) ? validationResult.conflicts : []).forEach(issue => pushSource(issue, "validation"));
    exactFeasibilityRealMatches.forEach(match => pushSource({
      code: match?.reason_code || "MISSING_SCHEDULE_SLOT",
      category: "TIME_WINDOW",
      severity: "BLOCKING",
      blocking: true,
      message: match?.reasonLabel || getIssueUserTitle({
        code: match?.reason_code || "MISSING_SCHEDULE_SLOT"
      }),
      reason: match?.reason || "The system could not place this match into a valid time and venue.",
      evidence: match?.evidence || {},
      recommended_actions: Array.isArray(match?.suggested_fixes) ? match.suggested_fixes : [],
      resolution_options: match?.resolution_options || [],
      match_id: match?.match_id ?? null,
      sport_name: match?.sport_name || "",
      venue_id: match?.venue_id ?? null,
      venue_name: match?.venue_name || "",
      fix_targets: match?.fix_targets || []
    }, "exact-unscheduled", match));
    if (!hasExactFeasibilityFailure) {
      calendarUnscheduledReal.forEach(match => pushSource({
        code: match?.reason_code || "MISSING_SCHEDULE_SLOT",
        category: "TIME_WINDOW",
        severity: "BLOCKING",
        blocking: true,
        message: match?.reasonLabel || getIssueUserTitle({
          code: match?.reason_code || "MISSING_SCHEDULE_SLOT"
        }),
        reason: match?.reason || "The system could not place this match into a valid time and venue.",
        evidence: match?.evidence || {},
        recommended_actions: Array.isArray(match?.suggested_fixes) ? match.suggested_fixes : [],
        resolution_options: match?.resolution_options || [],
        match_id: match?.match_id ?? null,
        sport_name: match?.sport_name || "",
        venue_id: match?.venue_id ?? null,
        venue_name: match?.venue_name || "",
        fix_targets: match?.fix_targets || []
      }, "validation-unscheduled", match));
    }
    calendarUnscheduledPlaceholders.forEach(match => pushSource({
      code: match?.reason_code || "PLACEHOLDER_FUTURE_ROUND",
      category: "PLACEHOLDER",
      severity: "INFO",
      blocking: false,
      message: match?.reasonLabel || "Waiting for earlier-round winners.",
      reason: match?.reason || "This future-round match depends on previous match results.",
      evidence: match?.evidence || {},
      recommended_actions: [],
      resolution_options: match?.resolution_options || [],
      match_id: match?.match_id ?? null,
      sport_name: match?.sport_name || "",
      venue_id: match?.venue_id ?? null,
      venue_name: match?.venue_name || ""
    }, "placeholder", match));
    const seen = new Set();
    return sourceRows.map(({
      issue,
      source,
      fallback
    }) => {
      const normalizedIssue = normalizeScheduleIssue(issue);
      const matchId = Number(normalizedIssue?.matchIds?.[0] || issue?.match_id || fallback?.match_id || 0) || null;
      const resolutionOptions = sortResolutionOptions(normalizeResolutionOptions(issue?.resolution_options || fallback?.resolution_options));
      const uniqueKey = `${normalizedIssue.issueKey}|${matchId || "na"}`;
      if (seen.has(uniqueKey)) return null;
      seen.add(uniqueKey);
      return {
        ...normalizedIssue,
        rawIssue: issue,
        issueKey: uniqueKey,
        source,
        actionLabel: getIssueActionLabel(issue),
        quickActions: getIssueQuickActions(issue, selectedTournamentId),
        matchId,
        matchSummary: matchId ? buildFriendlyMatchSummary(matchId, fallback || issue) : null,
        resolutionOptions,
        previewOption: resolutionOptions[0] || null,
        recommendedOption: matchId ? resolutionOptions.find(option => isAutoApplicableVerifiedOption({
          option,
          matchId
        })) || null : null
      };
    }).filter(Boolean).sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority;
      return left.title.localeCompare(right.title);
    });
  }, [buildFriendlyMatchSummary, calendarUnscheduledPlaceholders, calendarUnscheduledReal, exactFeasibilityRealMatches, hasExactFeasibilityFailure, isAutoApplicableVerifiedOption, preflightBlockingIssues, preflightInfoIssues, selectedTournamentId, validationResult?.conflicts, warningIssuesExcludingEstimatedPlacement]);
  // eslint-disable-next-line no-unused-vars
  const topAiExplainerIssues = useMemo(() => aiExplainerIssues.slice(0, 5), [aiExplainerIssues]);
  // eslint-disable-next-line no-unused-vars
  const recommendationCenterItems = useMemo(() => mapRecommendationCenterItems(aiExplainerIssues, {
    getContextualResolutionTitle,
    getResolutionOptionExplanation,
    getRecommendationTrustLabel,
    getRecommendationTrustTone,
    isAutoApplicableVerifiedOption,
  }), [aiExplainerIssues, isAutoApplicableVerifiedOption]);

  const handleOpenAiIssue = useCallback(issue => {
    const code = String(issue?.code || "").toUpperCase();
    if (code === "PLACEHOLDER_FUTURE_ROUND") {
      handleOpenIssueDrawerSection("info-placeholders");
      return;
    }
    if (UNSCHEDULED_ISSUE_CODES.has(code) || code === "EXACT_PLACEMENT_FAILED" || issue?.source?.includes("unscheduled")) {
      handleOpenIssueDrawerSection("unscheduled-matches");
      return;
    }
    handleOpenIssueDrawerSection("calendar-conflicts");
  }, [handleOpenIssueDrawerSection]);
  // eslint-disable-next-line no-unused-vars
  const handleApplyAiIssueRecommendation = useCallback(issue => {
    if (!issue?.recommendedOption || !issue?.matchId) {
      handleOpenAiIssue(issue);
      return;
    }
    void handleApplyRecommendationOption({
      matchId: issue.matchId,
      option: issue.recommendedOption
    });
  }, [handleApplyRecommendationOption, handleOpenAiIssue]);
  // eslint-disable-next-line no-unused-vars
  const handlePreviewAiIssueRecommendation = useCallback(issue => {
    handleOpenAiIssue(issue);
  }, [handleOpenAiIssue]);
  // eslint-disable-next-line no-unused-vars
  const handleNavigateAiIssueFix = useCallback(action => {
    if (!action) return;
    handlePreflightQuickAction(action);
  }, [handlePreflightQuickAction]);
  // eslint-disable-next-line no-unused-vars
  const handleApplyRecommendationCard = useCallback(item => {
    if (!item?.option || !item?.matchId) {
      handleOpenAiIssue(item?.issue);
      return;
    }
    void handleApplyRecommendationOption({
      matchId: item.matchId,
      option: item.option
    });
  }, [handleApplyRecommendationOption, handleOpenAiIssue]);
  // eslint-disable-next-line no-unused-vars
  const handlePreviewRecommendationCard = useCallback(item => {
    handleOpenAiIssue(item?.issue);
  }, [handleOpenAiIssue]);
  // eslint-disable-next-line no-unused-vars
  const handleNavigateRecommendationCard = useCallback(item => {
    if (!item?.quickAction) {
      handleOpenAiIssue(item?.issue);
      return;
    }
    handlePreflightQuickAction(item.quickAction);
  }, [handleOpenAiIssue, handlePreflightQuickAction]);
  const buildDrawerIssueEntry = useCallback((issue, options = {}) => {
    if (!issue) return null;
    const matchId = Number(options.matchId || issue?.match_id || 0) || null;
    const matchSummary = matchId ? buildFriendlyMatchSummary(matchId, options.fallback || issue) : options.matchSummary || null;
    const resolutionOptions = sortResolutionOptions(normalizeResolutionOptions(issue?.resolution_options || options.fallback?.resolution_options || []));
    const safeQuickFixes = resolutionOptions.filter(option => matchId && isAutoApplicableVerifiedOption({
      option,
      matchId
    })).map((option, index) => ({
      key: `${String(issue?.code || "ISSUE")}-${matchId || "na"}-${option.option_type}-${index}`,
      raw: option,
      matchId,
      title: getContextualResolutionTitle(option, options.fallback || matchSummary || issue),
      description: getResolutionOptionExplanation(option),
      meta: option?.impact_summary || option?.expected_effect || "",
      canApply: true
    }));
    const manualFixOptions = resolutionOptions.filter(option => !(matchId && isAutoApplicableVerifiedOption({
      option,
      matchId
    }))).map((option, index) => ({
      key: `${String(issue?.code || "ISSUE")}-${matchId || "na"}-manual-${option.option_type}-${index}`,
      title: getContextualResolutionTitle(option, options.fallback || matchSummary || issue),
      description: getResolutionOptionExplanation(option),
      trustLabel: getRecommendationTrustLabel(option),
      trustTone: getRecommendationTrustTone(option)
    }));
    return {
      key: `${String(issue?.code || "ISSUE")}|${matchId || "na"}|${String(issue?.message || issue?.reason || "")}`,
      issue,
      matchId,
      matchSummary,
      affectedCount: Number(options.affectedCount || 0) || undefined,
      whyHighlights: Array.isArray(options.whyHighlights) ? options.whyHighlights : [],
      affectedMatches: Array.isArray(options.affectedMatches) ? options.affectedMatches : [],
      safeQuickFixes,
      manualFixOptions,
      quickActions: getIssueQuickActions(issue, selectedTournamentId)
    };
  }, [buildFriendlyMatchSummary, isAutoApplicableVerifiedOption, selectedTournamentId]);
  const drawerUnscheduledSource = hasExactFeasibilityFailure ? exactFeasibilityRealMatches : calendarUnscheduledReal;
  const drawerConflictItems = useMemo(() => blockingMatchIssueRows.map(row => buildDrawerIssueEntry(row.issue, {
    matchId: row.matchId,
    fallback: {
      sport_name: row.sport,
      teams_text: row.teams
    }
  })).filter(Boolean), [blockingMatchIssueRows, buildDrawerIssueEntry]);
  const drawerUnscheduledItems = useMemo(() => drawerUnscheduledSource.map(match => buildDrawerIssueEntry({
    code: match?.reason_code || "MISSING_SCHEDULE_SLOT",
    category: "TIME_WINDOW",
    severity: "BLOCKING",
    blocking: true,
    message: match?.reasonLabel || "Match needs a schedule slot.",
    reason: match?.reason || "The system could not place this match into a valid time and venue.",
    evidence: match?.evidence || {},
    recommended_actions: Array.isArray(match?.suggested_fixes) ? match.suggested_fixes : [],
    resolution_options: match?.resolution_options || [],
    match_id: match?.match_id ?? null,
    sport_name: match?.sport_name || "",
    venue_id: match?.venue_id ?? null,
    venue_name: match?.venue_name || "",
    fix_targets: match?.fix_targets || []
  }, {
    matchId: match?.match_id,
    fallback: match,
    whyHighlights: buildUnscheduledDiagnosticNotes(match)
  })).filter(Boolean), [buildDrawerIssueEntry, drawerUnscheduledSource]);
  const drawerWarningItems = useMemo(() => warningMatchIssueRows.map(row => buildDrawerIssueEntry(row.issue, {
    matchId: row.matchId,
    fallback: {
      sport_name: row.sport,
      teams_text: row.teams
    }
  })).filter(Boolean), [warningMatchIssueRows, buildDrawerIssueEntry]);
  const drawerInfoItems = useMemo(() => {
    const fromInfoRows = infoMatchIssueRows.map(row => buildDrawerIssueEntry(row.issue, {
      matchId: row.matchId,
      fallback: {
        sport_name: row.sport,
        teams_text: row.teams
      }
    })).filter(Boolean);
    const fromPlaceholders = calendarUnscheduledPlaceholders.map(match => buildDrawerIssueEntry({
      code: match?.reason_code || "PLACEHOLDER_FUTURE_ROUND",
      category: "PLACEHOLDER",
      severity: "INFO",
      blocking: false,
      message: match?.reasonLabel || "Waiting for earlier-round winners.",
      reason: match?.reason || "This future-round match depends on earlier match winners before it can be scheduled normally.",
      evidence: match?.evidence || {
        is_placeholder: true
      },
      resolution_options: match?.resolution_options || [],
      match_id: match?.match_id ?? null,
      sport_name: match?.sport_name || "",
      venue_id: match?.venue_id ?? null,
      venue_name: match?.venue_name || ""
    }, {
      matchId: match?.match_id,
      fallback: match,
      whyHighlights: ["This future-round match depends on earlier winners, so it behaves differently from a confirmed match."]
    })).filter(Boolean);
    return [...fromInfoRows, ...fromPlaceholders];
  }, [buildDrawerIssueEntry, calendarUnscheduledPlaceholders, infoMatchIssueRows]);
  const drawerSections = useMemo(() => buildIssueDrawerSections({
    conflictItems: drawerConflictItems,
    unscheduledItems: drawerUnscheduledItems,
    warningItems: drawerWarningItems,
    infoItems: drawerInfoItems,
  }), [drawerConflictItems, drawerInfoItems, drawerUnscheduledItems, drawerWarningItems]);
  const issueDrawerFooterActions = useMemo(() => [{
    key: "exact-check",
    label: preflightRunning ? "Running..." : "Run Exact Check Again",
    onClick: () => handleRunPreflightCheck({
      openModal: true,
      exactCheck: true
    }),
    disabled: preflightRunning || !selectedTournamentId,
    primary: true
  }, {
    key: "validate",
    label: validating ? "Validating..." : "Validate Schedule",
    onClick: handleValidateSchedule,
    disabled: validating || !selectedTournamentId,
    primary: false
  }, {
    key: "venues",
    label: "Open Venues",
    onClick: () => {
      const destination = resolveScheduleDestination("venues");
      if (destination) navigate(destination);
    },
    disabled: !resolveScheduleDestination("venues"),
    primary: false
  }, {
    key: "program-blocks",
    label: "Review Program Blocks",
    onClick: () => navigate(`/coordinator/tournaments${selectedTournamentId ? `?focus=${selectedTournamentId}` : ""}`),
    disabled: false,
    primary: false
  }, {
    key: "sports",
    label: "Open Sport Settings",
    onClick: () => navigate("/coordinator/sports"),
    disabled: false,
    primary: false
  }], [handleRunPreflightCheck, handleValidateSchedule, navigate, preflightRunning, resolveScheduleDestination, selectedTournamentId, validating]);
  // -----------------------------
  // Render
  // -----------------------------
  if (schedulePageResolving) {
    return (
      <div
        className="flex min-h-[calc(100vh-8rem)] w-full items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label="Loading schedule"
      >
        <LoaderCircle
          className="animate-spin text-blue-600 motion-reduce:animate-none dark:text-cyan-400"
          size={32}
          aria-hidden="true"
        />
        <span className="sr-only">Loading schedule</span>
      </div>
    );
  }

  return <div className="os-schedule-page-enter os-themed-page flex min-h-full min-w-0 flex-col gap-6 overflow-x-hidden pb-2">
      {isViewingHistorical && <HistoricalBanner />}

      {showLiveWarningBanner ? <section className={`rounded-xl border px-4 py-3 text-sm ${compactStatusClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>{status.message || "Live scheduling updates are healthy."}</p>
            {!healthyLive ? <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-900/30 dark:text-amber-300">
                <AlertTriangle size={11} />
                Monitor conflicts
              </span> : null}
          </div>
          {status.suggestions.length > 0 ? <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {status.suggestions.map((suggestion, index) => <article key={`suggestion-${index}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs text-slate-700 dark:border-slate-700 dark:bg-[var(--surface)] dark:text-slate-200">
                  <p className="font-semibold">Suggested Action</p>
                  <p className="mt-1">
                    {suggestion.label || `${new Date(suggestion.start).toLocaleString()} - ${suggestion.venue_name}`}
                  </p>
                </article>)}
            </div> : null}
        </section> : null}
      <VenueScheduleHeader
        selectedTournament={selectedTournament}
        title="Schedule"
        subtitle="View match dates, venues, and times."
        primaryAction={commandCenterPrimaryAction}
        secondaryActions={headerDirectActions}
        actionsMenu={headerSecondaryActions}
        statusBadges={headerStatusBadges}
      />

      {hasScheduleRows ? <VenueScheduleFilterBar tournaments={tournaments} 
                                                 selectedTournamentId={selectedTournamentId} 
                                                 onSelectTournament={setSelectedTournamentId} 
                                                 minRestMinutes={minRestMinutes} 
                                                 onChangeMinRest={setMinRestMinutes} 
                                                 autoFixOnConflict={autoFixOnConflict} 
                                                 onToggleAutoFix={setAutoFixOnConflict} 
                                                 sportOptions={sportOptions} selectedSport={selectedSport} 
                                                 onSelectSport={setSelectedSport} 
                                                 eventCategoryOptions={eventCategoryOptions} 
                                                 selectedEventCategory={selectedEventCategory} 
                                                 onSelectEventCategory={setSelectedEventCategory} 
                                                 statusOptions={statusOptions} selectedStatus={selectedStatus} 
                                                 onSelectStatus={setSelectedStatus} dateOptions={dateOptions} 
                                                 selectedDate={selectedDate} onSelectDate={setSelectedDate} 
                                                 venueOptions={venueOptions} selectedVenue={selectedVenue} 
                                                 onSelectVenue={setSelectedVenue}
                                                 onRefresh={() => refreshScheduleAndValidation(selectedTournamentId)} 
                                                 refreshing={loading} 
                                                 refreshDisabled={!hasTournamentSelected || loading} 
                                                 refreshDisabledReason={refreshDisabledReason} hasActiveFilters={hasActiveFilters} 
                                                 onClearFilters={handleClearFilters} /> : null}

	      {hasScheduleRows && showLegacyVenueFallbackNotice ? <section className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-semibold">
            No tournament venues are assigned. The scheduler may use global active compatible venues for backward compatibility.
          </p>
          <p className="mt-1">
            Assign tournament-specific venues to tighten scheduling control and reduce cross-tournament venue risk.
          </p>
          <button type="button" onClick={() => {
            const destination = resolveScheduleDestination("venues");
            if (destination) navigate(destination);
          }} className="mt-2 rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-[var(--surface)] dark:text-amber-300 dark:hover:bg-amber-500/10">
            Manage Venues
          </button>
	        </section> : null}

	      <section className="grid min-w-0 max-w-full items-stretch gap-4 overflow-x-hidden">
	        <div
            ref={schedulePanelRef}
            tabIndex={-1}
            className="relative flex min-h-0 min-w-0 max-w-full flex-col gap-3 overflow-x-hidden outline-none"
          >
          {/* {hasTournamentSelected ? (
            <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-[var(--surface)]/95">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Schedule workspace
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Calendar shows where the conflict lives. The AI panel explains why.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300">
                  {viewMode === "list" ? "List View" : "Calendar View"}
                </span>
              </div>
            </section>
           ) : null} */}
          {hasTournamentSelected && !scheduleEmptyState && calendarUnscheduledReal.length > 0 ? <section className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              <p className="font-semibold">
                {calendarUnscheduledReal.length} match{calendarUnscheduledReal.length === 1 ? "" : "es"} are not on the calendar
              </p>
              <p className="mt-1 text-rose-700/90 dark:text-rose-300/90">
                These matches could not be assigned a valid time and venue. They are not shown in the calendar because they have no schedule yet.
              </p>
              <button type="button" onClick={() => handleOpenIssueDrawerSection("unscheduled-matches")} className="mt-2 rounded-md border border-rose-300 bg-white px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:bg-[var(--surface)] dark:text-rose-300 dark:hover:bg-rose-500/10">
                Review Unscheduled Matches
              </button>
            </section> : null}
          {scheduleEmptyState ? <ScheduleEmptyState
              title={scheduleEmptyState.title}
              description={scheduleEmptyState.description}
              actionLabel={scheduleEmptyState.actionLabel || (scheduleEmptyState.canGenerate ? "Generate Schedule" : "")}
              onAction={scheduleEmptyState.key === "blocked"
                ? () => {
                    const issues = Array.isArray(preflightResult?.blocking_issues)
                      ? preflightResult.blocking_issues.map(presentScheduleIssue)
                      : [];
                    setScheduleCheckMode("blocked");
                    setScheduleCheckIssues(issues);
                    setPreflightModalOpen(true);
                  }
                : scheduleEmptyState.canGenerate
                  ? runCommandCenterGenerate
                  : null}
              actionDisabled={guidedGenerationBusy || tournamentAccessLoading}
              loadingLabel={guidedGenerationBusy ? guidedGenerationBusyLabel : ""}
            /> : <ScheduleCalendarWorkspace events={visibleEventsWithIssues} selectedEventId={selectedEvent?.match_id || selectedEvent?.id || null} blockedWindows={visibleTournamentBlocks} focusedIssueTarget={focusedScheduleTarget} editable={!generating && !preflightRunning} minHour={calendarStartHour} maxHour={calendarEndHour} onEventDrop={handleEventDrop} onEventResize={handleEventResize} onSelectEvent={handleCalendarItemSelect} onSelectEmpty={closePinnedPopover} onCalendarItemHover={handleCalendarItemHover} onCalendarItemLeave={handleCalendarItemHoverEnd} onCalendarItemSelect={handleCalendarItemSelect} viewMode={viewMode} onViewModeChange={handleViewModeChange} currentDate={calendarDate} onCurrentDateChange={setCalendarDate} tournamentStartDate={tournamentStartDate} tournamentEndDate={tournamentEndDate} />}

          {activePopoverItem ? <div className="pointer-events-none absolute inset-0 z-30">
              <article className="pointer-events-auto absolute w-full max-w-xs rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-[var(--surface)]" style={popoverDisplayStyle}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {activePopover?.type === "MATCH" ? `${String(activePopoverItem?.team1_label || "Team 1")} vs ${String(activePopoverItem?.team2_label || "Team 2")}` : activePopover?.title || "Schedule item"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{activePopoverItem?.sportDisplayLabel || activePopoverItem?.sport || "Sport"}</span>
                      <span>·</span>
                      <span>{formatTimeRangeLabel(activePopoverItem?.start, activePopoverItem?.end)}</span>
                    </div>
                  </div>
                  {activePopover?.pinned ? <button type="button" onClick={closePinnedPopover} className="shrink-0 rounded-md border border-slate-300 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                      Close
                    </button> : null}
                </div>
                {activePopoverIssueSeverity !== "NONE" ? <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    <AlertTriangle size={11} />
                    {buildIssueTitle(activePopoverPrimaryIssue)}
                  </p> : null}
                {activePopover?.type === "MATCH" ? <button type="button" onClick={() => setEventDetailOpen(true)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue-300 bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20">
                    View Details
                  </button> : null}
              </article>
            </div> : null}
        </div>

			        {/* {hasTournamentSelected ? (
             <AiPreflightResultsPanel
             hasTournamentSelected={hasTournamentSelected}
             hasPreflightResult={Boolean(preflightResult)}
             isRunning={preflightRunning}
             readinessScore={preflightResult?.readiness_score ?? null}
             statusLabel={preflightDisplayStatusLabel || "NOT CHECKED"}
             state={preflightMode}
              summaryMessage={
                 bracketContextLoaded && !hasSchedulableBracket
                   ? scheduleAvailabilityMessage || "Generate brackets first before running schedule checks."
                   : preflightStatusExplanation || "Run a readiness check before generating the schedule."
               }
             exactStatus={formatSnakeLabel(preflightExactStatus)}
             confidenceLabel={preflightConfidenceLabel}
             lastCheckedLabel={formatPreflightTimestamp(preflightResult?.last_checked_at)}
             stale={preflightStale}
             counts={{
               blocking: readinessBlockingCount,
               warnings: readinessWarningCount,
               info: readinessInfoCount,
             }}
             topIssues={topAiExplainerIssues}
             realUnscheduledCount={exactFeasibilityRealMatches.length || realUnscheduledIssueCount}
             onRunAgain={rerunAiPanelPreflight}
             onOpenIssue={handleOpenAiIssue}
             onOpenIssueDrawer={openPrimaryIssueSection}
             onApplyRecommendation={handleApplyAiIssueRecommendation}
             onPreviewRecommendation={handlePreviewAiIssueRecommendation}
             onNavigateToFix={handleNavigateAiIssueFix}
            >
             <VenueProfilesPanel
               venues={venuePreview}
               availabilityByVenueId={availabilityByVenueId}
               onManageVenues={() => {
                 const destination = resolveScheduleDestination("venues");
                 if (destination) navigate(destination);
               }}
               compact
             />
             </AiPreflightResultsPanel>
            ) : null} */}
	      </section>

{/* 
               <AiRecommendationCenter
                 items={recommendationCenterItems}
                 actionLoading={actionLoading}
                 onApply={handleApplyRecommendationCard}
                 onPreview={handlePreviewRecommendationCard}
                 onNavigate={handleNavigateRecommendationCard}
               />
 
               <ScheduleHealthSummary
                 summary={activeConflictSummary}
                 canFinalize={validationResult?.can_finalize}
                 validForFinalize={validationResult?.valid_for_finalize}
                 hasBlockingIssues={Boolean(validationResult?.has_blocking_issues) || realUnscheduledIssueCount > 0}
                 validating={validating}
                 onValidate={handleValidateSchedule}
                 onOpenSection={handleOpenIssueDrawerSection}
               />
 
               {hasHeatmapData ? (
                 <ScheduleHeatmap
                   heatmap={analytics?.time_slot_heatmap}
                   title="Scheduled Matches by Day and Hour"
                 />
	               ) : null} */}

      <ScheduleIssueModal actionLoading={actionLoading} drawerSections={drawerSections} handleApplyRecommendationOption={handleApplyRecommendationOption} handleFocusIssueMatch={handleFocusIssueMatch} handlePreflightQuickAction={handlePreflightQuickAction} issueDrawerFooterActions={issueDrawerFooterActions} issueDrawerOpen={issueDrawerOpen} schedulePanelRef={schedulePanelRef} setIssueDrawerOpen={setIssueDrawerOpen} />

      <VenueProfilesModal availabilityByVenueId={availabilityByVenueId} navigate={navigate} schedulePanelRef={schedulePanelRef} setVenueDrawerOpen={setVenueDrawerOpen} venueDrawerOpen={venueDrawerOpen} venuePreview={venuePreview} venueUsageCountByVenueId={venueUsageCountByVenueId} />

      <MatchDetailModal actionLoading={actionLoading} activePopoverMatchLocked={activePopoverMatchLocked} formatTimeRangeLabel={formatTimeRangeLabel} getRecommendationActionLabel={getRecommendationActionLabel} handleApplyRecommendationOption={handleApplyRecommendationOption} handleEditSelectedMatch={handleEditSelectedMatch} handleOpenLiveScoring={handleOpenLiveScoring} handleStartSelectedMatch={handleStartSelectedMatch} schedulePanelRef={schedulePanelRef} setEventDetailOpen={setEventDetailOpen} />

      <GenerationHelpModal generationHelpOpen={generationHelpOpen} setGenerationHelpOpen={setGenerationHelpOpen} />

      <RegenerateConfirmModal
        analytics={analytics}
        guidedGenerationBusy={guidedGenerationBusy}
        guidedGenerationBusyLabel={guidedGenerationBusyLabel}
        handleGuidedScheduleGeneration={handleGuidedScheduleGeneration}
        normalizedEvents={normalizedEvents}
        regenerateConfirmOpen={regenerateConfirmOpen}
        schedulingMode={schedulingMode}
        setRegenerateConfirmOpen={setRegenerateConfirmOpen}
        validationResult={validationResult}
      />

      <ScheduleCheckDialog
        open={preflightModalOpen}
        mode={scheduleCheckMode}
        issues={scheduleCheckIssues}
        busy={generating || preflightRunning}
        onClose={() => {
          if (generating || preflightRunning) return;
          setPreflightModalOpen(false);
          setPendingCheckedGeneration(null);
        }}
        onContinue={handleContinueAfterWarnings}
        onResolution={handleScheduleResolution}
        continueLabel={pendingCheckedGeneration?.continueToProgramSetup ? "Continue" : undefined}
      />

      <EditScheduleModal editError={editError} editForm={editForm} editModalOpen={editModalOpen} editSubmitting={editSubmitting} handleCloseEditModal={handleCloseEditModal} handleEditDateChange={handleEditDateChange} handleEditEndChange={handleEditEndChange} handleEditStartChange={handleEditStartChange} handleEditVenueChange={handleEditVenueChange} handleSubmitEditModal={handleSubmitEditModal} />

      <ProgramBlockModal editingProgramBlockId={editingProgramBlockId} formatProgramBlockTypeLabel={formatProgramBlockTypeLabel} getProgramBlockTypeTone={getProgramBlockTypeTone} handleCloseProgramBlockManager={handleCloseProgramBlockManager} handleDeleteProgramBlock={handleDeleteProgramBlock} handleEditProgramBlock={handleEditProgramBlock} handleSaveProgramBlockEdit={handleSaveProgramBlockEdit} isProgramBlockModalOpen={isProgramBlockModalOpen} isSportsCoordinator={Boolean(isSportsCoordinator && !isViewingHistorical && !selectedTournament?.is_started && !selectedTournament?.is_archived && !normalizedEvents.some(event => String(event?.schedule_state || "").toUpperCase() === "PUBLISHED"))} navigate={navigate} programBlockDraft={programBlockDraft} programBlockSubmitting={programBlockSubmitting} programBlocks={programBlocks} resetProgramBlockDraft={resetProgramBlockDraft} setProgramBlockDraft={setProgramBlockDraft} setupMode={programSetupMode} setupRows={programSetupRows} setupErrors={programSetupErrors} setupLocked={Boolean(isViewingHistorical || selectedTournament?.is_started || selectedTournament?.is_archived || normalizedEvents.some(event => String(event?.schedule_state || "").toUpperCase() === "PUBLISHED"))} onSetupRowChange={handleProgramSetupRowChange} onSetupBack={handleCloseProgramBlockManager} onSetupContinue={handleProgramSetupContinue} />
    </div>;
};
export default Schedules;
