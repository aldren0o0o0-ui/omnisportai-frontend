import { getSportDisplayName } from "../../../utils/tournamentEventCategories.js";

export const parseHour = (rawValue, fallback, min, max) => {
  const parsed = Number.parseInt(String(rawValue ?? ""), 10);
  if (!Number.isInteger(parsed)) return fallback;
  if (parsed < min || parsed > max) return fallback;
  return parsed;
};

export const overlapsTimeWindow = (startAt, endAt, windowStart, windowEnd) => {
  if (!(startAt instanceof Date) || !(endAt instanceof Date)) return false;
  if (!(windowStart instanceof Date) || !(windowEnd instanceof Date)) return false;
  return startAt < windowEnd && endAt > windowStart;
};

export const findOverlappingProgramBlock = (startAt, endAt, blocks = []) => {
  if (!(startAt instanceof Date) || !(endAt instanceof Date)) return null;
  const normalizedBlocks = Array.isArray(blocks) ? blocks : [];
  for (const block of normalizedBlocks) {
    const blockStart = block?.start instanceof Date ? block.start : new Date(block?.start);
    const blockEnd = block?.end instanceof Date ? block.end : new Date(block?.end);
    if (Number.isNaN(blockStart.getTime()) || Number.isNaN(blockEnd.getTime())) continue;
    if (overlapsTimeWindow(startAt, endAt, blockStart, blockEnd)) return block;
  }
  return null;
};

export const formatTimeRangeLabel = (startAt, endAt) => {
  if (!(startAt instanceof Date) || !(endAt instanceof Date)) return "Time window";
  return `${startAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${endAt.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  })}`;
};

