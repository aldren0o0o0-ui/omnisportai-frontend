import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GitBranch, Zap, CheckCircle2, AlertCircle, ZoomIn, ZoomOut, Scan, RotateCcw, Calendar, MapPin, ChevronDown, Sparkles } from "lucide-react";
import ModernBracketView from "../../components/brackets/ModernBracketView";
import EntryReadinessPanel from "../../components/brackets/EntryReadinessPanel";
import ManualSeedingModal from "../../components/brackets/coordinator/ManualSeedingModal";
import RaceStageProgressionWorkspace from "../../components/brackets/RaceStageProgressionWorkspace";
import { TeamLogo } from "../../components/common/IdentityImage";
import PageHeaderCard from "../../components/common/PageHeaderCard";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import DashboardCard from "../../components/common/DashboardCard";
import AppModal from "../../components/common/AppModal";
import {
  getBracketMatches,
  getBrackets,
  activateBracket,
  activateAllBrackets,
  generateBracket,
  previewBracket,
  generateAllBrackets,
  getBracketGenerationReadiness,
  getManualSeedingCandidates,
  upsertBracketConfiguration,
} from "../../services/bracketService";
import { getSportEntryReadiness } from "../../services/competitionEntryService";
import { getSports } from "../../services/sportService";
import { getTournaments } from "../../services/tournamentService";
import { getMatchEventConfig, migrateMatchTemplate } from "../../services/matchEventService";
import { useWorkspace } from "../../context/WorkspaceContext";
import { HistoricalBanner } from "../../components/intramural";
import ConfigLockedModal from "../../components/matches/ConfigLockedModal";
import ConfigStatusBadge from "../../components/matches/ConfigStatusBadge";
import { formatStatusLabel } from "../../components/common/statusLabels";
import {
  buildBracketTargetLabel,
  formatParticipantShapeLabel,
  getMatchParticipantLabel,
  hasResolvedMatchParticipants,
  getCleanEventOptionLabel,
  formatBracketFormatLabel,
  formatSeedingModeLabel,
  isNonBracketEvent,
} from "../../components/brackets/utils/bracketTargets";

// Status badge colour map for coordinator bracket list
const BRACKET_STATUS_CLASSES = {
  DRAFT: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-700/60 dark:text-slate-300 dark:border-slate-600",
  GENERATED: "bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/40",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/40",
  COMPLETED: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/40",
  TRASHED: "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/40",
};

const MATCH_STATUS_CHIP_CLASSES = {
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
  ACTIVE: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200",
  ONGOING: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200",
  LIVE: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200",
  GENERATED: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-200",
  SCHEDULED: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
};

const toTitleFromToken = (rawValue) =>
  String(rawValue || "")
    .trim()
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatSeedSourceLabel = (rawSource, fallbackSeedingMode = "RANDOM", bracketFormat = "") => {
  const sourceKey = String(rawSource || "").trim().toUpperCase();
  const modeKey = String(fallbackSeedingMode || "").trim().toUpperCase();
  const formatKey = String(bracketFormat || "").trim().toUpperCase();

  if (sourceKey && !["UNKNOWN", "N/A", "NONE", "UNSPECIFIED"].includes(sourceKey)) {
    if (sourceKey === "MANUAL") return formatKey === "ROUND_ROBIN" ? "Manual Order" : "Manual";
    if (sourceKey === "RANDOM") return "Random Draw";
    if (sourceKey === "PREVIOUS_RANKING") return "Previous Tournament Ranking";
    return toTitleFromToken(sourceKey);
  }

  if (modeKey === "MANUAL") return formatKey === "ROUND_ROBIN" ? "Manual Order" : "Manual";
  if (modeKey === "RANDOM") return "Random Draw";
  if (modeKey === "PREVIOUS_RANKING") return "Previous Tournament Ranking";
  if (modeKey === "DEPARTMENT_SEPARATION" || modeKey === "SYSTEM_BALANCED") return "System Balanced";
  return "System Assigned";
};

const normalizeSetupSeedingMethod = (setupValue, engineValue) => {
  const setup = String(setupValue || "").trim().toUpperCase();
  if (setup) return setup;
  const engine = String(engineValue || "").trim().toLowerCase();
  if (engine === "manual") return "MANUAL";
  if (engine === "ranking") return "PREVIOUS_RANKING";
  return "RANDOM";
};

const humanizeBracketConflictMessage = (rawMessage) => {
  const message = String(rawMessage || "").trim();
  if (!message) return "";

  return message
    .replace(/\bsingle_elimination\b/gi, "single elimination")
    .replace(/\bdouble_elimination\b/gi, "double elimination")
    .replace(/\bround_robin\b/gi, "round robin")
    .replace(/valid approved entries/gi, "approved participants")
    .replace(/approved entries exist yet/gi, "approved teams or entries exist yet")
    .replace(/tournament sport/gi, "sport")
    .replace(/competition entries/gi, "teams or entries");
};

const extractConflictBlockers = (payload) => {
  const blockers = [];
  const pushMessage = (entry) => {
    if (!entry) return;
    if (typeof entry === "string") {
      const message = humanizeBracketConflictMessage(entry);
      if (message) blockers.push(message);
      return;
    }
    const message = humanizeBracketConflictMessage(entry?.message || entry?.detail || "");
    if (message) blockers.push(message);
  };

  if (Array.isArray(payload?.blockers)) payload.blockers.forEach(pushMessage);
  if (Array.isArray(payload?.readiness?.issues)) {
    payload.readiness.issues.forEach(pushMessage);
  }
  if (Array.isArray(payload?.error?.blockers)) payload.error.blockers.forEach(pushMessage);
  return Array.from(new Set(blockers));
};

const formatBracketGenerationError = (error, workflowMode = "FINAL") => {
  const status = Number(error?.response?.status || 0);
  const detail = error?.response?.data?.detail;
  const normalizedWorkflowMode = String(workflowMode || "FINAL").toUpperCase();
  const fallback =
    normalizedWorkflowMode === "DRAFT"
      ? "Draft bracket could not be generated. Please review the selected sport setup and try again."
      : "Final bracket could not be generated yet. Please review the sport readiness and try again.";

  if (typeof detail === "string") {
    const message = humanizeBracketConflictMessage(detail);
    return status === 409 && message
      ? `${message} Complete the missing registration/approval work, then try Generate Bracket again.`
      : message || fallback;
  }

  const payload = detail?.error || detail;
  if (!payload || typeof payload !== "object") return fallback;

  const code = String(payload.code || "").trim().toUpperCase();
  const blockers = extractConflictBlockers(payload);
  const primaryBlocker = blockers[0] || "";
  const rawMessage = humanizeBracketConflictMessage(payload.message || "");
  const readiness = payload.readiness || {};
  const validEntries = Number(readiness.valid_entries_count);
  const approvedCount = Number(readiness.approved_count);
  const countText = Number.isFinite(validEntries)
    ? `There ${validEntries === 1 ? "is" : "are"} ${validEntries} approved participant${validEntries === 1 ? "" : "s"} ready.`
    : Number.isFinite(approvedCount)
      ? `There ${approvedCount === 1 ? "is" : "are"} ${approvedCount} approved submission${approvedCount === 1 ? "" : "s"} so far.`
      : "";

  if (code === "ENTRY_READINESS_NOT_READY") {
    return [
      "Final bracket is not ready yet.",
      countText,
      primaryBlocker,
      "Approve the required teams or entries first, then try Generate Bracket again.",
    ].filter(Boolean).join(" ");
  }

  if (code === "LIFECYCLE_READINESS_BLOCKED") {
    return [
      "Bracket generation is not ready yet.",
      primaryBlocker || rawMessage,
      "Open Teams or Intramural Setup to finish the missing requirement.",
    ].filter(Boolean).join(" ");
  }

  if (status === 409 && primaryBlocker) {
    return `${primaryBlocker} Complete the missing requirement, then try Generate Bracket again.`;
  }

  return rawMessage || fallback;
};

const formatBracketActivationError = (error) => {
  const status = Number(error?.response?.status || 0);
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return humanizeBracketConflictMessage(detail) || "This bracket cannot be activated yet.";
  }

  const payload = detail?.error || detail;
  if (!payload || typeof payload !== "object") {
    return status === 400
      ? "No eligible brackets are ready to activate."
      : "This bracket cannot be activated yet.";
  }

  const blockers = extractConflictBlockers(payload);
  const primaryBlocker = blockers[0] || humanizeBracketConflictMessage(payload.message || "");
  const isPlanningStateBlocker =
    String(payload.code || "").toUpperCase() === "LIFECYCLE_READINESS_BLOCKED"
    && blockers.some((entry) => /activate brackets.+planning/i.test(String(entry || "")));

  if (isPlanningStateBlocker) {
    return "Close registration first before activating brackets. Open the coordinator Dashboard and use the registration action.";
  }

  return primaryBlocker || "This bracket cannot be activated yet.";
};

const shuffleIds = (ids) => {
  const next = ids.slice();
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
  }
  return next;
};

const isPowerOfTwo = (value) => value > 0 && (value & (value - 1)) === 0;

const nextPowerOfTwo = (value) => {
  let power = 1;
  while (power < value) power *= 2;
  return power;
};

const toMillisSafe = (rawValue) => {
  if (!rawValue) return 0;
  const parsed = new Date(rawValue).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const isActiveTournament = (row) => {
  const status = String(row?.status || "").trim().toLowerCase();
  const archived = Boolean(row?.is_archived);
  return !archived && status !== "archived";
};

const isStartedTournament = (row) => {
  const lifecycle = String(row?.lifecycle_status || "").trim().toLowerCase();
  return Boolean(row?.is_started) || lifecycle === "started";
};

const pickPreferredTournamentId = (rows) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const activeRows = safeRows.filter(isActiveTournament);
  const startedActiveRows = activeRows.filter(isStartedTournament);
  const candidates = startedActiveRows.length > 0 ? startedActiveRows : activeRows;
  if (candidates.length === 0) return 0;
  const sorted = candidates
    .slice()
    .sort((left, right) => {
      const leftStartedAt = toMillisSafe(left?.started_at);
      const rightStartedAt = toMillisSafe(right?.started_at);
      if (rightStartedAt !== leftStartedAt) return rightStartedAt - leftStartedAt;
      const leftStartDate = toMillisSafe(left?.start_date);
      const rightStartDate = toMillisSafe(right?.start_date);
      if (rightStartDate !== leftStartDate) return rightStartDate - leftStartDate;
      return Number(right?.id || 0) - Number(left?.id || 0);
    });
  const id = Number(sorted[0]?.id || 0);
  return Number.isFinite(id) && id > 0 ? id : 0;
};

const buildFirstRoundSeedPairings = (bracketSize) => {
  if (!Number.isFinite(bracketSize) || bracketSize < 2 || !isPowerOfTwo(bracketSize)) {
    return [];
  }
  let pairings = [[1, 2]];
  let currentSize = 2;
  while (currentSize < bracketSize) {
    const nextSize = currentSize * 2;
    const nextPairings = [];
    pairings.forEach(([seedA, seedB], index) => {
      if (index % 2 === 0) {
        nextPairings.push([seedA, (nextSize + 1) - seedA]);
        nextPairings.push([seedB, (nextSize + 1) - seedB]);
      } else {
        nextPairings.push([seedB, (nextSize + 1) - seedB]);
        nextPairings.push([seedA, (nextSize + 1) - seedA]);
      }
    });
    pairings = nextPairings;
    currentSize = nextSize;
  }
  return pairings;
};

const buildSeedPositionOrder = (bracketSize) => {
  const pairings = buildFirstRoundSeedPairings(bracketSize);
  return pairings.flat();
};

const buildLocalFirstRoundPreview = (orderedTeams, allowByes = true) => {
  if (!Array.isArray(orderedTeams) || orderedTeams.length < 2) return [];
  const bracketSize = allowByes ? nextPowerOfTwo(orderedTeams.length) : orderedTeams.length;
  const seedOrder = buildSeedPositionOrder(bracketSize);
  if (seedOrder.length === 0) return [];
  const slotTeams = seedOrder.map((seedNumber) => orderedTeams[seedNumber - 1] || null);
  const preview = [];
  for (let index = 0; index < slotTeams.length; index += 2) {
    const teamA = slotTeams[index];
    const teamB = slotTeams[index + 1];
    const labelA = teamA?.team_name || (teamA?.team_id ? "Unnamed team" : "BYE");
    const labelB = teamB?.team_name || (teamB?.team_id ? "Unnamed team" : "BYE");
    preview.push(`${labelA} vs ${labelB}`);
  }
  return preview;
};

const buildBracketTargetKey = (sportId, tournamentSportEventId = null) =>
  `${Number(sportId || 0)}:${tournamentSportEventId == null ? "default" : Number(tournamentSportEventId)}`;

const isManualSeedingReadinessBlocker = (value) => {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return false;
  const mentionsSeed = text.includes("seed");
  const mentionsManual = text.includes("manual");
  const mentionsOrder = text.includes("order");
  return mentionsSeed || (mentionsManual && mentionsOrder);
};