export const parseProgramBlockDateTime = (rawValue) => {
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

export const buildBlockedMessage = (block) => {
  const start = block?.start instanceof Date ? block.start : parseProgramBlockDateTime(block?.start);
  const end = block?.end instanceof Date ? block.end : parseProgramBlockDateTime(block?.end);
  const title = String(block?.title || "Program Block");
  if (start && end) {
    return `This time is blocked for ${title} (${formatTimeRangeLabel(start, end)}).`;
  }
  return `This time is blocked for ${title}.`;
};

export const isMatchStartDisabled = (item) => {
  const statusText = String(item?.status || "").toUpperCase();
  if (statusText.includes("WAITING_OPPONENT")) {
    return "Waiting for opponent";
  }
  if (statusText.includes("COMPLETED") || statusText.includes("FINAL")) {
    return "Match already completed";
  }
  return "";
};

export const isLiveScoringDisabled = (item) => {
  const statusText = String(item?.status || "").toUpperCase();
  if (statusText.includes("WAITING_OPPONENT")) return "Waiting for opponent";
  return "";
};

export const PROGRAM_BLOCK_TYPE_LABELS = {
  OPENING_PROGRAM: "Opening Program",
  LUNCH_BREAK: "Lunch Break",
  CLOSING_CEREMONY: "Closing Ceremony",
  AWARDING: "Awarding",
  PREPARATION: "Preparation",
  MAINTENANCE: "Maintenance",
  CUSTOM: "Custom"
};

export const formatProgramBlockTypeLabel = (value) => {
  const key = String(value || "CUSTOM").toUpperCase();
  return PROGRAM_BLOCK_TYPE_LABELS[key] || "Program Block";
};

export const formatPreflightCategoryLabel = (value) =>
  String(value || "GENERAL")
    .toLowerCase()
    .split("_")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");

export const getConfidenceTone = (value) => {
  const key = String(value || "").toUpperCase();
  if (key === "HIGH") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
  if (key === "MEDIUM") return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
};

export const formatPreflightTimestamp = (value) => {
  if (!value) return "Not checked yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not checked yet";
  return parsed.toLocaleString();
};

export const getPreflightStatusExplanation = (preflightResult) => {
  const status = String(preflightResult?.status || "").toUpperCase();
  const confidence = String(preflightResult?.readiness_confidence || "ESTIMATED").toUpperCase();
  const exactStatus = String(preflightResult?.exact_feasibility_status || "NOT_RUN").toUpperCase();
  if (exactStatus === "FAILED") {
    return "These matches need schedule fixes before you can create a complete schedule.";
  }
  if (status === "READY" && confidence === "EXACT" && exactStatus === "PASSED") {
    return "Ready. Exact placement check passed.";
  }
  if (confidence === "ESTIMATED" && exactStatus === "NOT_RUN") {
    const hasRealWarnings = Array.isArray(preflightResult?.warnings) &&
      preflightResult.warnings.some(w => String(w?.code || "").toUpperCase() !== "EXACT_PLACEMENT_NOT_VERIFIED");
    if (!hasRealWarnings) {
      return "No setup blockers were found. This is an estimated check only. Run Exact Feasibility Check for a more reliable result before generating.";
    }
  }
  if (status === "WARNING") {
    return "The schedule can still be generated, but review the warnings before continuing.";
  }
  if (status === "BLOCKED") {
    return "Schedule generation is disabled because one or more issues make a valid schedule impossible.";
  }
  return "";
};

export const FIX_TARGET_ACTIONS = {
  venue_supported_sports: { label: "Manage Supported Sports", route: "/coordinator/venues" },
  venues: { label: "Open Venues", route: "/coordinator/venues" },
  venue_capacity: { label: "Edit Playing Areas", route: "/coordinator/venues" },
  program_blocks: { label: "Edit Tournament Program", route: "/coordinator/tournaments" },
  tournament_schedule_window: { label: "Edit Tournament Dates", route: "/coordinator/tournaments" },
  sport_duration: { label: "Edit Sport Duration", route: "/coordinator/sports" },
};

export const CATEGORY_ORDER = {
  VENUE_COMPATIBILITY: 0,
  CAPACITY: 1,
  TIME_WINDOW: 2,
  PROGRAM_BLOCK: 3,
  SPORT_CONFIGURATION: 4,
  TEAM_PLAYER_CONFLICT: 5,
  EXISTING_SCHEDULE: 6,
  PLACEHOLDER: 7,
  GENERAL: 8,
};

export const formatSnakeLabel = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const formatEvidenceLabel = (key) =>
  String(key || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const formatEvidenceValue = (key, value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && Number.isFinite(value) && key.toLowerCase().includes("minutes")) {
    return `${value} min`;
  }
  // Skip array rendering if key is unscheduled_matches (special handling below)
  if (Array.isArray(value)) {
    if (key.toLowerCase() === "unscheduled_matches") return null;
    if (value.length === 0) return "-";
    const primitive = value.every(
      (item) => ["string", "number", "boolean"].includes(typeof item)
    );
    if (primitive) return value.join(", ");
    return `${value.length} item(s)`;
  }
  if (typeof value === "object") {
    if (value.name) return String(value.name);
    if (value.label) return String(value.label);
    if (value.title) return String(value.title);
    if (value.code) return String(value.code);
    // Don't stringify unscheduled_matches or complex objects
    if (key.toLowerCase() === "unscheduled_matches") return null;
    const keys = Object.keys(value);
    return keys.length > 0 ? `${keys.length} field(s)` : "-";
  }
  return String(value);
};

export const formatVenueLabel = (venue, fallbackId = null) => {
  if (typeof venue === "string" && venue.trim()) return venue.trim();
  if (venue && typeof venue === "object") {
    const name = String(venue.name || venue.venue_name || "").trim();
    if (name) return name;
    const id = extractNumericId(venue.id, venue.venue_id);
    if (id) return "Unassigned venue";
  }
  const id = extractNumericId(fallbackId);
  return id ? "Unassigned venue" : "Not assigned";
};

export const formatDateTimeRange = (startValue, endValue) => {
  const startAt = startValue instanceof Date ? startValue : new Date(startValue || "");
  const endAt = endValue instanceof Date ? endValue : new Date(endValue || "");
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return "Not scheduled yet";
  const sameDay = startAt.toDateString() === endAt.toDateString();
  const dateLabel = startAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const startLabel = startAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const endLabel = endAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `${dateLabel}, ${startLabel}-${endLabel}`;
  const endDateLabel = endAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${dateLabel} ${startLabel} - ${endDateLabel} ${endLabel}`;
};

export const formatMatchMeta = (match) => {
  if (!match) return "Match";
  const roundText = getMatchRoundText(match);
  return roundText || "Match";
};

export const isPlaceholderTeamName = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized === "tbd" ||
    normalized === "to be determined" ||
    normalized === "team a" ||
    normalized === "team b" ||
    normalized === "unknown" ||
    normalized === "pending"
  );
};

export const resolveBestTeamName = (candidates = []) => {
  const cleaned = candidates
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
  if (!cleaned.length) return "";
  const concrete = cleaned.find((entry) => !isPlaceholderTeamName(entry));
  return concrete || cleaned[0];
};

export const getMatchDisplayName = (match) => {
  if (!match) return "Unknown Match";
  const sport = String(match.sport_name || match.sport || "Match").trim() || "Match";
  const team1 = resolveBestTeamName([
    match.team1_name,
    match.team_1_name,
    match.team1_label,
    match.team_1_label,
    match.teams?.team1?.name,
    match.teams?.team_1?.name,
    match.team1?.name,
    match.home_team_name,
    match.home_team?.name,
  ]) || "TBD";
  const team2 = resolveBestTeamName([
    match.team2_name,
    match.team_2_name,
    match.team2_label,
    match.team_2_label,
    match.teams?.team2?.name,
    match.teams?.team_2?.name,
    match.team2?.name,
    match.away_team_name,
    match.away_team?.name,
  ]) || "TBD";
  const placeholderLabel = String(
    match.placeholder_label || match.placeholderLabel || ""
  ).trim();
  const hasConcreteTeams = !isPlaceholderTeamName(team1) || !isPlaceholderTeamName(team2);
  if (!hasConcreteTeams && placeholderLabel) {
    const normalizedPlaceholder = placeholderLabel.toLowerCase().startsWith("waiting")
      ? placeholderLabel
      : `Waiting for earlier-round winner - ${placeholderLabel}`;
    return `${sport} - ${normalizedPlaceholder}`;
  }
  return `${sport} - ${team1} vs ${team2}`;
};

export const getMatchTeamsText = (match) => {
  if (!match) return "TBD vs TBD";
  const team1 = resolveBestTeamName([
    match.team1_name,
    match.team_1_name,
    match.team1_label,
    match.team_1_label,
    match.teams?.team1?.name,
    match.teams?.team_1?.name,
    match.team1?.name,
    match.home_team_name,
    match.home_team?.name,
  ]) || "TBD";
  const team2 = resolveBestTeamName([
    match.team2_name,
    match.team_2_name,
    match.team2_label,
    match.team_2_label,
    match.teams?.team2?.name,
    match.teams?.team_2?.name,
    match.team2?.name,
    match.away_team_name,
    match.away_team?.name,
  ]) || "TBD";
  const placeholderLabel = String(
    match.placeholder_label || match.placeholderLabel || ""
  ).trim();
  const hasConcreteTeams = !isPlaceholderTeamName(team1) || !isPlaceholderTeamName(team2);
  if (!hasConcreteTeams && placeholderLabel) {
    return placeholderLabel;
  }
  return `${team1} vs ${team2}`;
};

export const getMatchRoundText = (match) => {
  if (!match || !match.round) return "";
  const roundStr = String(match.round);
  return roundStr.toLowerCase().startsWith("round") ? roundStr : `Round ${roundStr}`;
};

export const getReasonLabel = (reasonCode) => {
  const code = String(reasonCode || "").toUpperCase();
  const labelMap = {
    NO_COMPATIBLE_VENUE: "No compatible venue",
    INSUFFICIENT_PLAYING_AREA_CAPACITY: "Insufficient venue capacity",
    SPORT_DURATION_TOO_LONG: "Sport duration too long",
    TOURNAMENT_WINDOW_TOO_SHORT: "Tournament window too short",
    NO_VALID_SLOT: "No valid slot found",
    PLACEHOLDER_FUTURE_ROUND: "Waiting for earlier rounds",
  };
  return labelMap[code] || formatSnakeLabel(code);
};

// Format unscheduled matches for display
export const formatUnscheduledMatches = (matches) => {
  if (!Array.isArray(matches)) return [];
  return matches
    .map((match) => ({
      ...match,
      displayName: getMatchDisplayName(match),
      reasonLabel: getReasonLabel(match.reason_code),
    }))
    .sort((a, b) => {
      // Real matches first, then placeholders
      const aIsPlaceholder = Boolean(a.is_placeholder);
      const bIsPlaceholder = Boolean(b.is_placeholder);
      if (aIsPlaceholder !== bIsPlaceholder) return aIsPlaceholder ? 1 : -1;
      return Number(a.match_id || 0) - Number(b.match_id || 0);
    });
};

export const buildEvidenceRows = (issue) => {
  const evidence = issue?.evidence && typeof issue.evidence === "object" ? issue.evidence : {};
  const rows = Object.entries(evidence)
    .filter(([key, value]) => {
      // Skip unscheduled_matches (handled separately)
      if (key.toLowerCase() === "unscheduled_matches") return false;
      return value !== null && value !== undefined && value !== "";
    })
    .map(([key, value]) => {
      const formattedValue = formatEvidenceValue(key, value);
      // Skip if formatter returned null (special case)
      if (formattedValue === null) return null;
      return {
        key,
        label: formatEvidenceLabel(key),
        value: formattedValue,
      };
    })
    .filter(Boolean);
  return rows;
};

export const normalizeResolutionOptions = (options) => {
  if (!Array.isArray(options)) return [];
  const dedup = new Map();
  const normalizeVerificationStatus = (option, optionType) => {
    const provided = String(option?.verification_status || "").toUpperCase().trim();
    const allowed = new Set(["VERIFIED", "PARTIAL", "GUIDE_ONLY", "STALE", "UNKNOWN"]);
    if (allowed.has(provided)) {
      if (provided !== "VERIFIED") return provided;
      if (!option?.safe_to_auto_apply) return "PARTIAL";
      const expected = String(option?.expected_effect || "").toLowerCase();
      if (expected.includes("may reduce") || expected.includes("expected to reduce")) return "PARTIAL";
      return "VERIFIED";
    }
    if (Boolean(option?.safe_to_auto_apply) && (optionType === "SHIFT_TIME" || optionType === "CHANGE_VENUE")) {
      return "VERIFIED";
    }
    if (optionType === "SHIFT_TIME" || optionType === "CHANGE_VENUE") return "PARTIAL";
    return "GUIDE_ONLY";
  };
  options.forEach((option, index) => {
    if (!option || typeof option !== "object") return;
    const optionType = String(option.option_type || "").toUpperCase();
    const label = String(option.label || "").trim();
    const key = optionType || label || `option-${index}`;
    const verificationStatus = normalizeVerificationStatus(option, optionType);
    if (dedup.has(key)) return;
    dedup.set(key, {
      option_type: optionType || "MANUAL_REVIEW",
      label: label || "Resolution option",
      explanation: String(option.explanation || option.description || "No explanation available."),
      confidence: String(option.confidence || "LOW").toUpperCase(),
      impact_summary: String(option.impact_summary || "").trim(),
      expected_effect: String(option.expected_effect || "").trim(),
      verification_status: verificationStatus,
      resolves_issue_codes: Array.isArray(option.resolves_issue_codes)
        ? option.resolves_issue_codes.map((code) => String(code || "").toUpperCase().trim()).filter(Boolean)
        : [],
      may_require_manual_changes: option?.may_require_manual_changes !== false,
      safe_to_auto_apply: Boolean(option.safe_to_auto_apply),
      limitations: Array.isArray(option.limitations)
        ? option.limitations.map((item) => String(item || "").trim()).filter(Boolean)
        : [],
      mutations: Array.isArray(option.mutations) ? option.mutations : [],
    });
  });
  return Array.from(dedup.values());
};

export const RESOLUTION_OPTION_PRIORITY = {
  SHIFT_TIME: 0,
  CHANGE_VENUE: 1,
  EXTEND_WINDOW: 2,
  MANUAL_REVIEW: 3,
};

export const RESOLUTION_OPTION_TITLES = {
  SHIFT_TIME: "Move to nearest valid time",
  CHANGE_VENUE: "Change to compatible venue",
  EXTEND_WINDOW: "Extend tournament window",
  MANUAL_REVIEW: "Manual review required",
};

export const RESOLUTION_OPTION_EXPLANATIONS = {
  SHIFT_TIME: "This option avoids program blocks, venue capacity conflicts, and team/player overlaps.",
  CHANGE_VENUE: "This option uses a compatible venue with available capacity while reducing overlap conflicts.",
  EXTEND_WINDOW: "This option increases schedule capacity when current time windows are fully constrained.",
  MANUAL_REVIEW: "This option flags the match for coordinator review when automatic changes are not yet available.",
};

export const getResolutionOptionPriority = (optionType) => {
  const key = String(optionType || "").toUpperCase();
  return RESOLUTION_OPTION_PRIORITY[key] ?? 99;
};

export const getResolutionOptionTitle = (optionType, fallbackLabel = "") => {
  const key = String(optionType || "").toUpperCase();
  return RESOLUTION_OPTION_TITLES[key] || String(fallbackLabel || "Resolution option");
};

export const getContextualResolutionTitle = (option, matchContext = null) => {
  const baseTitle = getResolutionOptionTitle(option?.option_type, option?.label);
  const optionType = String(option?.option_type || "").toUpperCase();
  const sportName = String(matchContext?.sport_name || matchContext?.sport || "").trim();
  const matchLabel = getMatchDisplayName(matchContext || {});
  const mutation = getSupportedRecommendationMutation(option);
  const payload = mutation && typeof mutation.payload === "object" ? mutation.payload : {};
  const targetVenue = formatVenueLabel(payload?.venue_name || "", payload?.venue_id);
  const startText = payload?.start ? formatDateTimeRange(payload.start, payload.end || payload.start) : "";
  if (optionType === "SHIFT_TIME" && startText && targetVenue !== "Not assigned") {
    return `Move ${sportName || "match"} to ${targetVenue} at ${startText}`;
  }
  if (optionType === "CHANGE_VENUE" && targetVenue !== "Not assigned") {
    return `Move ${sportName || "match"} to ${targetVenue}${startText ? ` at ${startText}` : ""}`;
  }
  if (optionType === "CHANGE_VENUE") {
    return `Find another compatible venue for ${sportName || "this match"}`;
  }
  if (optionType === "SHIFT_TIME") {
    return `Suggested time adjustment for ${matchLabel}`;
  }
  return baseTitle;
};

export const getResolutionOptionExplanation = (option) => {
  const key = String(option?.option_type || "").toUpperCase();
  return RESOLUTION_OPTION_EXPLANATIONS[key] || String(option?.explanation || "No explanation available.");
};

export const sortResolutionOptions = (options = []) => {
  return [...options].sort((a, b) => {
    const prioDiff =
      getResolutionOptionPriority(a?.option_type) - getResolutionOptionPriority(b?.option_type);
    if (prioDiff !== 0) return prioDiff;
    const confidenceWeight = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const aConfidence = confidenceWeight[String(a?.confidence || "LOW").toUpperCase()] ?? 9;
    const bConfidence = confidenceWeight[String(b?.confidence || "LOW").toUpperCase()] ?? 9;
    return aConfidence - bConfidence;
  });
};

export const canApplyRecommendationOption = (optionType) => {
  const key = String(optionType || "").toUpperCase().trim();
  return key === "SHIFT_TIME" || key === "CHANGE_VENUE";
};

export const isVerifiedRecommendationOption = (option) =>
  String(option?.verification_status || "").toUpperCase().trim() === "VERIFIED" &&
  Boolean(option?.safe_to_auto_apply) &&
  canApplyRecommendationOption(option?.option_type) &&
  hasCompleteSupportedMutation(option) &&
  !String(option?.expected_effect || "").toLowerCase().includes("may reduce") &&
  !String(option?.expected_effect || "").toLowerCase().includes("expected to reduce");

export const isAutoApplicableRecommendationOption = (option) =>
  canApplyRecommendationOption(option?.option_type) && Boolean(option?.safe_to_auto_apply);

export const getSupportedRecommendationMutation = (option) => {
  if (!option || typeof option !== "object") return null;
  const optionType = String(option.option_type || "").toUpperCase().trim();
  const expectedAction =
    optionType === "SHIFT_TIME" ? "MOVE_MATCH" : optionType === "CHANGE_VENUE" ? "CHANGE_MATCH_VENUE" : "";
  if (!expectedAction) return null;
  const mutations = Array.isArray(option.mutations) ? option.mutations : [];
  for (const mutation of mutations) {
    if (!mutation || typeof mutation !== "object") continue;
    const action = String(mutation.action || "").toUpperCase().trim();
    if (action === expectedAction) return mutation;
  }
  return null;
};

export const hasCompleteSupportedMutation = (option) => {
  const mutation = getSupportedRecommendationMutation(option);
  if (!mutation || typeof mutation.payload !== "object" || !mutation.payload) return false;
  const payload = mutation.payload;
  const venueId = Number(payload.venue_id);
  const start = String(payload.start || "").trim();
  const end = String(payload.end || "").trim();
  if (!Number.isFinite(venueId) || venueId <= 0 || !start || !end) return false;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return false;
  return endDate > startDate;
};

export const resolveRecommendationMatchId = ({ matchId, option }) => {
  const numericMatchId = Number(matchId);
  if (Number.isFinite(numericMatchId) && numericMatchId > 0) return Math.trunc(numericMatchId);
  const mutation = getSupportedRecommendationMutation(option);
  const targetId = Number(mutation?.target_id);
  if (Number.isFinite(targetId) && targetId > 0) return Math.trunc(targetId);
  return null;
};

export const isFullyApplicableRecommendationOption = ({ option, matchId }) =>
  isAutoApplicableRecommendationOption(option) &&
  isVerifiedRecommendationOption(option) &&
  hasCompleteSupportedMutation(option) &&
  Number.isFinite(Number(resolveRecommendationMatchId({ matchId, option })));

export const getRecommendationTrustLabel = (option) => {
  const status = String(option?.verification_status || "").toUpperCase().trim();
  if (status === "VERIFIED") return "Verified Fix";
  if (status === "PARTIAL" || status === "STALE") return "Suggested Action";
  return "Guide Only";
};

export const getRecommendationTrustTone = (option) => {
  const status = String(option?.verification_status || "").toUpperCase().trim();
  if (status === "VERIFIED") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
  if (status === "PARTIAL" || status === "STALE") return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
};

export const getRecommendationActionLabel = (option) => {
  const optionType = String(option?.option_type || "").toUpperCase();
  const verified = isVerifiedRecommendationOption(option);
  if (verified && optionType === "SHIFT_TIME") return "Apply Verified Time Fix";
  if (verified && optionType === "CHANGE_VENUE") return "Apply Verified Venue Fix";
  if (optionType === "SHIFT_TIME") return "Suggested action: Try another time";
  if (optionType === "CHANGE_VENUE") return "Suggested action: Try another venue";
  if (optionType === "EXTEND_WINDOW") return "Manual setup suggestion";
  return "Manual setup suggestion";
};

export const computeStableHash = (value) => {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
};

export const getIssueSeverityLabel = (issue) =>
  normalizeContractSeverity(issue?.severity, Boolean(issue?.blocking));

export const getIssueQuickActions = (issue, selectedTournamentId) => {
  const actions = [];
  const seen = new Set();
  const addAction = (label, route) => {
    const key = `${label}|${route || ""}`;
    if (!label || seen.has(key)) return;
    actions.push({ label, route });
    seen.add(key);
  };

  const fixTargets = Array.isArray(issue?.fix_targets) ? issue.fix_targets : [];
  fixTargets.forEach((target) => {
    const targetType = String(target?.type || "").toLowerCase();
    const mapped = FIX_TARGET_ACTIONS[targetType];
    if (!mapped) return;
    let route = mapped.route;
    if (route === "/coordinator/venues" && selectedTournamentId) {
      route = `/coordinator/intramurals/${selectedTournamentId}/settings/venues`;
    }
    if (route === "/coordinator/tournaments" && selectedTournamentId) {
      route = `/coordinator/tournaments?focus=${selectedTournamentId}`;
    }
    addAction(mapped.label, route);
  });

  addAction("Re-run Preflight", "");

  return actions.slice(0, 3);
};

export const groupIssuesByCategory = (issues = []) => {
  const map = new Map();
  issues.forEach((issue) => {
    const category = String(issue?.category || "GENERAL").toUpperCase();
    if (!map.has(category)) map.set(category, []);
    map.get(category).push(issue);
  });
  return Array.from(map.entries())
    .sort((a, b) => (CATEGORY_ORDER[a[0]] ?? 99) - (CATEGORY_ORDER[b[0]] ?? 99))
    .map(([category, rows]) => ({ category, rows }));
};

export const buildHumanConflictMessage = (conflict) => {
  if (!conflict) return "";
  if (typeof conflict === "string") return conflict;
  const evidenceRows = buildEvidenceRows(conflict).slice(0, 3);
  const evidenceSuffix =
    evidenceRows.length > 0
      ? ` Evidence: ${evidenceRows.map((row) => `${row.label}: ${row.value}`).join(" | ")}`
      : "";
  return String(conflict.message || conflict.reason || "Schedule conflict detected.") + evidenceSuffix;
};

export const normalizeContractSeverity = (severity, blocking = false) => {
  const key = String(severity || "").toUpperCase();
  if (key === "BLOCKING" || key === "HIGH") return "BLOCKING";
  if (key === "WARNING" || key === "MEDIUM") return "WARNING";
  if (key === "INFO" || key === "LOW") return "INFO";
  return blocking ? "BLOCKING" : "WARNING";
};

export const normalizeApiDetailMessage = (detail) => {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (typeof detail === "object") {
    return String(detail.message || detail.legacy_message || "").trim();
  }
  return String(detail);
};

export const hasBlockingConflictForMatch = (validationPayload, matchId) => {
  const targetMatchId = Number(matchId);
  if (!Number.isFinite(targetMatchId) || targetMatchId <= 0) return false;
  const conflicts = Array.isArray(validationPayload?.conflicts) ? validationPayload.conflicts : [];
  return conflicts.some((conflict) => {
    const severity = normalizeContractSeverity(conflict?.severity, Boolean(conflict?.blocking));
    if (severity !== "BLOCKING") return false;
    const directIds = Array.isArray(conflict?.match_ids) ? conflict.match_ids : [];
    if (directIds.some((id) => Number(id) === targetMatchId)) return true;
    const evidence = conflict?.evidence && typeof conflict.evidence === "object" ? conflict.evidence : {};
    const evidenceMatchId = Number(evidence.match_id ?? evidence.conflict_match_id ?? evidence.target_match_id);
    if (Number.isFinite(evidenceMatchId) && evidenceMatchId === targetMatchId) return true;
    const message = String(conflict?.message || "").toLowerCase();
    return message.includes(`match ${targetMatchId}`) || message.includes(`match #${targetMatchId}`);
  });
};

export const getConflictSeverityTone = (severity) => {
  const normalized = normalizeContractSeverity(severity);
  if (normalized === "BLOCKING") {
    return "border-rose-200 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/5";
  }
  if (normalized === "WARNING") {
    return "border-amber-200 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/5";
  }
  return "border-blue-200 bg-blue-50/60 dark:border-blue-500/30 dark:bg-blue-500/5";
};

export const getConflictBadgeTone = (severity) => {
  const normalized = normalizeContractSeverity(severity);
  if (normalized === "BLOCKING") {
    return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300";
  }
  if (normalized === "WARNING") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  }
  return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300";
};

export const ISSUE_SEVERITY_PRIORITY = {
  NONE: 0,
  INFO: 1,
  WARNING: 2,
  BLOCKING: 3
};

export const collectIssueMatchIds = (issue = null) => {
  const ids = new Set();
  const pushId = (rawId) => {
    const parsed = Number(rawId);
    if (Number.isFinite(parsed) && parsed > 0) {
      ids.add(Math.trunc(parsed));
    }
  };
  if (!issue || typeof issue !== "object") return ids;
  if (Array.isArray(issue.match_ids)) {
    issue.match_ids.forEach(pushId);
  }
  pushId(issue.match_id);
  const evidence = issue?.evidence && typeof issue.evidence === "object" ? issue.evidence : {};
  [
    evidence.match_id,
    evidence.target_match_id,
    evidence.conflict_match_id,
    evidence.primary_match_id,
    evidence.secondary_match_id
  ].forEach(pushId);
  if (Array.isArray(evidence.match_ids)) {
    evidence.match_ids.forEach(pushId);
  }
  if (Array.isArray(evidence.affected_matches)) {
    evidence.affected_matches.forEach((row) => {
      if (!row || typeof row !== "object") return;
      pushId(row.match_id ?? row.id);
    });
  }
  return ids;
};