const BRACKET_STATUS_PRIORITY = {
  COMPLETED: 5,
  ACTIVE: 4,
  FINALIZED: 4,
  GENERATED: 3,
  DRAFT: 2,
};

const compareBracketPreference = (left, right) => {
  const leftStatus = String(left?.status || "").trim().toUpperCase();
  const rightStatus = String(right?.status || "").trim().toUpperCase();
  const leftScore = BRACKET_STATUS_PRIORITY[leftStatus] ?? 0;
  const rightScore = BRACKET_STATUS_PRIORITY[rightStatus] ?? 0;
  if (rightScore !== leftScore) return rightScore - leftScore;

  const rightUpdatedAt = toMillisSafe(right?.updated_at || right?.created_at);
  const leftUpdatedAt = toMillisSafe(left?.updated_at || left?.created_at);
  if (rightUpdatedAt !== leftUpdatedAt) return rightUpdatedAt - leftUpdatedAt;

  return Number(right?.id || 0) - Number(left?.id || 0);
};

const CoordinatorBrackets = ({
  readOnly = false,
  pageTitle = "Tournament Brackets",
  pageSubtitle = "",
  introContent = null,
  allowLiveScoringActions = false,
  liveScoringSportIds = null,
  liveScoringBasePath = "/coordinator",
  matchViewerBasePath = liveScoringBasePath,
  targetScopedManagement = false,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedIntramural, isViewingHistorical } = useWorkspace();
  const selectedWorkspaceId = selectedIntramural?.id ?? null;
  const [brackets, setBrackets] = useState([]);
  const [selectedBracketId, setSelectedBracketId] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [lockedModalMatch, setLockedModalMatch] = useState(null);
  const [detailDrawerMatch, setDetailDrawerMatch] = useState(null);
  const [migrationPreview, setMigrationPreview] = useState(null);
  const [migrationError, setMigrationError] = useState("");
  const [isReviewingMigration, setIsReviewingMigration] = useState(false);
  const [isResolvingMigration, setIsResolvingMigration] = useState(false);
  const requestedTournamentId = Number(searchParams.get("tournament_id") || 0);
  const [resolvedTournamentId, setResolvedTournamentId] = useState(0);
  const bracketRequestSequenceRef = useRef(0);

  // --- Coordinator activation state ---
  const [, setSports] = useState([]);
  const [activationSportId, setActivationSportId] = useState("");
  const [activationBusy, setActivationBusy] = useState(false);
  const [activationResult, setActivationResult] = useState(null);
  const [activationError, setActivationError] = useState("");
  const [showConfirmAll, setShowConfirmAll] = useState(false);
  const [singleActivatingId, setSingleActivatingId] = useState(null);
  const [generationSportId, setGenerationSportId] = useState("");
  const [generationBusy, setGenerationBusy] = useState(false);
  const [generationReadiness, setGenerationReadiness] = useState(null);
  const [, setEntryReadiness] = useState(null);
  const [, setEntryReadinessLoading] = useState(false);
  const [, setEntryReadinessError] = useState("");
  const [manualSeedingBusy, setManualSeedingBusy] = useState(false);
  const [manualSeedingSaveBusy, setManualSeedingSaveBusy] = useState(false);
  const [manualCandidates, setManualCandidates] = useState([]);
  const [manualSeedOrderIds, setManualSeedOrderIds] = useState([]);
  const [manualConfigSeedIds, setManualConfigSeedIds] = useState([]);
  const [manualSeedingError, setManualSeedingError] = useState("");
  const [manualMissingTeamId, setManualMissingTeamId] = useState("");
  const [seedModalError, setSeedModalError] = useState("");
  const manualSeedingSectionRef = useRef(null);
  const [bracketZoom, setBracketZoom] = useState(1);
  const [matchSearch, setMatchSearch] = useState("");
  const [isManualSeedModalOpen, setIsManualSeedModalOpen] = useState(false);
  const [autoTournamentResolving, setAutoTournamentResolving] = useState(false);
  const [seedCloseConfirmOpen, setSeedCloseConfirmOpen] = useState(false);
  const [generateReadyOnlyModalOpen, setGenerateReadyOnlyModalOpen] = useState(false);
  const [showBracketSetup, setShowBracketSetup] = useState(false);
  const [raceHeatsModalTrigger, setRaceHeatsModalTrigger] = useState(0);
  const [generationFormatByTarget, setGenerationFormatByTarget] = useState({});
  const [bracketPreview, setBracketPreview] = useState(null);
  const [bracketPreviewBusy, setBracketPreviewBusy] = useState(false);
  const [bracketPreviewError, setBracketPreviewError] = useState("");
  const previewRequestSequenceRef = useRef(0);
  const isReadOnlyMode = Boolean(readOnly);
  const canManageBrackets = !isReadOnlyMode;
  const canManageGlobalBrackets = canManageBrackets && !targetScopedManagement;
  const canOpenLiveScoringFromPage = !isReadOnlyMode || Boolean(allowLiveScoringActions);

  const visibleBrackets = useMemo(() => {
    const safeRows = Array.isArray(brackets) ? brackets : [];
    if (resolvedTournamentId <= 0) return [];
    return safeRows.filter(
      (entry) => Number(entry?.tournament_id || 0) === resolvedTournamentId
    );
  }, [brackets, resolvedTournamentId]);
  const generationTournamentId = resolvedTournamentId;
  const bracketStatusesBySportId = useMemo(() => {
    const map = new Map();
    (Array.isArray(visibleBrackets) ? visibleBrackets : []).forEach((entry) => {
      const tournamentId = Number(entry?.tournament_id || 0);
      if (generationTournamentId > 0 && tournamentId !== generationTournamentId) return;
      const targetKey = buildBracketTargetKey(
        entry?.sport_id,
        entry?.tournament_sport_event_id ?? null
      );
      const status = String(entry?.status || "").trim().toUpperCase();
      if (!status) return;
      if (!map.has(targetKey)) map.set(targetKey, new Set());
      map.get(targetKey).add(status);
    });
    return map;
  }, [generationTournamentId, visibleBrackets]);
  const generationSports = useMemo(() => {
    const rows = Array.isArray(generationReadiness?.rows) ? generationReadiness.rows : [];
    return rows
      .map((row) => ({
        sportId: Number(row?.sport_id || 0),
        sportName: String(row?.sport_name || "").trim(),
        tournamentSportEventId:
          row?.tournament_sport_event_id == null
            ? null
            : Number(row.tournament_sport_event_id),
        eventName: String(row?.event_name || "").trim(),
        eventKey: String(row?.event_key || "").trim().toLowerCase(),
        participantShape: String(row?.participant_shape || "").trim().toUpperCase(),
        targetLabel: buildBracketTargetLabel({
          sportName: String(row?.sport_name || "").trim(),
          eventName: String(row?.event_name || "").trim(),
          eventKey: String(row?.event_key || "").trim().toLowerCase(),
        }),
        targetKey: buildBracketTargetKey(
          row?.sport_id,
          row?.tournament_sport_event_id ?? null
        ),
        isReady: Boolean(row?.is_ready),
        blockers: Array.isArray(row?.blockers) ? row.blockers : [],
        warnings: Array.isArray(row?.warnings) ? row.warnings : [],
        bracketFormat: String(row?.bracket_format || "").trim().toUpperCase(),
        seedingMethod: String(row?.seeding_method || "").trim().toUpperCase(),
        engineSeedingMethod: String(row?.engine_seeding_method || "").trim().toLowerCase(),
        engineBracketFormat: String(row?.engine_bracket_format || "").trim().toLowerCase(),
        supportedFormats: Array.isArray(row?.supported_formats)
          ? row.supported_formats.map((format) => String(format || "").trim().toLowerCase()).filter(Boolean)
          : [],
        currentGeneratedFormat: String(row?.current_generated_format || "").trim().toLowerCase() || null,
        formatLocked: Boolean(row?.format_locked),
        lockReason: String(row?.lock_reason || "").trim(),
        approvedParticipantCount: Number(row?.valid_entries_count || row?.teams_or_units || 0),
        targetName: String(row?.target_name || "").trim(),
        engineType: String(row?.engine_type || "").trim().toUpperCase(),
        executionFormat: String(row?.execution_format || "").trim().toUpperCase(),
        isBracketAllowed: row?.is_bracket_allowed !== false,
        isTimedRace: Boolean(row?.is_timed_race || row?.engine_type === "TIMED_RACE" || row?.execution_format === "MULTI_CONTESTANT_TIMED"),
      }))
      .filter((row) => row.sportId > 0);
  }, [generationReadiness]);
  const fallbackGenerationSports = useMemo(() => {
    const byId = new Map();
    visibleBrackets.forEach((entry) => {
      const sportId = Number(entry?.sport_id || 0);
      if (
        targetScopedManagement
        && Array.isArray(liveScoringSportIds)
        && !liveScoringSportIds.some((allowedSportId) => Number(allowedSportId) === sportId)
      ) return;
      const targetKey = buildBracketTargetKey(
        entry?.sport_id,
        entry?.tournament_sport_event_id ?? null
      );
      if (!Number.isFinite(sportId) || sportId <= 0 || byId.has(targetKey)) return;
      const sportName = String(entry?.sport_name || "").trim() || `Sport #${sportId}`;
      const eventName = String(entry?.event_name || "").trim();
      const eventKey = String(entry?.event_key || "").trim().toLowerCase();
      byId.set(targetKey, {
        sportId,
        sportName,
        tournamentSportEventId:
          entry?.tournament_sport_event_id == null
            ? null
            : Number(entry.tournament_sport_event_id),
        eventName,
        eventKey,
        participantShape: String(entry?.participant_shape || "").trim().toUpperCase(),
        targetLabel: buildBracketTargetLabel({ sportName, eventName, eventKey }),
        targetKey,
        isReady: true,
        blockers: [],
        warnings: [],
        bracketFormat: String(entry?.format || entry?.bracket_format || "").trim().toUpperCase(),
        seedingMethod: String(entry?.seeding_method || "").trim().toUpperCase(),
        engineSeedingMethod: String(entry?.seeding_method || "random").trim().toLowerCase(),
        engineBracketFormat: String(entry?.format || entry?.bracket_format || "single_elimination").trim().toLowerCase(),
        supportedFormats: [String(entry?.format || entry?.bracket_format || "single_elimination").trim().toLowerCase()],
        currentGeneratedFormat: String(entry?.format || entry?.bracket_format || "").trim().toLowerCase() || null,
        formatLocked: ["ACTIVE", "FINALIZED", "COMPLETED"].includes(String(entry?.status || "").trim().toUpperCase()),
        lockReason: ["ACTIVE", "FINALIZED", "COMPLETED"].includes(String(entry?.status || "").trim().toUpperCase())
          ? "Bracket locked after activation. Regeneration and format changes are disabled to protect official match progression."
          : "",
        targetName: buildBracketTargetLabel({ sportName, eventName, eventKey }),
      });
    });

    return Array.from(byId.values()).sort((left, right) =>
      String(left?.targetLabel || "").localeCompare(String(right?.targetLabel || ""))
    );
  }, [liveScoringSportIds, targetScopedManagement, visibleBrackets]);
  const generationSportOptions = useMemo(
    () => (generationSports.length > 0 ? generationSports : fallbackGenerationSports),
    [fallbackGenerationSports, generationSports]
  );
  const generationSportGroups = useMemo(() => {
    const groups = new Map();
    generationSportOptions.forEach((row) => {
      const sportId = Number(row?.sportId || 0);
      if (sportId <= 0) return;
      if (!groups.has(sportId)) {
        groups.set(sportId, {
          sportId,
          sportName: row?.sportName || `Sport #${sportId}`,
          targets: [],
        });
      }
      groups.get(sportId).targets.push(row);
    });
    return Array.from(groups.values());
  }, [generationSportOptions]);
  const selectedGenerationSport = useMemo(
    () => generationSportOptions.find((row) => row.targetKey === String(generationSportId || "")) || null,
    [generationSportId, generationSportOptions]
  );
  const selectedGenerationFormat = useMemo(() => {
    if (!selectedGenerationSport) return "";
    const targetKey = String(selectedGenerationSport.targetKey || "");
    const supported = Array.isArray(selectedGenerationSport.supportedFormats)
      ? selectedGenerationSport.supportedFormats
      : [];
    const preferred = String(
      generationFormatByTarget[targetKey]
        || selectedGenerationSport.currentGeneratedFormat
        || selectedGenerationSport.engineBracketFormat
        || supported[0]
        || ""
    ).trim().toLowerCase();
    return supported.includes(preferred) ? preferred : String(supported[0] || "");
  }, [generationFormatByTarget, selectedGenerationSport]);
  const selectedSportBracketStatuses = useMemo(() => {
    const targetKey = String(generationSportId || "").trim();
    if (!targetKey) return [];
    const statuses = bracketStatusesBySportId.get(targetKey);
    return statuses ? Array.from(statuses) : [];
  }, [bracketStatusesBySportId, generationSportId]);
  const selectedSportHasActiveLikeBracket = useMemo(
    () => selectedSportBracketStatuses.some((entry) => entry === "ACTIVE" || entry === "FINALIZED"),
    [selectedSportBracketStatuses]
  );
  const selectedSportHasCompletedBracket = useMemo(
    () => selectedSportBracketStatuses.includes("COMPLETED"),
    [selectedSportBracketStatuses]
  );
  const selectedSportHasGeneratedBracket = useMemo(
    () => selectedSportBracketStatuses.some((entry) => entry === "GENERATED" || entry === "DRAFT"),
    [selectedSportBracketStatuses]
  );
  const selectedSportGenerationLocked = Boolean(
    selectedGenerationSport?.formatLocked
      || selectedSportHasActiveLikeBracket
      || selectedSportHasCompletedBracket
  );
  const selectedGenerationBlockers = useMemo(
    () =>
      Array.isArray(selectedGenerationSport?.blockers)
        ? selectedGenerationSport.blockers.map((entry) => String(entry || "").trim()).filter(Boolean)
        : [],
    [selectedGenerationSport?.blockers]
  );
  const selectedSetupSeedingMethod = useMemo(
    () =>
      normalizeSetupSeedingMethod(
        selectedGenerationSport?.seedingMethod,
        selectedGenerationSport?.engineSeedingMethod
      ),
    [selectedGenerationSport?.engineSeedingMethod, selectedGenerationSport?.seedingMethod]
  );
  const isManualSeedingMode = useMemo(() => {
    if (!selectedGenerationSport) return false;
    return selectedSetupSeedingMethod === "MANUAL";
  }, [selectedGenerationSport, selectedSetupSeedingMethod]);
  const manualCandidatesById = useMemo(() => {
    const map = {};
    manualCandidates.forEach((row) => {
      map[Number(row.team_id)] = row;
    });
    return map;
  }, [manualCandidates]);
  const orderedManualCandidates = useMemo(
    () =>
      manualSeedOrderIds
        .map((teamId) => manualCandidatesById[Number(teamId)])
        .filter(Boolean),
    [manualCandidatesById, manualSeedOrderIds]
  );
  const missingManualCandidates = useMemo(() => {
    const seeded = new Set(manualSeedOrderIds.map((id) => Number(id)));
    return manualCandidates.filter((row) => !seeded.has(Number(row.team_id)));
  }, [manualCandidates, manualSeedOrderIds]);
  const hasUnsavedManualSeedChanges = useMemo(() => {
    if (!isManualSeedingMode) return false;
    if (manualSeedOrderIds.length !== manualConfigSeedIds.length) return true;
    return manualSeedOrderIds.some(
      (entry, index) => Number(entry) !== Number(manualConfigSeedIds[index])
    );
  }, [isManualSeedingMode, manualConfigSeedIds, manualSeedOrderIds]);

  const selectedSportBracketForSeeding = useMemo(() => {
    const sportId = Number(selectedGenerationSport?.sportId || 0);
    const eventId =
      selectedGenerationSport?.tournamentSportEventId == null
        ? null
        : Number(selectedGenerationSport.tournamentSportEventId);
    if (sportId <= 0 || generationTournamentId <= 0) return null;
    const candidates = visibleBrackets.filter(
      (entry) =>
        Number(entry?.sport_id || 0) === sportId
        && Number(entry?.tournament_id || 0) === generationTournamentId
        && (
          eventId == null
            ? entry?.tournament_sport_event_id == null
            : Number(entry?.tournament_sport_event_id || 0) === eventId
        )
    );
    return candidates[0] || null;
  }, [generationTournamentId, selectedGenerationSport, visibleBrackets]);
  const selectedSportSeedSourceByTeamId = useMemo(() => {
    const table = Array.isArray(selectedSportBracketForSeeding?.seeding_summary?.seed_table)
      ? selectedSportBracketForSeeding.seeding_summary.seed_table
      : [];
    const map = {};
    table.forEach((row) => {
      const teamId = Number(row?.team_id || 0);
      if (teamId > 0) {
        map[teamId] = {
          source: row?.source || "",
          notes: row?.notes || "",
        };
      }
    });
    return map;
  }, [selectedSportBracketForSeeding?.seeding_summary?.seed_table]);

  const selectedBracket = useMemo(
    () => visibleBrackets.find((entry) => entry.id === selectedBracketId) || null,
    [visibleBrackets, selectedBracketId]
  );
  const selectedBracketTargetKey = useMemo(
    () => (
      selectedBracket
        ? buildBracketTargetKey(
            selectedBracket?.sport_id,
            selectedBracket?.tournament_sport_event_id ?? null
          )
        : ""
    ),
    [selectedBracket]
  );
  const selectedBracketTargetLabel = useMemo(
    () =>
      buildBracketTargetLabel({
        sportName: selectedBracket?.sport_name,
        eventName: selectedBracket?.event_name,
        eventKey: selectedBracket?.event_key,
      }),
    [selectedBracket?.event_key, selectedBracket?.event_name, selectedBracket?.sport_name]
  );
  const selectedBracketParticipantShapeLabel = useMemo(() => {
    const rawValue = String(selectedBracket?.participant_shape || "").trim();
    return rawValue ? formatParticipantShapeLabel(rawValue) : "";
  }, [selectedBracket?.participant_shape]);
  const selectedGenerationParticipantShapeLabel = useMemo(() => {
    const rawValue = String(selectedGenerationSport?.participantShape || "").trim();
    return rawValue ? formatParticipantShapeLabel(rawValue) : "";
  }, [selectedGenerationSport?.participantShape]);
  const selectedBracketStatus = String(selectedBracket?.status || "").toUpperCase();
  const canOpenSelectedBracketLiveScoring = useMemo(() => {
    if (!canOpenLiveScoringFromPage) return false;
    if (!Array.isArray(liveScoringSportIds)) return true;
    const selectedSportId = Number(selectedBracket?.sport_id || 0);
    return selectedSportId > 0 && liveScoringSportIds.some(
      (sportId) => Number(sportId) === selectedSportId
    );
  }, [canOpenLiveScoringFromPage, liveScoringSportIds, selectedBracket?.sport_id]);
  const selectedSeedingMode = String(
    selectedBracket?.seeding_summary?.seeding_method
      || selectedGenerationSport?.seedingMethod
      || selectedGenerationSport?.engineSeedingMethod
      || "RANDOM"
  ).toUpperCase();
  const selectedBracketFirstRoundPreview = useMemo(() => {
    const preview = selectedBracket?.seeding_summary?.seed_placement?.first_round_preview;
    if (!Array.isArray(preview)) return [];
    return preview.filter((entry) => typeof entry === "string" && entry.trim().length > 0);
  }, [selectedBracket?.seeding_summary?.seed_placement?.first_round_preview]);
  const localManualFirstRoundPreview = useMemo(
    () => buildLocalFirstRoundPreview(orderedManualCandidates, true),
    [orderedManualCandidates]
  );
  const isEliminationSeedingPreview = useMemo(() => {
    const format = String(
      selectedGenerationFormat
    ).trim().toLowerCase();
    return format === "single_elimination" || format === "double_elimination";
  }, [selectedGenerationFormat]);
  const selectedGenerationFormatKey = useMemo(
    () =>
      String(
        selectedGenerationFormat
      )
        .trim()
        .toUpperCase(),
    [selectedGenerationFormat]
  );
  const generationControlHint = useMemo(() => {
    if (selectedSportHasCompletedBracket) {
      return "This sport already has a completed bracket. Regeneration is disabled.";
    }
    if (selectedSportHasActiveLikeBracket) {
      return "Bracket locked after activation. Regeneration and format changes are disabled to protect official match progression.";
    }
    if (selectedGenerationSport?.formatLocked) {
      return selectedGenerationSport.lockReason || "Format locked for this bracket.";
    }
    if (selectedSportHasGeneratedBracket) {
      return "This sport already has a generated draft bracket. Activate it when ready.";
    }
    return "";
  }, [
    selectedSportHasActiveLikeBracket,
    selectedSportHasCompletedBracket,
    selectedSportHasGeneratedBracket,
    selectedGenerationSport?.formatLocked,
    selectedGenerationSport?.lockReason,
  ]);
  const filteredMatches = useMemo(() => {
    const needle = String(matchSearch || "").trim().toLowerCase();
    if (!needle) return matches;
    return matches.filter((row) => {
      const haystack = [
        row?.match_number,
        row?.round,
        row?.team1_name,
        row?.team1_label,
        row?.team2_name,
        row?.team2_label,
        row?.venue_name,
        row?.status,
      ]
        .map((entry) => String(entry || "").toLowerCase())
        .join(" ");
      return haystack.includes(needle);
    });
  }, [matchSearch, matches]);
  const blockedStatuses = useMemo(() => new Set(["CONFIG_LOCKED", "CONFIG_MISMATCH"]), []);
  const canMigrateTemplates = canManageGlobalBrackets;
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

  const resolveMigrationTargetVersion = useCallback((matchRow) => {
    const version = String(matchRow?.current_template_version || "").trim();
    return version || "";
  }, []);

  const resolveVisibilityStatus = useCallback((matchRow) => {
    const configStatus = String(matchRow?.config_status || "UNKNOWN").toUpperCase();
    const rawStatus = String(matchRow?.status || "").toUpperCase();
    const isLiveStatus = ["ONGOING", "LIVE", "IN_PROGRESS"].includes(rawStatus);
    if (blockedStatuses.has(configStatus)) return configStatus;
    if (isLiveStatus && configStatus === "VALID") return "LIVE";
    if (configStatus === "VALID") return "VALID";
    return "UNKNOWN";
  }, [blockedStatuses]);

  const openLockedModal = useCallback((matchRow, issuesOverride = null, configResponse = null) => {
    setMigrationPreview(null);
    setMigrationError("");
    setIsReviewingMigration(false);
    setIsResolvingMigration(false);
    const status = String(matchRow?.config_status || "CONFIG_LOCKED").toUpperCase();
    const responseStatus = String(configResponse?.status || status).toUpperCase();
    const defaultIssue = responseStatus === "CONFIG_MISMATCH"
      ? "Template has changed since match creation."
      : "Invalid sport template configuration";
    const issues = Array.isArray(issuesOverride)
      ? issuesOverride
      : Array.isArray(matchRow?.config_issues)
        ? matchRow.config_issues
        : [defaultIssue];
    setLockedModalMatch({
      ...matchRow,
      config_status: responseStatus,
      reason:
        String(configResponse?.reason || "").trim()
        || (
          responseStatus === "CONFIG_MISMATCH"
            ? "Template has changed since match creation."
            : "Invalid sport template configuration"
        ),
      config_issues: issues,
      match_template_version: configResponse?.match_template_version || matchRow?.match_template_version || null,
      current_template_version: configResponse?.current_template_version || matchRow?.current_template_version || null,
      match_template_hash: configResponse?.match_template_hash || matchRow?.match_template_hash || null,
      current_template_hash: configResponse?.current_template_hash || matchRow?.current_template_hash || null,
    });
  }, []);

  const handleOpenMatchCenter = useCallback(async (matchRow) => {
    if (!canOpenSelectedBracketLiveScoring) return;
    const localStatus = String(matchRow?.config_status || "UNKNOWN").toUpperCase();
    if (blockedStatuses.has(localStatus)) {
      try {
        const configResponse = await getMatchEventConfig(matchRow.id);
        const issues = Array.isArray(configResponse?.issues) ? configResponse.issues : null;
        openLockedModal(matchRow, issues, configResponse);
      } catch {
        openLockedModal(matchRow);
      }
      return;
    }

    try {
      const configResponse = await getMatchEventConfig(matchRow.id);
      const serverStatus = String(configResponse?.status || "VALID").toUpperCase();
      const serverIssues = Array.isArray(configResponse?.issues) ? configResponse.issues : [];
      if (blockedStatuses.has(serverStatus)) {
        setMatches((current) =>
          current.map((row) =>
            row.id === matchRow.id
              ? {
                  ...row,
                  config_status: serverStatus,
                  config_issues: serverIssues,
                }
              : row
          )
        );
        openLockedModal({ ...matchRow, config_status: serverStatus }, serverIssues, configResponse);
        return;
      }
      setMatches((current) =>
        current.map((row) =>
          row.id === matchRow.id
            ? {
                ...row,
                config_status: "VALID",
                config_issues: [],
              }
            : row
        )
      );
      navigate(`${liveScoringBasePath}/matches/${matchRow.id}/live-scoring`);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const fallback = "Unable to validate match configuration.";
      const parsedMessage = typeof detail === "string"
        ? detail
        : typeof detail?.message === "string"
          ? detail.message
          : fallback;
      setMessage(parsedMessage || fallback);
    }
  }, [blockedStatuses, canOpenSelectedBracketLiveScoring, liveScoringBasePath, navigate, openLockedModal]);

  const handleViewMatchScore = useCallback((mappedMatch) => {
    const matchRow = mappedMatch?.raw || mappedMatch;
    const matchId = Number(matchRow?.id || mappedMatch?.id || 0);
    if (!matchId) return;
    if (canOpenSelectedBracketLiveScoring) {
      handleOpenMatchCenter(matchRow);
      return;
    }
    navigate(`${matchViewerBasePath}/matches/${matchId}`);
  }, [canOpenSelectedBracketLiveScoring, handleOpenMatchCenter, matchViewerBasePath, navigate]);

  const handleReviewMigration = useCallback(async () => {
    if (!lockedModalMatch || !canMigrateTemplates) return;
    const targetVersion = resolveMigrationTargetVersion(lockedModalMatch);
    if (!targetVersion) {
      setMigrationError("Unable to resolve target template version for this match.");
      return;
    }
    setIsReviewingMigration(true);
    setMigrationError("");
    try {
      const response = await migrateMatchTemplate(lockedModalMatch.id, {
        target_version: targetVersion,
        dry_run: true,
      });
      setMigrationPreview(response);
      if (String(response?.status || "").toUpperCase() !== "SAFE") {
        setMigrationError(migrationFailureMessage(response, "Migration is unsafe. Review issues before applying."));
      }
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const message = typeof detail === "string" ? detail : "Failed to run migration dry-run.";
      setMigrationError(message);
    } finally {
      setIsReviewingMigration(false);
    }
  }, [canMigrateTemplates, lockedModalMatch, migrationFailureMessage, resolveMigrationTargetVersion]);

  const handleResolveAutomatically = useCallback(async () => {
    if (!lockedModalMatch || !canMigrateTemplates) return;
    const targetVersion = resolveMigrationTargetVersion(lockedModalMatch);
    if (!targetVersion) {
      setMigrationError("Unable to resolve target template version for this match.");
      return;
    }

    setIsResolvingMigration(true);
    setMigrationError("");
    try {
      const dryRun = await migrateMatchTemplate(lockedModalMatch.id, {
        target_version: targetVersion,
        dry_run: true,
      });
      setMigrationPreview(dryRun);
      if (String(dryRun?.status || "").toUpperCase() !== "SAFE") {
        setMigrationError(migrationFailureMessage(dryRun, "Migration dry-run reported unsafe changes."));
        return;
      }

      const result = await migrateMatchTemplate(lockedModalMatch.id, {
        target_version: targetVersion,
        dry_run: false,
      });
      if (String(result?.status || "").toUpperCase() !== "SUCCESS") {
        setMigrationError(migrationFailureMessage(result, "Template migration failed."));
        return;
      }

      setMatches((current) =>
        current.map((row) =>
          row.id === lockedModalMatch.id
            ? {
                ...row,
                config_status: "VALID",
                config_issues: [],
                template_version: result?.new_version || row.template_version,
              }
            : row
        )
      );
      closeLockedModal();
      navigate(`/coordinator/matches/${lockedModalMatch.id}/live-scoring`);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const message = typeof detail === "string" ? detail : "Failed to apply template migration.";
      setMigrationError(message);
    } finally {
      setIsResolvingMigration(false);
    }
  }, [
    canMigrateTemplates,
    closeLockedModal,
    lockedModalMatch,
    migrationFailureMessage,
    navigate,
    resolveMigrationTargetVersion,
  ]);

  useEffect(() => {
    let active = true;
    const resolveTournamentContext = async () => {
      bracketRequestSequenceRef.current += 1;
      setResolvedTournamentId(0);
      setBrackets([]);
      setSelectedBracketId(null);
      setMatches([]);
      setGenerationReadiness(null);
      setGenerationSportId("");
      setShowBracketSetup(false);
      if (!selectedWorkspaceId) {
        setAutoTournamentResolving(false);
        setLoading(false);
        return;
      }
      setAutoTournamentResolving(true);
      try {
        const rows = await getTournaments(selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : {});
        if (!active) return;

        const scopedRows = Array.isArray(rows) ? rows : [];
        const requestedTournamentIsInWorkspace = scopedRows.some(
          (row) => Number(row?.id || 0) === requestedTournamentId
        );
        let targetTournamentId = requestedTournamentIsInWorkspace
          ? requestedTournamentId
          : pickPreferredTournamentId(scopedRows);
        targetTournamentId = Number.isFinite(targetTournamentId) ? targetTournamentId : 0;

        const nextParams = new URLSearchParams(searchParams);
        if (targetTournamentId > 0) {
          nextParams.set("tournament_id", String(targetTournamentId));
        } else {
          nextParams.delete("tournament_id");
        }
        if (nextParams.toString() !== searchParams.toString()) {
          setSearchParams(nextParams, { replace: true });
        }
        setResolvedTournamentId(targetTournamentId > 0 ? targetTournamentId : 0);
      } catch {
        if (active) setResolvedTournamentId(0);
      } finally {
        if (active) setAutoTournamentResolving(false);
      }
    };

    resolveTournamentContext();
    return () => {
      active = false;
    };
  }, [requestedTournamentId, searchParams, selectedWorkspaceId, setSearchParams]);

  useEffect(() => {
    if (resolvedTournamentId <= 0) {
      setLoading(false);
      return undefined;
    }
    const requestSequence = ++bracketRequestSequenceRef.current;
    let active = true;
    const loadBrackets = async () => {
      setLoading(true);
      try {
        const rows = await getBrackets(resolvedTournamentId);
        if (!active || requestSequence !== bracketRequestSequenceRef.current) return;
        const safeRows = Array.isArray(rows)
          ? rows.filter((entry) => Number(entry?.tournament_id || 0) === resolvedTournamentId)
          : [];
        setBrackets(safeRows);
        setSelectedBracketId(safeRows[0]?.id || null);
      } catch (error) {
        if (!active || requestSequence !== bracketRequestSequenceRef.current) return;
        setBrackets([]);
        setSelectedBracketId(null);
        setMessage(error.response?.data?.detail || "Failed to load brackets.");
      } finally {
        if (active && requestSequence === bracketRequestSequenceRef.current) {
          setLoading(false);
        }
      }
    };
    loadBrackets();
    return () => {
      active = false;
    };
  }, [resolvedTournamentId]);

  useEffect(() => {
    if (!canManageBrackets) {
      setSports([]);
      return;
    }
    let active = true;
    const loadSports = async () => {
      try {
        const rows = await getSports();
        if (active) setSports(Array.isArray(rows) ? rows : []);
      } catch {
        if (active) setSports([]);
      }
    };
    loadSports();
    return () => {
      active = false;
    };
  }, [canManageBrackets]);

  // --- Coordinator activation handlers ---

  const reloadBrackets = useCallback(async () => {
    try {
      if (generationTournamentId <= 0) return;
      const rows = await getBrackets(generationTournamentId);
      setBrackets(
        Array.isArray(rows)
          ? rows.filter((entry) => Number(entry?.tournament_id || 0) === generationTournamentId)
          : []
      );
    } catch {
      // silent reload failure
    }
  }, [generationTournamentId]);

  const loadGenerationReadiness = useCallback(async () => {
    if (!canManageBrackets) {
      setGenerationReadiness(null);
      setGenerationSportId("");
      return;
    }
    if (generationTournamentId <= 0) {
      setGenerationReadiness(null);
      setGenerationSportId("");
      return;
    }
    try {
      const readiness = await getBracketGenerationReadiness(generationTournamentId);
      setGenerationReadiness(readiness);
      const rows = Array.isArray(readiness?.rows) ? readiness.rows : [];
      const firstTargetKey = rows[0]
        ? buildBracketTargetKey(rows[0]?.sport_id, rows[0]?.tournament_sport_event_id ?? null)
        : "";
      setGenerationSportId((current) => {
        const currentTargetKey = String(current || "");
        const hasSelected = rows.some(
          (row) =>
            buildBracketTargetKey(row?.sport_id, row?.tournament_sport_event_id ?? null)
            === currentTargetKey
        );
        return hasSelected ? currentTargetKey : firstTargetKey;
      });
    } catch {
      setGenerationReadiness(null);
      setGenerationSportId("");
    }
  }, [canManageBrackets, generationTournamentId]);

  const loadEntryReadiness = useCallback(async () => {
    if (!canManageBrackets) {
      setEntryReadiness(null);
      setEntryReadinessError("");
      setEntryReadinessLoading(false);
      return;
    }
    const sportId = Number(selectedGenerationSport?.sportId || 0);
    const tournamentSportEventId =
      selectedGenerationSport?.tournamentSportEventId == null
        ? null
        : Number(selectedGenerationSport.tournamentSportEventId);
    if (generationTournamentId <= 0 || sportId <= 0) {
      setEntryReadiness(null);
      setEntryReadinessError("");
      setEntryReadinessLoading(false);
      return;
    }
    setEntryReadinessLoading(true);
    setEntryReadinessError("");
    try {
      const data = await getSportEntryReadiness(
        generationTournamentId,
        sportId,
        tournamentSportEventId
      );
      setEntryReadiness(data && typeof data === "object" ? data : null);
    } catch (error) {
      setEntryReadiness(null);
      const detail = error?.response?.data?.detail;
      setEntryReadinessError(typeof detail === "string" ? detail : "Entry readiness is temporarily unavailable.");
    } finally {
      setEntryReadinessLoading(false);
    }
  }, [canManageBrackets, generationTournamentId, selectedGenerationSport]);

  useEffect(() => {
    if (!visibleBrackets.length) {
      setSelectedBracketId(null);
      return;
    }
    const stillVisible = visibleBrackets.some((entry) => entry.id === selectedBracketId);
    if (stillVisible) return;
    const currentTargetKey = String(generationSportId || "").trim();
    if (currentTargetKey) {
      const matchingBrackets = visibleBrackets
        .filter(
          (entry) =>
            buildBracketTargetKey(
              entry?.sport_id,
              entry?.tournament_sport_event_id ?? null
            ) === currentTargetKey
        )
        .sort(compareBracketPreference);
      const nextBracketId = Number(matchingBrackets[0]?.id || 0) || null;
      if (nextBracketId !== selectedBracketId) {
        setSelectedBracketId(nextBracketId);
      }
      return;
    }
    setSelectedBracketId(visibleBrackets[0].id);
  }, [generationSportId, selectedBracketId, visibleBrackets]);

  useEffect(() => {
    const targetKey = String(generationSportId || "").trim();
    if (!targetKey) return;
    if (selectedBracketTargetKey === targetKey) return;

    const matchingBrackets = visibleBrackets
      .filter(
        (entry) =>
          buildBracketTargetKey(
            entry?.sport_id,
            entry?.tournament_sport_event_id ?? null
          ) === targetKey
      )
      .sort(compareBracketPreference);

    const preferredBracketId = Number(matchingBrackets[0]?.id || 0) || null;
    if (preferredBracketId !== selectedBracketId) {
      setSelectedBracketId(preferredBracketId);
    }
  }, [generationSportId, selectedBracketId, selectedBracketTargetKey, visibleBrackets]);

  useEffect(() => {
    loadGenerationReadiness();
  }, [loadGenerationReadiness]);

  useEffect(() => {
    loadEntryReadiness();
  }, [loadEntryReadiness]);

  useEffect(() => {
    const currentTargetKey = String(generationSportId || "").trim();
    if (
      currentTargetKey &&
      generationSportOptions.some((row) => String(row?.targetKey || "") === currentTargetKey)
    ) {
      return;
    }
    const firstTargetKey = String(generationSportOptions[0]?.targetKey || "");
    if (firstTargetKey) {
      setGenerationSportId(firstTargetKey);
    }
  }, [generationSportId, generationSportOptions]);

  useEffect(() => {
    if (generationSportOptions.length === 0) {
      setGenerationFormatByTarget({});
      return;
    }
    setGenerationFormatByTarget((current) => {
      const next = { ...current };
      generationSportOptions.forEach((target) => {
        const key = String(target?.targetKey || "");
        const supported = Array.isArray(target?.supportedFormats) ? target.supportedFormats : [];
        const existing = String(next[key] || "").trim().toLowerCase();
        if (!key || supported.includes(existing)) return;
        const preferred = String(
          target?.currentGeneratedFormat
            || target?.engineBracketFormat
            || supported[0]
            || ""
        ).trim().toLowerCase();
        next[key] = supported.includes(preferred) ? preferred : String(supported[0] || "");
      });
      return next;
    });
  }, [generationSportOptions]);

  useEffect(() => {
    if (
      !canManageBrackets
      || !isManualSeedModalOpen
      || generationTournamentId <= 0
      || !selectedGenerationSport
      || !selectedGenerationFormat
    ) {
      previewRequestSequenceRef.current += 1;
      setBracketPreview(null);
      setBracketPreviewBusy(false);
      setBracketPreviewError("");
      return;
    }

    const requestSequence = ++previewRequestSequenceRef.current;
    let active = true;
    const loadPreview = async () => {
      setBracketPreviewBusy(true);
      setBracketPreviewError("");
      try {
        const payload = {
          tournament_id: generationTournamentId,
          sport_id: Number(selectedGenerationSport.sportId),
          tournament_sport_event_id: selectedGenerationSport.tournamentSportEventId,
          format: selectedGenerationFormat,
          seeding_method: String(selectedGenerationSport.engineSeedingMethod || "random").toLowerCase(),
        };
        if (manualSeedOrderIds.length > 0) {
          payload.seeded_team_ids = manualSeedOrderIds.map((entry) => Number(entry));
        }
        const response = await previewBracket(payload);
        if (!active || requestSequence !== previewRequestSequenceRef.current) return;
        setBracketPreview(response && typeof response === "object" ? response : null);
      } catch (error) {
        if (!active || requestSequence !== previewRequestSequenceRef.current) return;
        const detail = error?.response?.data?.detail;
        const detailMessage = typeof detail === "string"
          ? detail
          : String(detail?.message || "Unable to preview this bracket format.");
        setBracketPreview(null);
        setBracketPreviewError(detailMessage);
      } finally {
        if (active && requestSequence === previewRequestSequenceRef.current) {
          setBracketPreviewBusy(false);
        }
      }
    };
    loadPreview();
    return () => {
      active = false;
    };
  }, [
    canManageBrackets,
    generationTournamentId,
    isManualSeedModalOpen,
    isManualSeedingMode,
    manualSeedOrderIds,
    selectedGenerationFormat,
    selectedGenerationSport,
  ]);

  const applyManualCandidatesPayload = useCallback((payload, mode, rankedSeedTable = null) => {
    const candidates = Array.isArray(payload?.participants) ? payload.participants : [];
    const savedIds = Array.isArray(payload?.saved_manual_seed_team_ids)
      ? payload.saved_manual_seed_team_ids
          .map((entry) => Number(entry))
          .filter((entry) => Number.isInteger(entry) && entry > 0)
      : [];
    const candidateIds = candidates
      .map((entry) => Number(entry?.team_id))
      .filter((entry) => Number.isInteger(entry) && entry > 0);
    const candidateIdSet = new Set(candidateIds);
    const filteredSaved = savedIds.filter((entry) => candidateIdSet.has(entry));
    const defaultOrder = candidates
      .slice()
      .sort((left, right) => String(left?.team_name || "").localeCompare(String(right?.team_name || "")))
      .map((entry) => Number(entry.team_id));
    const seedTableIds = Array.isArray(rankedSeedTable)
      ? rankedSeedTable
          .map((entry) => Number(entry?.team_id))
          .filter((entry) => Number.isInteger(entry) && candidateIdSet.has(entry))
      : [];
    const seedTableSet = new Set(seedTableIds);
    const seedTableOrder = seedTableIds.concat(defaultOrder.filter((entry) => !seedTableSet.has(entry)));
    const resolvedMode = String(mode || "RANDOM").toUpperCase();
    let initialOrder = defaultOrder;
    if (resolvedMode === "MANUAL") {
      initialOrder =
        filteredSaved.length === candidateIds.length && candidateIds.length > 0
          ? filteredSaved
          : defaultOrder;
    } else if (resolvedMode === "RANDOM") {
      initialOrder = shuffleIds(defaultOrder);
    } else if (resolvedMode === "PREVIOUS_RANKING" || resolvedMode === "DEPARTMENT_SEPARATION" || resolvedMode === "SYSTEM_BALANCED") {
      initialOrder = seedTableOrder.length > 0 ? seedTableOrder : defaultOrder;
    }

    setManualCandidates(candidates);
    setManualConfigSeedIds(filteredSaved);
    setManualSeedOrderIds(initialOrder);
  }, []);

  useEffect(() => {
    const tournamentId = Number(generationTournamentId || 0);
    const sportId = Number(selectedGenerationSport?.sportId || 0);
    const tournamentSportEventId =
      selectedGenerationSport?.tournamentSportEventId == null
        ? null
        : Number(selectedGenerationSport.tournamentSportEventId);
    if (!canManageBrackets || tournamentId <= 0 || sportId <= 0) {
      setManualCandidates([]);
      setManualSeedOrderIds([]);
      setManualConfigSeedIds([]);
      setManualSeedingError("");
      setManualMissingTeamId("");
      return;
    }

    let active = true;
    const loadCandidates = async () => {
      setManualSeedingBusy(true);
      setManualSeedingError("");
      try {
        const response = await getManualSeedingCandidates(
          tournamentId,
          sportId,
          tournamentSportEventId
        );
        if (!active) return;
        applyManualCandidatesPayload(
          response,
          selectedSetupSeedingMethod,
          selectedSportBracketForSeeding?.seeding_summary?.seed_table
        );
        setManualMissingTeamId("");
      } catch (error) {
        if (!active) return;
        const detail = error?.response?.data?.detail;
        setManualCandidates([]);
        setManualSeedOrderIds([]);
        setManualConfigSeedIds([]);
        setManualSeedingError(
          typeof detail === "string" ? detail : "Unable to load eligible teams for manual seeding."
        );
      } finally {
        if (active) setManualSeedingBusy(false);
      }
    };

    loadCandidates();
    return () => {
      active = false;
    };
  }, [
    applyManualCandidatesPayload,
    canManageBrackets,
    generationTournamentId,
    selectedSetupSeedingMethod,
    selectedGenerationSport,
    selectedSportBracketForSeeding?.seeding_summary?.seed_table,
  ]);

  const validateManualSeedOrder = useCallback(() => {
    const issues = [];
    const candidateIds = manualCandidates.map((row) => Number(row.team_id));
    const orderIds = manualSeedOrderIds.map((row) => Number(row));
    if (candidateIds.length < 2) {
      issues.push("Seeding requires at least 2 eligible teams.");
    }
    if (orderIds.length !== candidateIds.length) {
      issues.push("All eligible teams must be ordered in the seed table.");
    }
    if (new Set(orderIds).size !== orderIds.length) {
      issues.push("Duplicate team found in seed order.");
    }
    const candidateSet = new Set(candidateIds);
    const hasUnknown = orderIds.some((teamId) => !candidateSet.has(teamId));
    if (hasUnknown) {
      issues.push("Seed order contains unknown teams.");
    }
    const orderSet = new Set(orderIds);
    const missing = candidateIds.filter((teamId) => !orderSet.has(teamId));
    if (missing.length > 0) {
      issues.push("Add all eligible teams before generating.");
    }
    return issues;
  }, [manualCandidates, manualSeedOrderIds]);

  const manualSeedingValidationErrors = useMemo(
    () => validateManualSeedOrder(),
    [validateManualSeedOrder]
  );
  const selectedSeedMode = selectedSetupSeedingMethod;
  const seedModalTitle = useMemo(() => {
    if (selectedSeedMode === "MANUAL") return "Manual Seed Order";
    if (selectedSeedMode === "RANDOM") return "Random Seed Order Preview";
    if (selectedSeedMode === "PREVIOUS_RANKING") return "Previous Tournament Ranking Seeds";
    if (selectedSeedMode === "DEPARTMENT_SEPARATION" || selectedSeedMode === "SYSTEM_BALANCED") {
      return "Balanced Seed Order Preview";
    }
    return "Seed Order Preview";
  }, [selectedSeedMode]);
  const isSeedOrderReadOnly = false;
  const seedStatusReady = useMemo(() => {
    return Boolean(selectedGenerationSport?.isReady) && manualSeedingValidationErrors.length === 0 && manualSeedOrderIds.length > 0;
  }, [
    manualSeedOrderIds.length,
    manualSeedingValidationErrors.length,
    selectedGenerationSport?.isReady,
  ]);
  const seedModeHelpText = useMemo(() => {
    if (selectedSeedMode === "MANUAL") {
      if (selectedGenerationFormatKey === "ROUND_ROBIN") {
        return "Set team order manually. For round robin, this controls display/order flow rather than knockout pairing protection.";
      }
      return "Set seeds from highest to lowest. The bracket places top seeds apart automatically.";
    }
    if (selectedSeedMode === "RANDOM") {
      return "Teams are randomized first, then placed using standard seeded bracket placement.";
    }
    if (selectedSeedMode === "PREVIOUS_RANKING") {
      return "Seeds use linked previous tournament rankings, then standard seeded placement is applied.";
    }
    if (selectedSeedMode === "DEPARTMENT_SEPARATION" || selectedSeedMode === "SYSTEM_BALANCED") {
      return "The system arranges teams to reduce early same-department matchups where possible.";
    }
    return "Review seed ranking order before generating this bracket.";
  }, [selectedGenerationFormatKey, selectedSeedMode]);

  const moveSeedOrder = useCallback((teamId, direction) => {
    setManualSeedOrderIds((current) => {
      const index = current.findIndex((entry) => Number(entry) === Number(teamId));
      if (index < 0) return current;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = current.slice();
      const temp = next[index];
      next[index] = next[nextIndex];
      next[nextIndex] = temp;
      return next;
    });
  }, []);

  const removeFromSeedOrder = useCallback((teamId) => {
    setManualSeedOrderIds((current) =>
      current.filter((entry) => Number(entry) !== Number(teamId))
    );
  }, []);

  const addToSeedOrder = useCallback((teamId) => {
    const normalized = Number(teamId || 0);
    if (!normalized) return;
    setManualSeedOrderIds((current) => {
      if (current.some((entry) => Number(entry) === normalized)) return current;
      return [...current, normalized];
    });
  }, []);

  const resetSeedOrder = useCallback(() => {
    const defaultOrder = manualCandidates
      .slice()
      .sort((left, right) => String(left?.team_name || "").localeCompare(String(right?.team_name || "")))
      .map((entry) => Number(entry.team_id));
    setManualSeedOrderIds(defaultOrder);
  }, [manualCandidates]);

  const handleCloseSeedModal = useCallback(() => {
    if (isManualSeedingMode && hasUnsavedManualSeedChanges) {
      setSeedCloseConfirmOpen(true);
      return;
    }
    setSeedModalError("");
    setIsManualSeedModalOpen(false);
  }, [hasUnsavedManualSeedChanges, isManualSeedingMode]);

  const handleRegenerateRandomPreview = useCallback(() => {
    const candidateIds = manualCandidates
      .map((entry) => Number(entry?.team_id))
      .filter((entry) => Number.isInteger(entry) && entry > 0);
    setManualSeedOrderIds(shuffleIds(candidateIds));
  }, [manualCandidates]);

  const handleSaveManualSeedOrder = useCallback(async () => {
    if (!canManageGlobalBrackets) return false;
    const tournamentId = Number(generationTournamentId || 0);
    const sportId = Number(selectedGenerationSport?.sportId || 0);
    if (tournamentId <= 0 || sportId <= 0) {
      setMessage("Select an event category first.");
      return false;
    }
    const issues = validateManualSeedOrder();
    if (issues.length > 0) {
      setMessage(issues[0]);
      return false;
    }
    const bracketType = String(selectedGenerationFormat || "single_elimination");
    setManualSeedingSaveBusy(true);
    setMessage("");
    try {
      await upsertBracketConfiguration({
        tournament_id: tournamentId,
        sport_id: sportId,
        bracket_type: bracketType,
        seeding_method: "manual",
        manual_seed_team_ids: manualSeedOrderIds.map((entry) => Number(entry)),
      });
      setManualConfigSeedIds(manualSeedOrderIds.map((entry) => Number(entry)));
      await reloadBrackets();
      await loadGenerationReadiness();
      setMessage("Manual seed order saved.");
      setSeedModalError("");
      return true;
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setMessage(typeof detail === "string" ? detail : "Failed to save manual seed order.");
      setSeedModalError(
        typeof detail === "string" ? detail : "Failed to save manual seed order."
      );
      return false;
    } finally {
      setManualSeedingSaveBusy(false);
    }
  }, [
    canManageGlobalBrackets,
    generationTournamentId,
    reloadBrackets,
    loadGenerationReadiness,
    manualSeedOrderIds,
    selectedGenerationSport?.sportId,
    selectedGenerationFormat,
    validateManualSeedOrder,
  ]);

  const handleGenerateSingleSport = useCallback(async (workflowMode = "FINAL") => {
    if (!canManageBrackets) return;
    const tournamentId = Number(generationTournamentId || 0);
    const sportId = Number(selectedGenerationSport?.sportId || 0);
    const tournamentSportEventId =
      selectedGenerationSport?.tournamentSportEventId == null
        ? null
        : Number(selectedGenerationSport.tournamentSportEventId);
    if (tournamentId <= 0) {
      setMessage("Select an intramural first from the Intramurals page.");
      setSeedModalError("Select an intramural first from the Intramurals page.");
      return;
    }
    if (sportId <= 0) {
      setMessage("Select an event category to generate.");
      setSeedModalError("Select an event category to generate.");
      return;
    }
    if (selectedSportGenerationLocked) {
      const lockMessage = selectedSportHasCompletedBracket
        ? "This sport already has a completed bracket. Regeneration is disabled."
        : "Bracket locked after activation. Regeneration and format changes are disabled to protect official match progression.";
      setMessage(lockMessage);
      setSeedModalError(lockMessage);
      return;
    }
    if (!selectedGenerationFormat) {
      setMessage("Choose a supported bracket format.");
      setSeedModalError("Choose a supported bracket format.");
      return;
    }
    const normalizedWorkflowMode = String(workflowMode || "FINAL").toUpperCase();
    if (normalizedWorkflowMode === "FINAL" && !bracketPreview?.can_generate) {
      const blocker =
        bracketPreview?.blockers?.[0]
        || bracketPreviewError
        || selectedGenerationBlockers[0]
        || "This sport still has setup blockers. Resolve them before generating.";
      setMessage(blocker);
      setSeedModalError(blocker);
      return;
    }
    if (manualCandidates.length > 0) {
      const issues = validateManualSeedOrder();
      if (issues.length > 0) {
        setMessage(issues[0]);
        setSeedModalError(issues[0]);
        return;
      }
      if (normalizedWorkflowMode === "FINAL" && !bracketPreview?.can_generate) {
        const blocker =
          bracketPreview?.blockers?.[0]
          || selectedGenerationBlockers.find((entry) => !isManualSeedingReadinessBlocker(entry))
          || "This sport still has setup blockers. Resolve them before generating.";
        setMessage(blocker);
        setSeedModalError(blocker);
        return;
      }
      if (isManualSeedingMode && canManageGlobalBrackets && hasUnsavedManualSeedChanges) {
        const saved = await handleSaveManualSeedOrder();
        if (!saved) return;
      }
    }

    const currentFormat = String(selectedGenerationSport?.currentGeneratedFormat || "").toLowerCase();
    if (
      bracketPreview?.is_regeneration
      && currentFormat
      && currentFormat !== selectedGenerationFormat
      && !window.confirm(
        "Changing the format will regenerate this unactivated draft bracket. Continue?"
      )
    ) {
      return;
    }

    setGenerationBusy(true);
    setMessage("");
    setSeedModalError("");
    try {
      const payload = {
        tournament_id: tournamentId,
        sport_id: sportId,
        workflow_mode: normalizedWorkflowMode,
        format: selectedGenerationFormat,
        ...(tournamentSportEventId != null
          ? { tournament_sport_event_id: tournamentSportEventId }
          : {}),
      };
      if (manualSeedOrderIds.length > 0 && manualSeedingValidationErrors.length === 0) {
        payload.seeded_team_ids = manualSeedOrderIds.map((entry) => Number(entry));
      }
      const response = await generateBracket(payload);
      await reloadBrackets();
      await loadGenerationReadiness();
      setSelectedBracketId(Number(response?.id || 0) || null);
      setMessage(
        response?.note
          || (normalizedWorkflowMode === "DRAFT"
            ? "Provisional draft bracket generated for planning."
            : "Final bracket generated successfully for the selected event category.")
      );
      setIsManualSeedModalOpen(false);
    } catch (error) {
      if (Number(error?.response?.status || 0) === 409) {
        await loadGenerationReadiness();
      }
      const failureMessage = formatBracketGenerationError(error, normalizedWorkflowMode);
      setMessage(failureMessage);
      setSeedModalError(failureMessage);
    } finally {
      setGenerationBusy(false);
    }
  }, [
    canManageBrackets,
    generationTournamentId,
    handleSaveManualSeedOrder,
    bracketPreview,
    bracketPreviewError,
    canManageGlobalBrackets,
    hasUnsavedManualSeedChanges,
    isManualSeedingMode,
    loadGenerationReadiness,
    manualSeedOrderIds,
    selectedGenerationBlockers,
    selectedGenerationFormat,
    selectedGenerationSport?.currentGeneratedFormat,
    selectedGenerationSport?.sportId,
    selectedGenerationSport?.tournamentSportEventId,
    reloadBrackets,
    selectedSportGenerationLocked,
    selectedSportHasCompletedBracket,
    validateManualSeedOrder,
  ]);

  const handleGenerateAllSports = useCallback(async (workflowMode = "FINAL") => {
    if (!canManageBrackets) return;
    if (generationBusy) return;
    const tournamentId = Number(generationTournamentId || 0);
    if (tournamentId <= 0) {
      setMessage("Select an intramural first from the Intramurals page.");
      return;
    }

    const normalizedWorkflowMode = String(workflowMode || "FINAL").toUpperCase();
    setGenerationBusy(true);
    setMessage("");
    try {
      const response = await generateAllBrackets({
        tournament_id: tournamentId,
        workflow_mode: normalizedWorkflowMode,
        generate_ready_only: false,
      });
      await reloadBrackets();
      await loadGenerationReadiness();
      const generated = Number(response?.generated_count || 0);
      const skipped = Number(response?.skipped_count || 0);
      const failed = Number(response?.failed_count || 0);
      setMessage(
        normalizedWorkflowMode === "DRAFT"
          ? `Draft bracket batch complete: ${generated} generated, ${skipped} skipped, ${failed} failed.`
          : `Final bracket batch complete: ${generated} generated, ${skipped} skipped, ${failed} failed.`
      );
    } catch (error) {
      const status = Number(error?.response?.status || 0);
      const detail = error?.response?.data?.detail;
      const code = String(detail?.code || detail?.error?.code || "").toUpperCase();
      if (status === 409 && code === "INCOMPLETE_BRACKET_SETUP") {
        setGenerateReadyOnlyModalOpen(true);
        return;
      }
      if (status === 409) {
        await loadGenerationReadiness();
      }
      setMessage(formatBracketGenerationError(error, normalizedWorkflowMode));
    } finally {
      setGenerationBusy(false);
    }
  }, [canManageBrackets, generationBusy, generationTournamentId, loadGenerationReadiness, reloadBrackets]);

  const handleOpenSeedReview = useCallback(() => {
    if (generationBusy || manualSeedingBusy) return;
    setSeedModalError("");
    if (!selectedGenerationSport) {
      setMessage("Select an event category first to review seed order.");
      return;
    }
    setIsManualSeedModalOpen(true);
  }, [generationBusy, manualSeedingBusy, selectedGenerationSport]);

  const handleOpenActivateAll = useCallback(() => {
    if (activationBusy) return;
    setActivationResult(null);
    setActivationError("");
    if (generationTournamentId <= 0) {
      setMessage("Open the bracket page from an intramural first.");
      return;
    }
    setShowConfirmAll(true);
  }, [activationBusy, generationTournamentId]);

  const confirmCloseSeedModal = useCallback(() => {
    setSeedCloseConfirmOpen(false);
    setSeedModalError("");
    setIsManualSeedModalOpen(false);
  }, []);

  const confirmGenerateReadyOnly = useCallback(async () => {
    const tournamentId = Number(generationTournamentId || 0);
    if (tournamentId <= 0) {
      setGenerateReadyOnlyModalOpen(false);
      return;
    }
    setGenerationBusy(true);
    setGenerateReadyOnlyModalOpen(false);
    try {
      const fallbackResponse = await generateAllBrackets({
        tournament_id: tournamentId,
        generate_ready_only: true,
      });
      await reloadBrackets();
      await loadGenerationReadiness();
      const generated = Number(fallbackResponse?.generated_count || 0);
      const skipped = Number(fallbackResponse?.skipped_count || 0);
      const failed = Number(fallbackResponse?.failed_count || 0);
      setMessage(
        `Ready brackets generated: ${generated} generated, ${skipped} skipped, ${failed} failed.`
      );
    } catch (fallbackError) {
      const fallbackDetail = fallbackError?.response?.data?.detail;
      setMessage(
        typeof fallbackDetail === "string"
          ? fallbackDetail
          : "Failed to generate ready brackets."
      );
    } finally {
      setGenerationBusy(false);
    }
  }, [generationTournamentId, loadGenerationReadiness, reloadBrackets]);

  const handleActivateAll = useCallback(async () => {
    if (!canManageBrackets) return;
    if (activationBusy) return;
    if (generationTournamentId <= 0) {
      setShowConfirmAll(false);
      setActivationError("Open the bracket page from an intramural first.");
      return;
    }
    setShowConfirmAll(false);
    setActivationBusy(true);
    setActivationResult(null);
    setActivationError("");
    try {
      const sportId = activationSportId ? Number(activationSportId) : null;
      const tournamentId = generationTournamentId > 0 ? Number(generationTournamentId) : null;
      const result = await activateAllBrackets({ sportId, tournamentId });
      setActivationResult(result);
      await reloadBrackets();
    } catch (error) {
      const status = error?.response?.status;
      if (status === 403) {
        setActivationError("You are not authorized to activate all brackets.");
      } else if (status === 404) {
        setActivationError("Selected sport not found.");
      } else {
        setActivationError(formatBracketActivationError(error));
      }
    } finally {
      setActivationBusy(false);
    }
  }, [activationBusy, activationSportId, canManageBrackets, generationTournamentId, reloadBrackets]);

  const handleActivateSingle = useCallback(async (bracketId) => {
    if (!canManageBrackets) return;
    setSingleActivatingId(bracketId);
    setActivationResult(null);
    setActivationError("");
    try {
      const result = await activateBracket(bracketId);
      setActivationResult({
        activated_count: result?.status === "ACTIVE" ? 1 : 0,
        already_active_count: result?.message?.includes("already") ? 1 : 0,
        skipped_count: 0,
        skipped: [],
        message: result?.message || "Bracket activated.",
        _single: true,
      });
      await reloadBrackets();
    } catch (error) {
      const status = error?.response?.status;
      if (status === 403) {
        setActivationError("You are not authorized to activate this bracket.");
      } else if (status === 409) {
        setActivationError(formatBracketActivationError(error));
      } else if (status === 400) {
        setActivationError(formatBracketActivationError(error));
      } else {
        setActivationError(formatBracketActivationError(error));
      }
    } finally {
      setSingleActivatingId(null);
    }
  }, [canManageBrackets, reloadBrackets]);

  useEffect(() => {
    if (!selectedBracketId) {
      setMatches([]);
      return undefined;
    }

    let active = true;
    const loadMatches = async ({ background = false } = {}) => {
      try {
        const rows = await getBracketMatches(selectedBracketId);
        if (!active) return;
        setMatches(
          (Array.isArray(rows) ? rows : []).map((row) => ({
            ...row,
            config_status: String(row?.config_status || "UNKNOWN").toUpperCase(),
            config_issues: Array.isArray(row?.config_issues) ? row.config_issues : [],
          }))
        );
      } catch (error) {
        if (!active || background) return;
        setMessage(error.response?.data?.detail || "Failed to load bracket matches.");
        setMatches([]);
      }
    };

    void loadMatches();
    const intervalId = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void loadMatches({ background: true });
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [selectedBracketId]);

  useEffect(() => {
    const requestedMatchId = Number(searchParams.get("match_id") || 0);
    if (!requestedMatchId) return;
    if (!canOpenSelectedBracketLiveScoring || matches.length === 0) {
      const next = new URLSearchParams(searchParams);
      next.delete("match_id");
      setSearchParams(next, { replace: true });
      return;
    }
    const matchRow = matches.find((row) => Number(row.id) === requestedMatchId);
    if (!matchRow) return;
    handleOpenMatchCenter(matchRow);
    const next = new URLSearchParams(searchParams);
    next.delete("match_id");
    setSearchParams(next, { replace: true });
  }, [canOpenSelectedBracketLiveScoring, handleOpenMatchCenter, matches, searchParams, setSearchParams]);

  const adjustBracketZoom = useCallback((delta) => {
    setBracketZoom((current) => {
      const next = current + delta;
      if (next < 0.6) return 0.6;
      if (next > 1.5) return 1.5;
      return Number(next.toFixed(2));
    });
  }, []);

  const resetBracketView = useCallback(() => {
    setBracketZoom(1);
  }, []);
  const isSuccessMessage = useMemo(
    () =>
      typeof message === "string"
      && (
        message.toLowerCase().includes("success")
        || message.toLowerCase().includes("generated successfully")
      ),
    [message]
  );

  // --- Presentational derivations for the summary + schedule panels (no new API) ---
  const bracketTeamsCount = useMemo(() => {
    const seedTable = selectedBracket?.seeding_summary?.seed_table;
    if (Array.isArray(seedTable) && seedTable.length > 0) return seedTable.length;
    const teamIds = new Set();
    (Array.isArray(matches) ? matches : []).forEach((row) => {
      if (row?.team1_id) teamIds.add(Number(row.team1_id));
      if (row?.team2_id) teamIds.add(Number(row.team2_id));
    });
    return teamIds.size;
  }, [matches, selectedBracket?.seeding_summary?.seed_table]);

  const pageHeader = (
    <>
      {isViewingHistorical && <HistoricalBanner />}
      <PageHeaderCard
        icon={GitBranch}
        title={pageTitle}
        breadcrumbs={<Breadcrumbs trail={[{ label: "Intramural" }, { label: "Brackets" }]} />}
        subtitle={
          pageSubtitle ||
          (isReadOnlyMode
            ? "Unified bracket view with read-only access for this role."
            : "Generate, manage, and monitor intramural brackets in one place.")
        }
      />
    </>
  );
  const bracketPageResolving = autoTournamentResolving || loading;
  const hasGeneratedBrackets = visibleBrackets.length > 0;
  const showEmptyBracketPage =
    !bracketPageResolving &&
    (!selectedIntramural || generationTournamentId <= 0 || (!hasGeneratedBrackets && !showBracketSetup));

  if (bracketPageResolving) {
    return (
      <div className="os-themed-page space-y-6">
        {pageHeader}
        <section className="mx-auto flex min-h-72 w-full max-w-2xl flex-col items-center justify-center px-5 py-12 text-center" aria-live="polite">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-[var(--surface-soft)] dark:text-slate-300">
            <GitBranch size={23} aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Loading brackets</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Checking the selected Intramural for generated brackets.</p>
        </section>
      </div>
    );
  }

  if (showEmptyBracketPage) {
    const hasTournament = generationTournamentId > 0;
    return (
      <div className="os-themed-page space-y-6">
        {pageHeader}
        <section className="mx-auto flex min-h-72 w-full max-w-2xl flex-col items-center justify-center px-5 py-12 text-center" aria-live="polite">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-[var(--surface-soft)] dark:text-slate-300">
            <GitBranch size={23} aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {!selectedIntramural ? "No Intramural selected" : !hasTournament ? "No tournament configured" : "No brackets yet"}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-400">
            {!selectedIntramural
              ? "Create or select an Intramural to view its brackets."
              : !hasTournament
                ? "Configure a tournament for this Intramural before creating brackets."
                : isReadOnlyMode
                  ? "Generated brackets will appear here once they are created by the coordinator."
                  : "Set up and generate brackets when the competition entries are ready."}
          </p>
          {canManageBrackets && hasTournament ? (
            <button
              type="button"
              onClick={() => setShowBracketSetup(true)}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 dark:bg-cyan-600 dark:hover:bg-cyan-500"
            >
              Set Up Brackets
            </button>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className="os-themed-page space-y-6">
      {pageHeader}
      {introContent}

      {/* Global Alerts Container */}
      <div className="flex flex-col gap-3">
        {message && (
          <div className={`relative rounded-xl px-4 py-3 pr-10 text-sm ${
            isSuccessMessage
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
          }`}>
            {message}
            <button type="button" onClick={() => setMessage("")} className={`absolute right-2 top-2 rounded-lg p-1.5 ${
              isSuccessMessage
                ? "text-emerald-500 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300"
                : "text-amber-500 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-500/20 dark:hover:text-amber-300"
            }`}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {activationError && (
          <div className="relative flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 pr-10 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{activationError}</span>
            <button type="button" onClick={() => setActivationError("")} className="absolute right-2 top-2 p-1.5 text-rose-500 hover:bg-rose-100 hover:text-rose-700 rounded-lg dark:hover:bg-rose-500/20 dark:hover:text-rose-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {activationResult && (
          <div className="relative rounded-xl border border-emerald-200 bg-emerald-50 p-4 pr-10 dark:border-emerald-500/40 dark:bg-emerald-500/10">
            <button type="button" onClick={() => setActivationResult(null)} className="absolute right-2 top-2 p-1.5 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                {activationResult.message || "Activation complete."}
              </span>
            </div>
            {!activationResult._single && (
              <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                {activationResult.activated_count ?? 0} activated, {activationResult.already_active_count ?? 0} already active, {activationResult.skipped_count ?? 0} skipped.
              </div>
            )}
            {Array.isArray(activationResult.skipped) && activationResult.skipped.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                {activationResult.skipped.map((s) => (
                  <li key={`skipped-${s.bracket_id}`}>
                    Bracket #{s.bracket_id} — {s.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Bracket toolbar: sport selector + info on the left, actions on the right */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          {generationSportOptions.length > 0 ? (
            <div className="relative inline-flex items-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 shadow-xs transition-colors hover:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20">
              <GitBranch className="mr-2 h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden="true" />
              <select
                id="coordinator-bracket-target"
                aria-label="Sport / Event"
                value={generationSportId}
                onChange={(event) => setGenerationSportId(event.target.value)}
                className="cursor-pointer appearance-none bg-transparent pr-7 text-sm font-bold text-[var(--text-main)] outline-none focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 [color-scheme:light] dark:[color-scheme:dark]"
                disabled={generationTournamentId <= 0}
              >
                <option value="" className="bg-[var(--surface)] text-[var(--text-main)]">Select a sport event</option>
                {generationSportGroups.map((group) => (
                  <optgroup key={`coord-group-${group.sportId}`} label={group.sportName} className="bg-[var(--surface)] text-[var(--text-main)] font-semibold">
                    {group.targets.map((row) => {
                      const optionLabel = getCleanEventOptionLabel(row);
                      return (
                        <option key={`coord-target-${row.targetKey}`} value={String(row.targetKey || "")} className="bg-[var(--surface)] text-[var(--text-main)] font-normal">
                          {optionLabel}
                        </option>
                      );
                    })}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border-soft)] px-3 py-2 text-sm text-[var(--text-muted)]">
              Targets appear once tournament sports are configured.
            </div>
          )}

          {selectedGenerationSport && isNonBracketEvent(selectedGenerationSport) ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                Multi-Contestant Timed Race
              </span>
              <span className="opacity-40">•</span>
              <span className="font-semibold text-[var(--text-main)]">
                {selectedGenerationSport.approvedParticipantCount ?? selectedGenerationSport.valid_entries_count ?? 0} Approved Entries
              </span>
              <span className="opacity-40">•</span>
              <span className="text-[var(--text-muted)]">
                Preliminary Heats &amp; Championship Finals
              </span>
            </div>
          ) : selectedBracket ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text-main)]">
                {formatBracketFormatLabel(selectedBracket.format)}
              </span>
              <span className="opacity-40">•</span>
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                BRACKET_STATUS_CLASSES[selectedBracketStatus] || BRACKET_STATUS_CLASSES.DRAFT
              }`}>
                {selectedBracketStatus ? formatStatusLabel(selectedBracketStatus) : "Draft"}
              </span>
              <span className="opacity-40">•</span>
              <span className="font-semibold text-[var(--text-main)]">{bracketTeamsCount} Teams</span>
              <span className="opacity-40">•</span>
              <span className="text-[var(--text-muted)]">
                Seeding: {formatSeedingModeLabel(selectedSeedingMode)}
              </span>
            </div>
          ) : null}

          {isReadOnlyMode && (
            <span className="inline-flex items-center rounded-md border border-[var(--border-soft)] bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
              Read-only
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageBrackets && (
            <>
              {!isNonBracketEvent(selectedGenerationSport) ? (
                <button
                  type="button"
                  onClick={handleOpenSeedReview}
                  className="relative inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:opacity-90"
                  title={!selectedGenerationSport ? "Select an event category first." : ""}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Generate Bracket
                  {isManualSeedingMode && manualSeedingValidationErrors.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">!</span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRaceHeatsModalTrigger((prev) => prev + 1)}
                  className="relative inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500 cursor-pointer"
                  title="Configure preliminary heats and final stage"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Heats &amp; Finals
                </button>
              )}

              {canManageGlobalBrackets ? (
                <button
                  type="button"
                  onClick={handleOpenActivateAll}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-500"
                  title={generationTournamentId <= 0 ? "Open this page from an intramural first." : ""}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {activationBusy ? "Activating..." : "Activate Brackets"}
                </button>
              ) : null}

              {selectedBracket && (selectedBracketStatus === "DRAFT" || selectedBracketStatus === "GENERATED") ? (
                <button
                  type="button"
                  onClick={() => handleActivateSingle(selectedBracket.id)}
                  disabled={singleActivatingId === selectedBracket.id || activationBusy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                >
                  {singleActivatingId === selectedBracket.id ? "Activating…" : "Activate This Bracket"}
                </button>
              ) : null}

              {canManageGlobalBrackets ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleGenerateAllSports("FINAL")}
                    disabled={generationBusy || generationTournamentId <= 0}
                    className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-main)] transition hover:bg-[var(--surface-soft)] disabled:opacity-60"
                  >
                    {generationBusy ? "Processing..." : "Generate All (Final)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateAllSports("DRAFT")}
                    disabled={generationBusy || generationTournamentId <= 0}
                    className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-main)] transition hover:bg-[var(--surface-soft)] disabled:opacity-60"
                  >
                    {generationBusy ? "Processing..." : "Generate All (Draft)"}
                  </button>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>

      {generationTournamentId <= 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
          {autoTournamentResolving
            ? "Loading active tournament brackets..."
            : "No active tournament is available yet. Start or create a tournament, then open Brackets."}
        </div>
      ) : null}


      <div className="bracket-workspace-grid grid grid-cols-1 gap-6 items-start">
        <main className="bracket-main-column flex min-w-0 flex-col gap-6">
          {selectedGenerationSport && isNonBracketEvent(selectedGenerationSport) ? (
            <RaceStageProgressionWorkspace
              eventId={selectedGenerationSport.tournamentSportEventId}
              sport={selectedGenerationSport}
              canManage={canManageBrackets}
              isReadOnlyMode={isReadOnlyMode}
              openGenerateModalTrigger={raceHeatsModalTrigger}
              onRefreshReadiness={loadGenerationReadiness}
            />
          ) : (
            <>
              <DashboardCard noPadding>
            <div className="px-4 sm:px-6 pt-4 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {selectedBracket
                      ? selectedBracketTargetLabel
                      : selectedGenerationSport?.targetLabel || "Bracket Visualization"}
                  </h3>
                  {(selectedBracketParticipantShapeLabel || selectedGenerationParticipantShapeLabel) ? (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {selectedBracketParticipantShapeLabel || selectedGenerationParticipantShapeLabel}
                    </span>
                  ) : null}
                  {selectedBracket?.format ? (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {formatBracketFormatLabel(selectedBracket.format)}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 p-1 dark:border-slate-700 dark:bg-slate-800/60">
                  <button
                    type="button"
                    onClick={() => adjustBracketZoom(-0.1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-xs dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                    title="Zoom Out"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustBracketZoom(0.1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-xs dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                    title="Zoom In"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setBracketZoom(1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-xs dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                    title="Fit to Screen"
                    aria-label="Fit to screen"
                  >
                    <Scan className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={resetBracketView}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-xs dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                    title="Reset View"
                    aria-label="Reset view"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                  <span className="px-2 text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                    {Math.round(bracketZoom * 100)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="min-h-[22rem] overflow-x-auto overscroll-x-contain touch-pan-x px-2 py-3 sm:min-h-[24rem] sm:px-6 sm:py-6">
	              {!selectedBracket ? (
	                <div className="flex min-h-[20rem] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 sm:min-h-[36rem] sm:p-10 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
	                  {selectedGenerationSport
	                    ? `No generated bracket is available yet for ${selectedGenerationSport.targetLabel}. Use Generate Bracket to create one.`
	                    : "Select a Sport / Event above, then generate a bracket to view it here."}
	                </div>
	              ) : matches.length === 0 ? (
                <div className="flex min-h-[20rem] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 sm:min-h-[36rem] sm:p-10 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                  No matches available for this bracket yet.
                </div>
              ) : (
                <div style={{ transform: `scale(${bracketZoom})`, transformOrigin: "top left", width: `${100 / bracketZoom}%` }}>
                  <ModernBracketView
                    matches={matches}
                    format={selectedBracket.format}
                    onViewMatchScore={handleViewMatchScore}
                  />
                </div>
              )}
            </div>
          </DashboardCard>

          <DashboardCard noPadding>
            <div className="p-4 md:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Match Table</h2>
                <input
                  type="text"
                  value={matchSearch}
                  onChange={(event) => setMatchSearch(event.target.value)}
                  placeholder="Search match, team, round, venue..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 sm:w-72 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Desktop & Tablet Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <th className="pb-2 pr-4 font-semibold whitespace-nowrap">Match</th>
                      <th className="pb-2 pr-4 font-semibold whitespace-nowrap">Round</th>
                      <th className="pb-2 pr-4 font-semibold">Teams</th>
                      <th className="pb-2 pr-4 font-semibold whitespace-nowrap">Status</th>
                      <th className="pb-2 pr-4 font-semibold whitespace-nowrap">Score</th>
                      <th className="pb-2 font-semibold whitespace-nowrap text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {!selectedBracket || filteredMatches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-sm text-slate-400">
                          No match records yet.
                        </td>
                      </tr>
                    ) : (
                      filteredMatches.map((match) => {
                        const canOpenMatchCenter = hasResolvedMatchParticipants(match);
                        const visibilityStatus = resolveVisibilityStatus(match);
                        const isConfigBlocked = blockedStatuses.has(visibilityStatus);
                        const statusUp = String(match.status || "").toUpperCase();
                        const statusChipClass = MATCH_STATUS_CHIP_CLASSES[statusUp] || "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-300";
                        return (
                          <tr key={match.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 pr-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{match.match_number || "-"}</td>
                            <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">{match.round || "-"}</td>
                            <td className="py-2.5 pr-4 text-slate-800 dark:text-slate-200">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                  <TeamLogo
                                    imageUrl={match.team1_logo_url || match.unitA_logo_url}
                                    label={getMatchParticipantLabel(match, 1)}
                                    scale="sm"
                                  />
                                  <span className="truncate max-w-[200px]">{getMatchParticipantLabel(match, 1)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <TeamLogo
                                    imageUrl={match.team2_logo_url || match.unitB_logo_url}
                                    label={getMatchParticipantLabel(match, 2)}
                                    scale="sm"
                                  />
                                  <span className="truncate max-w-[200px]">{getMatchParticipantLabel(match, 2)}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 pr-4 whitespace-nowrap">
                              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusChipClass}`}>
                                {match.status ? formatStatusLabel(match.status) : "-"}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {match.score_team1 ?? 0} – {match.score_team2 ?? 0}
                            </td>
                            <td className="py-2.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-2">
                                {canOpenMatchCenter && canOpenSelectedBracketLiveScoring ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenMatchCenter(match)}
                                    className={`whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                                      isConfigBlocked
                                        ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
                                        : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300"
                                    }`}
                                  >
                                    {isConfigBlocked ? "Scoring Blocked" : "Open Live Scoring"}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => setDetailDrawerMatch(match)}
                                  className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                  Details
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List (< 640px) */}
              <div className="block sm:hidden space-y-3">
                {!selectedBracket || filteredMatches.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
                    No match records yet.
                  </div>
                ) : (
                  filteredMatches.map((match) => {
                    const canOpenMatchCenter = hasResolvedMatchParticipants(match);
                    const visibilityStatus = resolveVisibilityStatus(match);
                    const isConfigBlocked = blockedStatuses.has(visibilityStatus);
                    const statusUp = String(match.status || "").toUpperCase();
                    const statusChipClass = MATCH_STATUS_CHIP_CLASSES[statusUp] || "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-300";
                    return (
                      <div
                        key={`m-match-${match.id}`}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80"
                      >
                        <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-700/60">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Match {match.match_number || "-"} • {match.round || "-"}
                          </span>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusChipClass}`}>
                            {match.status ? formatStatusLabel(match.status) : "-"}
                          </span>
                        </div>
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <TeamLogo
                                imageUrl={match.team1_logo_url || match.unitA_logo_url}
                                label={getMatchParticipantLabel(match, 1)}
                                scale="sm"
                              />
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                {getMatchParticipantLabel(match, 1)}
                              </span>
                            </div>
                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                              {match.score_team1 ?? 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <TeamLogo
                                imageUrl={match.team2_logo_url || match.unitB_logo_url}
                                label={getMatchParticipantLabel(match, 2)}
                                scale="sm"
                              />
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                {getMatchParticipantLabel(match, 2)}
                              </span>
                            </div>
                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                              {match.score_team2 ?? 0}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/40">
                          {canOpenMatchCenter && canOpenSelectedBracketLiveScoring ? (
                            <button
                              type="button"
                              onClick={() => handleOpenMatchCenter(match)}
                              className={`flex-1 rounded-lg border py-2 text-center text-xs font-semibold transition ${
                                isConfigBlocked
                                  ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
                                  : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300"
                              }`}
                            >
                              {isConfigBlocked ? "Scoring Blocked" : "Live Scoring"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setDetailDrawerMatch(match)}
                            className="flex-1 rounded-lg border border-slate-300 bg-white py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </DashboardCard>
            </>
          )}
        </main>
      </div>

      {/* Activation Confirmation Modal */}
      {canManageGlobalBrackets && (
        <AppModal
          open={showConfirmAll}
          onClose={() => setShowConfirmAll(false)}
          title="Confirm Activation"
          maxWidthClass="max-w-lg"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end w-full">
              <button
                type="button"
                onClick={() => setShowConfirmAll(false)}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActivateAll}
                disabled={activationBusy}
                className="min-h-10 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {activationBusy ? "Activating..." : "Confirm Activation"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Eligible draft and generated brackets in this tournament will be activated. Active, completed, and trashed brackets will be skipped.
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Target Sport
              </label>
              <select
                value={activationSportId}
                onChange={(e) => {
                  setActivationSportId(e.target.value);
                  setActivationResult(null);
                  setActivationError("");
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                disabled={activationBusy}
              >
                <option value="">All Sports in This Tournament</option>
                {generationSportGroups.map((sport) => (
                  <option key={`activate-modal-sport-${sport.sportId}`} value={sport.sportId}>
                    {sport.sportName || "Unassigned sport"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </AppModal>
      )}

      <ManualSeedingModal
        open={canManageBrackets && isManualSeedModalOpen && Boolean(selectedGenerationSport)}
        sectionRef={manualSeedingSectionRef}
        title={seedModalTitle}
        helpText={seedModeHelpText}
        targetLabel={selectedGenerationSport?.targetLabel}
        participantShapeLabel={formatParticipantShapeLabel(selectedGenerationSport?.participantShape)}
        bracketFormatLabel={formatBracketFormatLabel(selectedGenerationFormat)}
        supportedFormats={selectedGenerationSport?.supportedFormats || []}
        selectedFormat={selectedGenerationFormat}
        onFormatChange={(format) => {
          const targetKey = String(selectedGenerationSport?.targetKey || "");
          if (!targetKey) return;
          setGenerationFormatByTarget((current) => ({ ...current, [targetKey]: format }));
        }}
        bracketPreview={bracketPreview}
        bracketPreviewBusy={bracketPreviewBusy}
        bracketPreviewError={bracketPreviewError}
        seedingModeLabel={formatSeedingModeLabel(selectedSeedMode)}
        selectedSeedMode={selectedSeedMode}
        seedStatusReady={seedStatusReady}
        manualCandidates={manualCandidates}
        orderedManualCandidates={orderedManualCandidates}
        missingManualCandidates={missingManualCandidates}
        manualConfigSeedIds={manualConfigSeedIds}
        manualMissingTeamId={manualMissingTeamId}
        manualSeedingBusy={manualSeedingBusy}
        manualSeedingSaveBusy={manualSeedingSaveBusy}
        generationBusy={generationBusy}
        manualSeedingError={manualSeedingError}
        seedModalError={seedModalError}
        selectedSportGenerationLocked={selectedSportGenerationLocked}
        generationControlHint={generationControlHint}
        isEliminationSeedingPreview={isEliminationSeedingPreview}
        localManualFirstRoundPreview={localManualFirstRoundPreview}
        manualSeedingValidationErrors={manualSeedingValidationErrors}
        generationReady={Boolean(bracketPreview?.can_generate)}
        generationBlockers={Array.isArray(bracketPreview?.blockers) ? bracketPreview.blockers : []}
        isSeedOrderReadOnly={isSeedOrderReadOnly}
        getSeedSourceLabel={(teamId) => formatSeedSourceLabel(selectedSportSeedSourceByTeamId[Number(teamId)]?.source, selectedSeedMode, selectedGenerationFormatKey)}
        onClose={handleCloseSeedModal}
        onResetSeedOrder={resetSeedOrder}
        onSaveSeedOrder={handleSaveManualSeedOrder}
        onRegenerateRandomPreview={handleRegenerateRandomPreview}
        onMoveSeedOrder={moveSeedOrder}
        onRemoveFromSeedOrder={removeFromSeedOrder}
        onMissingTeamChange={setManualMissingTeamId}
        onAddToSeedOrder={(teamId) => {
          addToSeedOrder(teamId);
          setManualMissingTeamId("");
        }}
        onGenerate={() => handleGenerateSingleSport("FINAL")}
        showSeedSaveActions={canManageGlobalBrackets}
      />
      <AppModal
        open={seedCloseConfirmOpen}
        onClose={() => {
          if (manualSeedingSaveBusy) return;
          setSeedCloseConfirmOpen(false);
        }}
        title="Discard Unsaved Seed Changes?"
        subtitle="Manual seeding changes have not been saved yet."
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            You have unsaved manual seed order changes. Close without saving?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSeedCloseConfirmOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Keep Editing
            </button>
            <button
              type="button"
              onClick={confirmCloseSeedModal}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
            >
              Discard Changes
            </button>
          </div>
        </div>
      </AppModal>
      <AppModal
        open={generateReadyOnlyModalOpen}
        onClose={() => {
          if (generationBusy) return;
          setGenerateReadyOnlyModalOpen(false);
        }}
        title="Generate Ready Brackets Only?"
        subtitle="Some sports are not fully ready for bracket generation."
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Some sports are not ready. Generate brackets for ready sports only?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setGenerateReadyOnlyModalOpen(false)}
              disabled={generationBusy}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmGenerateReadyOnly}
              disabled={generationBusy}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {generationBusy ? "Generating..." : "Generate Ready Brackets"}
            </button>
          </div>
        </div>
      </AppModal>

      <ConfigLockedModal
        isOpen={Boolean(lockedModalMatch)}
        match={lockedModalMatch}
        onClose={closeLockedModal}
        onViewDetails={() => { closeLockedModal(); }}
        onKeepReadOnly={closeLockedModal}
        onReviewMigration={handleReviewMigration}
        onResolveAutomatically={handleResolveAutomatically}
        migrationPreview={migrationPreview}
        migrationError={migrationError}
        isReviewing={isReviewingMigration}
        isResolving={isResolvingMigration}
        canMigrate={canMigrateTemplates}
      />

      <AppModal
        open={Boolean(detailDrawerMatch)}
        onClose={() => setDetailDrawerMatch(null)}
        title={detailDrawerMatch ? `Match ${detailDrawerMatch.match_number || ""}`.trim() : "Match Details"}
        subtitle={detailDrawerMatch?.round ? `Round: ${detailDrawerMatch.round}` : ""}
        variant="drawer"
      >
        {detailDrawerMatch ? (
          <div className="space-y-5 p-5">
            {/* Teams & score */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <TeamLogo
                    imageUrl={detailDrawerMatch.team1_logo_url || detailDrawerMatch.unitA_logo_url}
                    label={detailDrawerMatch.team1_name || detailDrawerMatch.team1_label || "Unnamed team"}
                    scale="sm"
                  />
                  <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                    {detailDrawerMatch.team1_name || detailDrawerMatch.team1_label || (detailDrawerMatch.team1_id ? "Unnamed team" : "TBD")}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {detailDrawerMatch.score_team1 ?? 0} – {detailDrawerMatch.score_team2 ?? 0}
                </span>
                <div className="flex min-w-0 items-center justify-end gap-2">
                  <span className="truncate text-right text-sm font-medium text-slate-800 dark:text-slate-200">
                    {detailDrawerMatch.team2_name || detailDrawerMatch.team2_label || (detailDrawerMatch.team2_id ? "Unnamed team" : "TBD")}
                  </span>
                  <TeamLogo
                    imageUrl={detailDrawerMatch.team2_logo_url || detailDrawerMatch.unitB_logo_url}
                    label={detailDrawerMatch.team2_name || detailDrawerMatch.team2_label || "Unnamed team"}
                    scale="sm"
                  />
                </div>
              </div>
            </div>

            {/* Match metadata */}
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Status</dt>
                <dd className="font-semibold text-slate-800 dark:text-slate-100">
                  {detailDrawerMatch.status ? formatStatusLabel(detailDrawerMatch.status) : "-"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Calendar className="h-4 w-4" /> Schedule
                </dt>
                <dd className="text-right text-slate-700 dark:text-slate-200">
                  {detailDrawerMatch.schedule_label || detailDrawerMatch.scheduled_at || "-"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <MapPin className="h-4 w-4" /> Venue
                </dt>
                <dd className="text-right text-slate-700 dark:text-slate-200">
                  {detailDrawerMatch.venue_name || "-"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Configuration</dt>
                <dd>
                  <ConfigStatusBadge status={resolveVisibilityStatus(detailDrawerMatch)} />
                </dd>
              </div>
            </dl>

            {/* Seeding detail (bracket-scoped) */}
            {selectedBracket && (selectedBracketFirstRoundPreview.length > 0
              || (Array.isArray(selectedBracket?.seeding_summary?.seed_table) && selectedBracket.seeding_summary.seed_table.length > 0)
              || selectedBracket?.seeding_summary?.explanation) ? (
              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Seeding Detail</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Seeding Method: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatSeedingModeLabel(selectedSeedingMode)}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {selectedBracket?.seeding_summary?.explanation || "No seeding explanation available for the selected bracket."}
                </p>
                {selectedBracket?.seeding_summary?.format_note ? (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {selectedBracket.seeding_summary.format_note}
                  </p>
                ) : null}
                {selectedBracketFirstRoundPreview.length > 0 ? (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200">
                    <p className="font-semibold">Expected First Round</p>
                    <ol className="mt-1 list-decimal space-y-1 pl-4">
                      {selectedBracketFirstRoundPreview.map((row, index) => (
                        <li key={`seed-preview-${selectedBracket?.id || "na"}-${index}`}>{row}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                {Array.isArray(selectedBracket?.seeding_summary?.seed_table) && selectedBracket.seeding_summary.seed_table.length > 0 ? (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full min-w-[320px] text-xs">
                      <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                        <tr>
                          <th className="px-3 py-2">Seed</th>
                          <th className="px-3 py-2">Team</th>
                          <th className="px-3 py-2">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBracket.seeding_summary.seed_table.map((row) => (
                          <tr key={`seed-row-${selectedBracket.id}-${row.seed_number}-${row.team_id}`} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">{row.seed_number}</td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{row.team_name || "Unnamed team"}</td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                              {formatSeedSourceLabel(row.source, selectedSeedingMode, selectedBracket?.format)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </AppModal>
    </div>
  );
};

export default CoordinatorBrackets;