export const buildIssueTitle = (issue) => {
  if (!issue) return "Schedule issue";
  const code = String(issue?.code || issue?.type || "").toUpperCase();
  const evidence = issue?.evidence && typeof issue.evidence === "object" ? issue.evidence : {};
  if (code === "VENUE_CONFLICT") {
    const venueLabel = formatVenueLabel(evidence?.venue_name || "", issue?.venue_id || evidence?.venue_id);
    return `${venueLabel} is over capacity`;
  }
  const direct = String(issue.message || issue.reason || "").trim();
  if (direct) return direct;
  if (issue.code) return formatSnakeLabel(issue.code);
  return "Schedule issue";
};

const ISSUE_CATEGORY_LABELS = {
  VENUE_COMPATIBILITY: "Venue Issues",
  CAPACITY: "Schedule Capacity",
  TIME_WINDOW: "Time Slot Issues",
  PROGRAM_BLOCK: "Program Block Issues",
  SPORT_CONFIGURATION: "Sport Setup Issues",
  TEAM_PLAYER_CONFLICT: "Team / Player Conflicts",
  EXISTING_SCHEDULE: "Existing Schedule Pressure",
  PLACEHOLDER: "Informational Notes",
  GENERAL: "Schedule Issues",
};

const ISSUE_TITLE_BY_CODE = {
  VENUE_CONFLICT: "Venue is double-booked.",
  TEAM_CONFLICT: "Team is double-booked.",
  PLAYER_CONFLICT: "Player has overlapping matches.",
  MISSING_SCHEDULE_SLOT: "Match needs a schedule slot.",
  NO_VALID_SLOT: "Match needs a schedule slot.",
  MISSING_VENUE_ASSIGNMENT: "Venue is missing.",
  VENUE_SPORT_CONFLICT: "Venue does not support this sport.",
  AVAILABILITY_CONFLICT: "Venue is unavailable.",
  LUNCH_BREAK_OVERLAP: "Match overlaps lunch break.",
  PROGRAM_BLOCK_OVERLAP: "Match overlaps a program block.",
  VENUE_TRANSITION_BUFFER_CONFLICT: "Not enough venue transition time.",
  PLACEHOLDER_FUTURE_ROUND: "Waiting for earlier-round winners.",
  EXACT_PLACEMENT_FAILED: "AI could not place all matches.",
  EXACT_PLACEMENT_NOT_VERIFIED: "Exact placement has not been verified.",
  EXACT_PLACEMENT_VERIFIED: "Exact placement passed.",
  NO_COMPATIBLE_VENUE: "No compatible venue.",
  SINGLE_COMPATIBLE_VENUE: "Only one compatible venue is available.",
  INSUFFICIENT_PLAYING_AREA_CAPACITY: "Not enough venue capacity.",
  INVALID_OPERATING_WINDOW: "Schedule window needs attention.",
  NO_ACTIVE_BRACKET: "Bracket is not ready.",
  SPORT_DURATION_TOO_LONG: "Sport duration is too long for the current schedule window.",
  PROGRAM_BLOCK_CAPACITY_REDUCTION: "Program blocks remove too much playable time.",
  LEGACY_GLOBAL_VENUE_FALLBACK: "Tournament venues are not assigned yet.",
  LUNCH_BREAK_RESPECTED: "Lunch break is protected.",
  EXISTING_SCHEDULE_PRESSURE: "Existing schedule is using available capacity.",
  SPORT_DURATION_DEFAULT_USED: "Sport duration needs review.",
  HIGH_VENUE_LOAD: "Venue load is high.",
  TIGHT_CAPACITY_MARGIN: "Capacity is tight.",
};

const ISSUE_EXPLANATION_BY_CODE = {
  VENUE_CONFLICT: "Too many matches are using the same venue at the same time.",
  TEAM_CONFLICT: "A team has overlapping matches and cannot attend both games.",
  PLAYER_CONFLICT: "A player is scheduled in overlapping matches.",
  MISSING_SCHEDULE_SLOT: "The system could not place this match into a valid time and venue.",
  NO_VALID_SLOT: "The system could not place this match into a valid time and venue.",
  MISSING_VENUE_ASSIGNMENT: "This match does not have a compatible venue assigned yet.",
  VENUE_SPORT_CONFLICT: "The selected venue is not configured for this sport.",
  AVAILABILITY_CONFLICT: "The venue is closed or restricted during this time.",
  LUNCH_BREAK_OVERLAP: "This match is scheduled during a protected lunch window.",
  PROGRAM_BLOCK_OVERLAP: "This match conflicts with a protected tournament activity or blocked window.",
  VENUE_TRANSITION_BUFFER_CONFLICT: "There is not enough changeover time between these matches.",
  PLACEHOLDER_FUTURE_ROUND: "This future-round match depends on earlier match results before it can be scheduled.",
  EXACT_PLACEMENT_FAILED: "The exact feasibility check could not fit all ready matches into the current venues and time window.",
  EXACT_PLACEMENT_NOT_VERIFIED: "The schedule looks feasible, but the solver has not confirmed exact placement yet.",
  EXACT_PLACEMENT_VERIFIED: "The exact dry-run placed all ready matches successfully.",
  NO_COMPATIBLE_VENUE: "A sport has no active venue that can host it.",
  SINGLE_COMPATIBLE_VENUE: "Only one venue can currently host this sport, which increases schedule risk.",
  INSUFFICIENT_PLAYING_AREA_CAPACITY: "The tournament needs more playable slots than the current venues and time window can provide.",
  INVALID_OPERATING_WINDOW: "The selected dates or daily hours do not create a usable schedule window.",
  NO_ACTIVE_BRACKET: "Schedule generation requires an active bracket before matches can be assigned.",
  SPORT_DURATION_TOO_LONG: "The configured match duration is longer than the available daily schedule window.",
  PROGRAM_BLOCK_CAPACITY_REDUCTION: "Protected program blocks remove the remaining time needed to schedule these matches.",
  LEGACY_GLOBAL_VENUE_FALLBACK: "The scheduler is falling back to global active venues because tournament-specific venues are not assigned.",
  EXISTING_SCHEDULE_PRESSURE: "Already scheduled matches are consuming capacity inside the current scheduling window.",
  SPORT_DURATION_DEFAULT_USED: "The sport still appears to use placeholder duration settings.",
  HIGH_VENUE_LOAD: "This sport is feasible, but venue usage is running high.",
  TIGHT_CAPACITY_MARGIN: "This schedule is feasible, but there is very little remaining capacity.",
  LUNCH_BREAK_RESPECTED: "Lunch break is being excluded from schedulable time as intended.",
};

const ISSUE_WHY_BY_CODE = {
  VENUE_CONFLICT: "Two or more matches overlap in a venue that does not have enough playing areas.",
  TEAM_CONFLICT: "The same team is assigned to more than one match at the same time.",
  PLAYER_CONFLICT: "The same player appears in multiple matches that overlap.",
  NO_COMPATIBLE_VENUE: "No active venue currently meets the sport and compatibility requirements.",
  INSUFFICIENT_PLAYING_AREA_CAPACITY: "Required match volume is higher than the available estimated slot capacity.",
  EXACT_PLACEMENT_FAILED: "Exact placement respects venue, time, team, player, and program-block constraints, and one or more matches still could not fit.",
  EXACT_PLACEMENT_NOT_VERIFIED: "This run used estimated capacity checks without a full exact dry-run.",
  PROGRAM_BLOCK_CAPACITY_REDUCTION: "Blocked tournament windows consumed the remaining usable slots.",
  INVALID_OPERATING_WINDOW: "The tournament date range or daily operating hours are incomplete, inverted, or too small.",
};

const ISSUE_FIX_BY_CODE = {
  VENUE_CONFLICT: "Move one match to another compatible venue or adjust the time.",
  TEAM_CONFLICT: "Move one match to a different time slot.",
  PLAYER_CONFLICT: "Move one match to protect player availability.",
  MISSING_SCHEDULE_SLOT: "Add available time, assign compatible venues, or reduce constraints.",
  NO_VALID_SLOT: "Add available time, assign compatible venues, or reduce constraints.",
  MISSING_VENUE_ASSIGNMENT: "Assign a compatible venue before finalizing.",
  VENUE_SPORT_CONFLICT: "Choose a compatible venue or update venue sport support.",
  AVAILABILITY_CONFLICT: "Choose another time or venue.",
  LUNCH_BREAK_OVERLAP: "Move the match outside the lunch break window.",
  PROGRAM_BLOCK_OVERLAP: "Move the match outside the protected program block.",
  VENUE_TRANSITION_BUFFER_CONFLICT: "Create a larger gap between venue uses or move one match.",
  PLACEHOLDER_FUTURE_ROUND: "No action is needed yet unless this placeholder becomes blocking.",
  EXACT_PLACEMENT_FAILED: "Add more time slots, assign more venues, reduce program blocks, or review match constraints.",
  EXACT_PLACEMENT_NOT_VERIFIED: "Run the exact feasibility check before generating for higher confidence.",
  NO_COMPATIBLE_VENUE: "Assign a compatible venue or update venue sport support.",
  SINGLE_COMPATIBLE_VENUE: "Add a backup venue or increase realistic venue capacity.",
  INSUFFICIENT_PLAYING_AREA_CAPACITY: "Add venues, increase playing areas, extend hours, or add tournament days.",
  INVALID_OPERATING_WINDOW: "Fix tournament dates or daily operating hours.",
  NO_ACTIVE_BRACKET: "Generate or activate bracket(s) before scheduling.",
  SPORT_DURATION_TOO_LONG: "Reduce sport duration or extend the schedule window.",
  PROGRAM_BLOCK_CAPACITY_REDUCTION: "Adjust program block times or extend the tournament window.",
  LEGACY_GLOBAL_VENUE_FALLBACK: "Assign tournament-specific venues for tighter control.",
};

const ISSUE_CODE_PRIORITY = {
  EXACT_PLACEMENT_FAILED: 0,
  VENUE_CONFLICT: 1,
  TEAM_CONFLICT: 2,
  PLAYER_CONFLICT: 3,
  MISSING_SCHEDULE_SLOT: 4,
  NO_VALID_SLOT: 4,
  PROGRAM_BLOCK_OVERLAP: 5,
  LUNCH_BREAK_OVERLAP: 5,
  VENUE_SPORT_CONFLICT: 6,
  AVAILABILITY_CONFLICT: 6,
  VENUE_TRANSITION_BUFFER_CONFLICT: 6,
  NO_COMPATIBLE_VENUE: 7,
  INSUFFICIENT_PLAYING_AREA_CAPACITY: 8,
  INVALID_OPERATING_WINDOW: 9,
  NO_ACTIVE_BRACKET: 10,
  PLACEHOLDER_FUTURE_ROUND: 98,
};

export const getIssueCategoryLabel = (issue) => {
  const category = String(issue?.category || "GENERAL").toUpperCase();
  return ISSUE_CATEGORY_LABELS[category] || formatPreflightCategoryLabel(category);
};

export const getIssueUserTitle = (issue) => {
  const code = String(issue?.code || issue?.type || "").toUpperCase();
  return ISSUE_TITLE_BY_CODE[code] || buildIssueTitle(issue);
};

export const getIssueExplanation = (issue) => {
  const code = String(issue?.code || issue?.type || "").toUpperCase();
  const fallback = String(issue?.message || "").trim();
  return ISSUE_EXPLANATION_BY_CODE[code] || fallback || "Schedule issue detected.";
};

export const getIssueWhyItHappened = (issue) => {
  const code = String(issue?.code || issue?.type || "").toUpperCase();
  const reason = String(issue?.reason || "").trim();
  return reason || ISSUE_WHY_BY_CODE[code] || getIssueExplanation(issue);
};

export const getIssueRecommendedFix = (issue) => {
  const firstAction = Array.isArray(issue?.recommended_actions)
    ? issue.recommended_actions.map((item) => String(item || "").trim()).find(Boolean)
    : "";
  if (firstAction) return firstAction;
  const code = String(issue?.code || issue?.type || "").toUpperCase();
  return ISSUE_FIX_BY_CODE[code] || "Review the issue details and rerun the schedule check.";
};

export const getIssueAffectedItems = (issue) => {
  const evidence = issue?.evidence && typeof issue.evidence === "object" ? issue.evidence : {};
  const items = [];
  const push = (value) => {
    const text = String(value || "").trim();
    if (!text || items.includes(text)) return;
    items.push(text);
  };
  if (issue?.sport_name) push(`Sport: ${getSportDisplayName(issue)}`);
  if (issue?.venue_name) push(`Venue: ${issue.venue_name}`);
  else if (issue?.venue_id) push(`Venue #${issue.venue_id}`);
  if (evidence?.slot) push(`Time: ${formatDateTimeRange(evidence.slot, evidence.slot)}`);
  const matchIds = Array.from(collectIssueMatchIds(issue));
  if (matchIds.length > 0) {
    push(`Match${matchIds.length === 1 ? "" : "es"}: ${matchIds.map((id) => `#${id}`).join(", ")}`);
  }
  const teamIds = Array.isArray(evidence?.team_ids) ? evidence.team_ids : [];
  if (teamIds.length > 0) {
    push(`Team${teamIds.length === 1 ? "" : "s"}: ${teamIds.map((id) => `#${id}`).join(", ")}`);
  }
  const playerIds = Array.isArray(evidence?.player_ids) ? evidence.player_ids : [];
  if (playerIds.length > 0) {
    push(`Player${playerIds.length === 1 ? "" : "s"}: ${playerIds.map((id) => `#${id}`).join(", ")}`);
  }
  if (String(issue?.code || "").toUpperCase() === "PLACEHOLDER_FUTURE_ROUND") {
    push("Future-round placeholder");
  }
  return items;
};

export const getIssueAffectedCount = (issue) => {
  const evidence = issue?.evidence && typeof issue.evidence === "object" ? issue.evidence : {};
  const directMatchIds = Array.from(collectIssueMatchIds(issue));
  if (directMatchIds.length > 0) return directMatchIds.length;
  if (Array.isArray(evidence?.affected_matches) && evidence.affected_matches.length > 0) {
    return evidence.affected_matches.length;
  }
  if (Array.isArray(evidence?.team_ids) && evidence.team_ids.length > 0) {
    return evidence.team_ids.length;
  }
  if (Array.isArray(evidence?.player_ids) && evidence.player_ids.length > 0) {
    return evidence.player_ids.length;
  }
  return 0;
};

export const getIssueAffectedGroups = (issue, context = {}) => {
  const evidence = issue?.evidence && typeof issue.evidence === "object" ? issue.evidence : {};
  const groups = [];
  const pushGroup = (label, entries = []) => {
    const cleaned = (Array.isArray(entries) ? entries : [])
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    if (cleaned.length === 0) return;
    groups.push({ label, entries: Array.from(new Set(cleaned)) });
  };

  const matchSummary = context?.matchSummary || null;
  const matchRows = Array.isArray(context?.affectedMatches) ? context.affectedMatches : [];
  const venueLabel = String(
    issue?.venue_name ||
    evidence?.venue_name ||
    matchSummary?.venueName ||
    ""
  ).trim();
  const timeLabel = String(
    evidence?.slot
      ? formatDateTimeRange(evidence.slot, evidence.slot)
      : matchSummary?.timeRange && matchSummary.timeRange !== "Not scheduled yet"
        ? matchSummary.timeRange
        : ""
  ).trim();
  const sportLabel = String(issue?.sport_name || matchSummary?.sportName || "").trim();

  if (venueLabel) pushGroup("Affected Venue", [venueLabel]);
  if (timeLabel) pushGroup("Affected Time Slot", [timeLabel]);
  if (sportLabel) pushGroup("Affected Sport", [sportLabel]);

  const matchEntries = [];
  if (matchSummary?.primaryLabel) matchEntries.push(matchSummary.primaryLabel);
  matchRows.forEach((row) => {
    if (!row || typeof row !== "object") return;
    const label = resolveBestTeamName([
      row.primaryLabel,
      row.match_label,
      row.teams_text,
      row.title,
      row.label,
    ]) || getMatchDisplayName(row);
    if (label) matchEntries.push(label);
  });
  const affectedMatches = Array.isArray(evidence?.affected_matches) ? evidence.affected_matches : [];
  affectedMatches.forEach((row) => {
    if (!row || typeof row !== "object") return;
    const label = getMatchDisplayName(row);
    if (label) matchEntries.push(label);
  });
  pushGroup("Affected Matches", matchEntries);

  const teamNames = [
    ...(Array.isArray(evidence?.team_names) ? evidence.team_names : []),
    ...(Array.isArray(evidence?.teams) ? evidence.teams : []),
  ];
  if (teamNames.length > 0) {
    pushGroup("Affected Teams", teamNames);
  } else if (Array.isArray(evidence?.team_ids) && evidence.team_ids.length > 0) {
    pushGroup("Affected Teams", evidence.team_ids.map((id) => `Team #${id}`));
  }

  const playerNames = [
    ...(Array.isArray(evidence?.player_names) ? evidence.player_names : []),
    ...(Array.isArray(evidence?.players) ? evidence.players : []),
  ];
  if (playerNames.length > 0) {
    pushGroup("Affected Players", playerNames);
  } else if (Array.isArray(evidence?.player_ids) && evidence.player_ids.length > 0) {
    pushGroup("Affected Players", evidence.player_ids.map((id) => `Player #${id}`));
  }

  if (groups.length === 0) {
    pushGroup("Affected Details", [
      "Affected details are limited, but this issue is linked to the selected schedule item.",
    ]);
  }

  return groups;
};

export const getIssueActionLabel = (issue) => {
  const normalized = normalizeContractSeverity(issue?.severity, Boolean(issue?.blocking));
  const code = String(issue?.code || issue?.type || "").toUpperCase();
  if (code === "EXACT_PLACEMENT_FAILED") return "Open exact-check details";
  if (code === "PLACEHOLDER_FUTURE_ROUND") return "Review context";
  if (normalized === "BLOCKING") return "Resolve now";
  if (normalized === "WARNING") return "View options";
  return "Open details";
};

export const getSafeResolutionOptions = (issue) =>
  sortResolutionOptions(normalizeResolutionOptions(issue?.resolution_options)).filter(
    (option) => canApplyRecommendationOption(option?.option_type) || getRecommendationTrustLabel(option) !== "Guide Only"
  );

export const getIssueManualNextSteps = (issue) => {
  const code = String(issue?.code || issue?.type || "").toUpperCase();
  const byCode = {
    VENUE_CONFLICT: [
      "Review the affected matches.",
      "Choose one match to move.",
      "Select a compatible venue or a free time slot.",
      "Run AI Preflight again.",
    ],
    TEAM_CONFLICT: [
      "Review the overlapping team assignments.",
      "Move one match to a different time slot.",
      "Check if the new slot avoids other team conflicts.",
      "Validate the schedule again.",
    ],
    PLAYER_CONFLICT: [
      "Review the overlapping player assignments.",
      "Move one match to a time that protects player availability.",
      "Check the updated schedule for new overlaps.",
      "Validate the schedule again.",
    ],
    MISSING_SCHEDULE_SLOT: [
      "Review the affected match.",
      "Add more available time or assign a compatible venue.",
      "Reduce unnecessary constraints if needed.",
      "Run AI Preflight again.",
    ],
    NO_VALID_SLOT: [
      "Review the affected match.",
      "Add more available time or assign a compatible venue.",
      "Reduce unnecessary constraints if needed.",
      "Run AI Preflight again.",
    ],
    NO_COMPATIBLE_VENUE: [
      "Open venue settings.",
      "Add or update a venue that supports this sport.",
      "Assign the venue to the selected tournament.",
      "Run AI Preflight again.",
    ],
    PROGRAM_BLOCK_OVERLAP: [
      "Review the protected program block.",
      "Move the match outside the blocked time.",
      "Check if another venue or slot is available.",
      "Validate the schedule again.",
    ],
    LUNCH_BREAK_OVERLAP: [
      "Review the protected lunch window.",
      "Move the match outside the break.",
      "Check if the updated slot creates new conflicts.",
      "Validate the schedule again.",
    ],
    EXACT_PLACEMENT_FAILED: [
      "Review unscheduled matches.",
      "Add venue capacity or extend the schedule window.",
      "Reduce unnecessary restrictions if possible.",
      "Run exact feasibility check again.",
    ],
    INSUFFICIENT_PLAYING_AREA_CAPACITY: [
      "Review venue capacity for the affected sports.",
      "Add more playing areas or more venues.",
      "Extend operating hours or add another tournament day.",
      "Run AI Preflight again.",
    ],
    SPORT_DURATION_TOO_LONG: [
      "Open sport settings.",
      "Review the configured match duration.",
      "Reduce duration or extend the tournament window.",
      "Run AI Preflight again.",
    ],
    PLACEHOLDER_FUTURE_ROUND: [
      "Review the upstream bracket matches.",
      "Wait until earlier-round winners are known.",
      "Treat this as informational unless it becomes blocking.",
    ],
  };
  const defaults = [
    "Review the affected schedule item.",
    "Apply a safe quick fix if one is available.",
    "Use manual setup actions if the issue remains.",
    "Run AI Preflight or validation again.",
  ];
  const steps = byCode[code] || defaults;
  const suggested = Array.isArray(issue?.recommended_actions)
    ? issue.recommended_actions.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const merged = [...steps, ...suggested];
  return Array.from(new Set(merged)).slice(0, 4);
};

export const getIssueTechnicalDetails = (issue) => {
  const evidenceRows = buildEvidenceRows(issue).map((row) => ({
    label: row.label,
    value: row.value,
  }));
  const fixTargets = Array.isArray(issue?.fix_targets)
    ? issue.fix_targets
      .map((target) => String(target?.type || target?.label || "").trim())
      .filter(Boolean)
      .map((value) => formatSnakeLabel(value))
    : [];
  const rows = [
    { label: "Code", value: String(issue?.code || issue?.type || "SCHEDULE_ISSUE") },
    { label: "Severity", value: getIssueSeverityLabel(issue) },
    { label: "Category", value: getIssueCategoryLabel(issue) },
  ];
  if (issue?.confidence) rows.push({ label: "Confidence", value: String(issue.confidence) });
  if (String(issue?.message || "").trim()) rows.push({ label: "Backend message", value: String(issue.message).trim() });
  if (String(issue?.reason || "").trim()) rows.push({ label: "Backend reason", value: String(issue.reason).trim() });
  if (fixTargets.length > 0) rows.push({ label: "Fix targets", value: fixTargets.join(", ") });
  return {
    summaryRows: rows,
    evidenceRows,
  };
};

export const normalizeScheduleIssue = (issue) => {
  const severity = getIssueSeverityLabel(issue);
  const code = String(issue?.code || issue?.type || "SCHEDULE_ISSUE").toUpperCase();
  const matchIds = Array.from(collectIssueMatchIds(issue));
  const evidence = issue?.evidence && typeof issue.evidence === "object" ? issue.evidence : {};
  return {
    ...issue,
    code,
    severity,
    categoryLabel: getIssueCategoryLabel(issue),
    title: getIssueUserTitle(issue),
    explanation: getIssueExplanation(issue),
    whyItHappened: getIssueWhyItHappened(issue),
    recommendedFix: getIssueRecommendedFix(issue),
    affectedItems: getIssueAffectedItems(issue),
    affectedCount: getIssueAffectedCount(issue),
    resolutionOptions: getSafeResolutionOptions(issue),
    quickActions: getIssueQuickActions(issue),
    matchIds,
    issueKey: `${code}|${matchIds.join(",") || "none"}|${String(issue?.venue_id || evidence?.venue_id || "")}|${String(evidence?.slot || "")}`,
    priority:
      (severity === "BLOCKING" ? 0 : severity === "WARNING" ? 10 : 20) +
      (ISSUE_CODE_PRIORITY[code] ?? 50),
  };
};

export const getTopPriorityIssues = (issues = []) =>
  (Array.isArray(issues) ? issues : [])
    .map((issue) => normalizeScheduleIssue(issue))
    .filter(Boolean)
    .sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority;
      return left.title.localeCompare(right.title);
    });

export const buildIssueSeverityBadgeTone = (severity) => {
  if (severity === "BLOCKING") return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300";
  if (severity === "WARNING") return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  if (severity === "INFO") return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
};

export const getProgramBlockTypeTone = (value) => {
  const key = String(value || "CUSTOM").toUpperCase();
  if (key === "OPENING_PROGRAM") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300";
  }
  if (key === "LUNCH_BREAK") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  }
  if (key === "CLOSING_CEREMONY" || key === "AWARDING") {
    return "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
};

export const formatDateInput = (value) => {
  const safe = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(safe.getTime())) return "";
  const yyyy = safe.getFullYear();
  const mm = String(safe.getMonth() + 1).padStart(2, "0");
  const dd = String(safe.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const formatTimeInput = (value) => {
  const safe = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(safe.getTime())) return "";
  const hh = String(safe.getHours()).padStart(2, "0");
  const mm = String(safe.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

export const combineDateAndTime = (dateText, timeText) => {
  if (!dateText || !timeText) return null;
  const candidate = new Date(`${dateText}T${timeText}:00`);
  if (Number.isNaN(candidate.getTime())) return null;
  return candidate;
};

export const extractNumericId = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") continue;
    if (typeof candidate === "number" && Number.isInteger(candidate) && candidate > 0) {
      return candidate;
    }
    if (typeof candidate === "string") {
      const parsed = Number(candidate);
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
      continue;
    }
    if (typeof candidate === "object") {
      const nested = extractNumericId(
        candidate.id,
        candidate.value,
        candidate.venue_id,
        candidate.venueId,
        candidate.match_id,
        candidate.matchId
      );
      if (nested) return nested;
    }
  }
  return null;
};

export const normalizeCalendarEventPayload = (payloadOrEvent, maybeMeta = null) => {
  const payload =
    payloadOrEvent && typeof payloadOrEvent === "object" && "event" in payloadOrEvent
      ? payloadOrEvent
      : { event: payloadOrEvent, ...(maybeMeta || {}) };
  const event = payload?.event || {};
  const matchId = extractNumericId(
    event?.match_id,
    event?.matchId,
    event?.id,
    event?.extendedProps?.match_id,
    event?.extendedProps?.matchId,
    event?.resource?.match_id
  );
  const venueId = extractNumericId(
    payload?.resourceId,
    payload?.resource,
    payload?.newResource,
    payload?.newResource?.id,
    payload?.resource?.id,
    event?.venue_id,
    event?.venueId,
    event?.resourceId,
    event?.extendedProps?.venue_id,
    event?.extendedProps?.venueId
  );
  const start = payload?.start || event?.start || null;
  const end = payload?.end || event?.end || null;
  return { payload, event, matchId, venueId, start, end };
};
