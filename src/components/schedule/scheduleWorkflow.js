export const isSchedulePageResolving = ({
  tournamentListLoading = false,
  tournamentContextKey = "",
  resolvedTournamentContextKey = "",
  selectedTournamentId = "",
  presentedTournamentId = "",
} = {}) => {
  if (tournamentListLoading) return true;
  if (String(tournamentContextKey) !== String(resolvedTournamentContextKey)) {
    return true;
  }
  const selectedId = String(selectedTournamentId || "").trim();
  if (!selectedId) return false;
  return selectedId !== String(presentedTournamentId || "").trim();
};

const ISSUE_COPY = Object.freeze({
  INVALID_OPERATING_WINDOW: {
    title: "The tournament hours need to be corrected",
    explanation: "The selected start and end times do not leave a usable period for matches.",
    action: "Open the tournament settings and correct the dates or daily hours.",
    destination: "timeline",
    actionLabel: "Fix Tournament Hours",
  },
  SINGLE_COMPATIBLE_VENUE: {
    title: "Only one venue is available",
    explanation: "This may create a tight match schedule.",
    action: "Add another compatible venue, or continue if the current setup is acceptable.",
    destination: "venues",
    actionLabel: "Review Venues",
  },
  VENUE_NOT_ASSIGNED_TO_INTRAMURAL: {
    title: "A scheduled venue is no longer assigned",
    explanation: "One or more matches use a venue that is not part of this Intramural.",
    action: "Assign the venue again or choose another venue for those matches.",
    destination: "venues",
    actionLabel: "Manage Venues",
  },
  VENUE_CAPACITY_EXCEEDED: {
    title: "A venue has too many matches at the same time",
    explanation: "The number of overlapping matches is greater than the venue's available playing areas.",
    action: "Move a match, add another venue, or increase available playing areas.",
    destination: "venues",
    actionLabel: "Review Venues",
  },
  NO_ACTIVE_BRACKET: {
    title: "The brackets are not ready",
    explanation: "Generate and activate the competition brackets before creating the schedule.",
    action: "Open Brackets and finish the selected competition bracket.",
    destination: "brackets",
    actionLabel: "Open Brackets",
  },
  MATCH_PARTICIPANTS_UNRESOLVED: {
    title: "Some bracket participants are not ready",
    explanation: "One or more matches are still waiting for their participants to be confirmed.",
    action: "Open Brackets and finish or activate the affected bracket, then try again.",
    destination: "brackets",
    actionLabel: "Open Brackets",
  },
  NO_COMPATIBLE_VENUE: {
    title: "A sport has no suitable venue",
    explanation: "None of the available venues can host one or more of the selected matches.",
    action: "Open Venues and allow the sport at a venue that can host it.",
    destination: "venues",
    actionLabel: "Fix Venues",
  },
  INSUFFICIENT_PLAYING_AREA_CAPACITY: {
    title: "There is not enough venue space",
    explanation: "The available playing areas cannot hold all matches within the tournament dates.",
    action: "Add more venue availability or update the number of playing areas.",
    destination: "venues",
    actionLabel: "Fix Venue Space",
  },
  INVALID_PLAYING_AREA_CAPACITY: {
    title: "A venue's playing-area count needs attention",
    explanation: "At least one venue does not have a usable number of playing areas.",
    action: "Open Venues and enter the correct number of matches the venue can host at once.",
    destination: "venues",
    actionLabel: "Fix Venue Space",
  },
  SPORT_DURATION_MISSING: {
    title: "A sport's match length is missing",
    explanation: "The schedule needs to know how long each match should take.",
    action: "Open Sports and enter the match length for the affected sport.",
    destination: "sports",
    actionLabel: "Fix Match Length",
  },
  SPORT_DURATION_TOO_LONG: {
    title: "A match does not fit within the available hours",
    explanation: "The match length is longer than the time available on a tournament day.",
    action: "Review the match length or increase the tournament's available hours.",
    destination: "sports",
    actionLabel: "Review Match Length",
  },
  REQUIRED_MATCH_UNSCHEDULED: {
    title: "Some matches could not be scheduled",
    explanation: "There is not enough valid time or venue capacity for all matches.",
    action: "Add a venue, expand availability, review program blocks, or choose a smaller event scope.",
    destination: "venues",
    actionLabel: "Review Venues",
  },
  EXACT_PLACEMENT_FAILED: {
    title: "Some matches could not be scheduled",
    explanation: "There is not enough valid time or venue capacity for all ready matches.",
    action: "Add a venue, expand availability, review program blocks, or choose a smaller event scope.",
    destination: "venues",
    actionLabel: "Review Venues",
  },
  PARTIAL_SCHEDULE_NOT_ALLOWED: {
    title: "Some matches could not be scheduled",
    explanation: "No schedule changes were saved because every ready match must receive a valid time and venue.",
    action: "Add capacity or time, then run the schedule check again.",
    destination: "venues",
    actionLabel: "Review Venues",
  },
  SCHEDULE_PREFLIGHT_STALE: {
    title: "The schedule setup changed",
    explanation: "Venue, event, bracket, or program settings changed after the last schedule check.",
    action: "Run the schedule check again before generating.",
    destination: null,
    actionLabel: null,
  },
  PROGRAM_BLOCK_CAPACITY_REDUCTION: {
    title: "Program activities reduce available match time",
    explanation: "Protected activities leave fewer time slots for matches.",
    action: "Review program blocks or continue if the remaining time is acceptable.",
    destination: "program_blocks",
    actionLabel: "Review Program Blocks",
  },
});

const normalizeCode = (issue) =>
  String(issue?.code || issue?.type || "SCHEDULE_ISSUE").trim().toUpperCase();

const evidenceLabel = (issue, ...keys) => {
  const evidence = issue?.evidence && typeof issue.evidence === "object" ? issue.evidence : {};
  for (const key of keys) {
    const value = evidence[key] ?? issue?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const evidenceNumber = (issue, ...keys) => {
  const evidence = issue?.evidence && typeof issue.evidence === "object" ? issue.evidence : {};
  for (const key of keys) {
    const value = Number(evidence[key] ?? issue?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
};

const evidenceListCount = (issue, ...keys) => {
  const evidence = issue?.evidence && typeof issue.evidence === "object" ? issue.evidence : {};
  for (const key of keys) {
    const value = evidence[key] ?? issue?.[key];
    if (Array.isArray(value)) return value.length;
  }
  return null;
};

const buildIssueWhyExplanation = ({ issue, code, copy, affectedCompetition, sportName }) => {
  const subject = affectedCompetition || sportName || "The selected competition";
  const venueName = evidenceLabel(issue, "compatible_venue_name", "venue_name");
  const matchCount = evidenceListCount(issue, "match_ids", "unscheduled_matches")
    ?? evidenceNumber(issue, "matches_needed", "required_matches");
  const venueCount = evidenceNumber(issue, "compatible_venues_count", "total_venues_checked");
  const playingAreas = evidenceNumber(issue, "playing_areas", "available_playing_areas");
  const simultaneousMatches = evidenceNumber(issue, "simultaneous_matches", "overlapping_assignments");
  const slotMinutes = evidenceNumber(issue, "slot_minutes", "total_slot_duration");
  const dayMinutes = evidenceNumber(issue, "day_minutes");
  const programBlockCount = evidenceNumber(issue, "program_block_count", "blocked_windows_count");

  if (code === "SINGLE_COMPATIBLE_VENUE") {
    const venueEvidence = venueName ? `: ${venueName}` : "";
    return `${subject} currently has only one suitable venue${venueEvidence}. All of its matches must share that venue, so a delay or overlapping demand could make the schedule tight.`;
  }
  if (code === "NO_COMPATIBLE_VENUE") {
    const checked = venueCount !== null ? ` The system checked ${venueCount} available venue${venueCount === 1 ? "" : "s"}, but none can currently host it.` : " No available venue is currently set up to host it.";
    return `${subject} needs a venue that supports its match requirements.${checked}`;
  }
  if (["VENUE_CAPACITY_EXCEEDED", "INSUFFICIENT_PLAYING_AREA_CAPACITY", "INVALID_PLAYING_AREA_CAPACITY"].includes(code)) {
    const capacityEvidence = playingAreas !== null && simultaneousMatches !== null
      ? `${simultaneousMatches} matches need the venue at once, but it has ${playingAreas} playing area${playingAreas === 1 ? "" : "s"}.`
      : `${subject} needs more usable playing space than the current venue setup provides.`;
    return `${capacityEvidence} Without more space or time, at least one match cannot be placed safely.`;
  }
  if (code === "SPORT_DURATION_TOO_LONG") {
    const timingEvidence = slotMinutes !== null && dayMinutes !== null
      ? `A ${subject} match needs ${slotMinutes} minutes, while only ${dayMinutes} minutes are available in the daily window.`
      : `${subject} needs more time than the current daily tournament hours provide.`;
    return `${timingEvidence} The match cannot receive a complete time slot until one of those settings changes.`;
  }
  if (code === "SPORT_DURATION_MISSING") {
    return `${subject} has no confirmed match length in its sport settings. Without that value, the system cannot know how much calendar time to reserve for each match.`;
  }
  if (code === "NO_ACTIVE_BRACKET") {
    return `The selected schedule has no active bracket to supply its matches. The system cannot create dates and venues until the bracket has produced the official match list.`;
  }
  if (code === "MATCH_PARTICIPANTS_UNRESOLVED") {
    const countEvidence = matchCount !== null ? `${matchCount} match${matchCount === 1 ? "" : "es"} in ${subject}` : `A match in ${subject}`;
    const verb = matchCount !== null && matchCount !== 1 ? "are" : "is";
    const pronoun = matchCount !== null && matchCount !== 1 ? "them" : "it";
    return `${countEvidence} ${verb} missing a participant and ${verb} not simply waiting for an earlier result. Scheduling ${pronoun} now could reserve time for the wrong competitors.`;
  }
  if (["REQUIRED_MATCH_UNSCHEDULED", "EXACT_PLACEMENT_FAILED", "PARTIAL_SCHEDULE_NOT_ALLOWED"].includes(code)) {
    const countEvidence = matchCount !== null ? `${matchCount} ready match${matchCount === 1 ? "" : "es"}` : "One or more ready matches";
    return `${countEvidence} could not fit into the available dates, times, and suitable venues. The system left them out rather than create an overlapping or incomplete schedule.`;
  }
  if (code === "PROGRAM_BLOCK_CAPACITY_REDUCTION") {
    const countEvidence = programBlockCount !== null ? `${programBlockCount} protected program item${programBlockCount === 1 ? "" : "s"} use` : "Protected program activities use";
    return `${countEvidence} time that would otherwise be available for matches. The remaining hours may still work, but there is less room for delays or additional matches.`;
  }
  if (code === "VENUE_NOT_ASSIGNED_TO_INTRAMURAL") {
    return `${venueName || "A venue used by the schedule"} is not included in this tournament's current venue list. Matches cannot remain there unless the venue is assigned again.`;
  }
  if (code === "INVALID_OPERATING_WINDOW") {
    return `The configured start and end hours do not create a usable period for matches. Because no complete match can fit inside that period, schedule generation must stop.`;
  }
  if (code === "SCHEDULE_PREFLIGHT_STALE") {
    return `The tournament setup changed after the last schedule check. The system must check the latest brackets, venues, and times again so it does not use old information.`;
  }
  return `${copy.explanation} The system is showing this item because it may prevent a complete and conflict-free schedule.`;
};

export const presentScheduleIssue = (issue = {}) => {
  const code = normalizeCode(issue);
  const copy = ISSUE_COPY[code] || {
    title: "Schedule setup needs attention",
    explanation: "Something in the current setup prevents the schedule from being created.",
    action: "Review the tournament, bracket, sport, and venue setup, then try again.",
    destination: null,
    actionLabel: null,
  };
  const sportName = evidenceLabel(issue, "sport_name", "sport_display_name");
  const eventName = evidenceLabel(issue, "event_name");
  const affectedCompetition = eventName || sportName;
  const title = code === "SINGLE_COMPATIBLE_VENUE" && sportName
    ? `Only one venue is available for ${sportName}`
    : code === "MATCH_PARTICIPANTS_UNRESOLVED" && affectedCompetition
      ? `Participants are missing for ${affectedCompetition}`
      : copy.title;
  const whyExplanation = buildIssueWhyExplanation({
    issue,
    code,
    copy,
    affectedCompetition,
    sportName,
  });

  return {
    code,
    severity: String(issue?.severity || (issue?.blocking ? "BLOCKING" : "WARNING")).toUpperCase(),
    blocking: Boolean(issue?.blocking) || String(issue?.severity || "").toUpperCase() === "BLOCKING",
    title,
    explanation: copy.explanation,
    whyExplanation,
    recommendedAction: copy.action,
    destination: copy.destination,
    actionLabel: copy.actionLabel,
    technical: issue,
  };
};

export const classifyScheduleCheck = (payload = {}) => {
  const rawBlockers = Array.isArray(payload?.blocking_issues) ? payload.blocking_issues : [];
  const rawWarnings = Array.isArray(payload?.warnings) ? payload.warnings : [];
  // The backend owns both severity and collection placement. Never promote a
  // warning to a blocker from client-side evidence inspection.
  const blockers = rawBlockers.map(presentScheduleIssue);
  const warnings = rawWarnings.map(presentScheduleIssue);
  const status = String(payload?.status || "").toUpperCase();
  if (blockers.length > 0 || status === "BLOCKED" || payload?.can_generate === false) {
    return { outcome: "blocked", blockers, warnings };
  }
  if (warnings.length > 0 || status === "WARNING") {
    return { outcome: "warning", blockers: [], warnings };
  }
  return { outcome: "passed", blockers: [], warnings: [] };
};

const SOLVER_FAILURE_CODES = new Set([
  "PARTIAL_SCHEDULE_NOT_ALLOWED",
  "EXACT_PLACEMENT_FAILED",
  "NO_FEASIBLE_SCHEDULE",
  "SOLVER_NO_SOLUTION",
]);

export const classifyScheduleFailure = (error = {}) => {
  const detail = error?.response?.data?.detail;
  const code = String(detail?.code || "").trim().toUpperCase();
  if (code === "SCHEDULE_PREFLIGHT_STALE") {
    return { kind: "stale", code, detail, blockers: [] };
  }
  if (SOLVER_FAILURE_CODES.has(code)) {
    return { kind: "solver_failure", code, detail, blockers: [] };
  }
  const blockers = Array.isArray(detail?.blocking_issues)
    ? detail.blocking_issues
    : [];
  if (blockers.length > 0) {
    return { kind: "blocked", code, detail, blockers };
  }
  return { kind: "system_error", code, detail, blockers: [] };
};

export const resolveScheduleEmptyState = ({
  hasIntramural,
  hasTournament,
  hasSchedule,
  canGenerate,
  preflightStatus = "",
  blockingCount = 0,
  warningCount = 0,
}) => {
  if (hasSchedule) return null;
  if (!hasIntramural || !hasTournament) {
    return {
      key: "no_intramural",
      title: "No active Intramural",
      description: "Select or create an Intramural before viewing its schedule.",
      canGenerate: false,
    };
  }
  const status = String(preflightStatus || "").trim().toUpperCase();
  if (status === "BLOCKED") {
    const count = Math.max(1, Number(blockingCount) || 0);
    return {
      key: "blocked",
      title: `${count} issue${count === 1 ? "" : "s"} must be fixed`,
      description: "Review the items that must be fixed before generating the schedule.",
      canGenerate: false,
      actionLabel: "Review Issues",
    };
  }
  if (status === "WARNING") {
    const count = Math.max(1, Number(warningCount) || 0);
    return {
      key: "warning",
      title: `Ready with ${count} warning${count === 1 ? "" : "s"}`,
      description: "The schedule can be generated after you review the warning details.",
      canGenerate: Boolean(canGenerate),
      actionLabel: "Generate Schedule",
    };
  }
  if (status === "READY") {
    return {
      key: "ready",
      title: "Ready to generate",
      description: "No problems are preventing the schedule from being generated.",
      canGenerate: Boolean(canGenerate),
      actionLabel: "Generate Schedule",
    };
  }
  return {
    key: "not_checked",
    title: "Schedule check required",
    description: "Check the tournament setup before generating the schedule.",
    canGenerate: Boolean(canGenerate),
    actionLabel: "Check and Generate",
  };
};

export const buildScheduleScope = ({
  sportId = null,
  tournamentSportEventId = null,
  preflightFingerprint = null,
} = {}) => ({
  sport_id: Number(sportId) > 0 ? Number(sportId) : null,
  tournament_sport_event_id:
    Number(tournamentSportEventId) > 0 ? Number(tournamentSportEventId) : null,
  preflight_fingerprint:
    typeof preflightFingerprint === "string" && preflightFingerprint.trim()
      ? preflightFingerprint.trim()
      : null,
});

// An empty UI selection means "use the tournament's assigned venues", not
// "schedule with zero venues". Preserve a non-empty explicit venue filter.
export const normalizeScheduleVenueIds = (venueIds) =>
  Array.isArray(venueIds) && venueIds.length > 0 ? venueIds : null;

export const buildScheduleValidationParams = ({
  sportId = null,
  tournamentSportEventId = null,
} = {}) => {
  const params = {};
  if (Number(sportId) > 0) {
    params.sport_id = Number(sportId);
  }
  if (Number(tournamentSportEventId) > 0) {
    params.tournament_sport_event_id = Number(tournamentSportEventId);
  }
  return params;
};

export const resolveScheduleSelectionScope = (
  events = [],
  selectedSport = "all",
  selectedEventCategory = "all"
) => {
  if (selectedSport === "all") {
    return {
      sportId: null,
      tournamentSportEventId: null,
    };
  }
  const rows = Array.isArray(events) ? events : [];
  const sportRow = rows.find((event) => event?.sportKey === selectedSport);
  const eventRow = selectedEventCategory === "all"
    ? null
    : rows.find(
        (event) =>
          event?.sportKey === selectedSport &&
          event?.eventCategoryKey === selectedEventCategory
      );
  return {
    sportId: Number(sportRow?.sport_id) > 0 ? Number(sportRow.sport_id) : null,
    tournamentSportEventId:
      Number(eventRow?.tournament_sport_event_id) > 0
        ? Number(eventRow.tournament_sport_event_id)
        : null,
  };
};

export const canUseScheduleGeneration = (accessContext) =>
  String(accessContext?.effective_mode || accessContext || "").trim().toLowerCase() ===
  "sports_coordinator";

export const OFFICIAL_PROGRAM_TYPES = Object.freeze([
  { type: "OPENING_PROGRAM", label: "Opening Program", dateSource: "start" },
  { type: "AWARDING", label: "Awarding", dateSource: "end" },
  { type: "CLOSING_CEREMONY", label: "Closing Program", dateSource: "end" },
]);

export const buildOfficialProgramSetupRows = ({
  programBlocks = [],
  tournamentStartDate = "",
  tournamentEndDate = "",
} = {}) => {
  const byType = new Map(
    (Array.isArray(programBlocks) ? programBlocks : [])
      .map((row) => [String(row?.block_type || "").toUpperCase(), row])
  );
  return OFFICIAL_PROGRAM_TYPES.map((definition) => {
    const existing = byType.get(definition.type);
    return {
      type: definition.type,
      label: definition.label,
      existingId: existing?.id ?? null,
      enabled: Boolean(existing),
      date: existing?.date || (
        definition.dateSource === "start" ? tournamentStartDate : tournamentEndDate
      ) || "",
      startTime: existing?.start_time ? String(existing.start_time).slice(0, 5) : "",
      endTime: existing?.end_time ? String(existing.end_time).slice(0, 5) : "",
    };
  });
};

export const validateOfficialProgramSetup = ({
  rows = [],
  tournamentStartDate = "",
  tournamentEndDate = "",
} = {}) => {
  const errors = {};
  const enabled = (Array.isArray(rows) ? rows : []).filter((row) => row?.enabled);
  enabled.forEach((row) => {
    const rowErrors = [];
    if (!row.date) rowErrors.push(`${row.label} date is required.`);
    if (!row.startTime) rowErrors.push(`${row.label} start time is required.`);
    if (!row.endTime) rowErrors.push(`${row.label} end time is required.`);
    if (row.startTime && row.endTime && row.startTime >= row.endTime) {
      rowErrors.push(`${row.label} must end after it starts.`);
    }
    if (
      row.date &&
      ((tournamentStartDate && row.date < tournamentStartDate) ||
        (tournamentEndDate && row.date > tournamentEndDate))
    ) {
      rowErrors.push(`${row.label} date must be within the Intramural schedule.`);
    }
    if (rowErrors.length) errors[row.type] = rowErrors;
  });

  enabled.forEach((left, index) => {
    enabled.slice(index + 1).forEach((right) => {
      if (
        left.date === right.date &&
        left.startTime < right.endTime &&
        left.endTime > right.startTime
      ) {
        errors[left.type] = [...(errors[left.type] || []), `${left.label} overlaps ${right.label}.`];
        errors[right.type] = [...(errors[right.type] || []), `${right.label} overlaps ${left.label}.`];
      }
    });
  });
  return errors;
};

export const resolveVisibleScheduleHourRange = ({
  events = [],
  fallbackStartHour = 5,
  fallbackEndHour = 18,
} = {}) => {
  const rows = Array.isArray(events) ? events : [];
  const starts = [];
  const ends = [];

  rows.forEach((event) => {
    const start = event?.start instanceof Date ? event.start : new Date(event?.start);
    const end = event?.end instanceof Date ? event.end : new Date(event?.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return;
    starts.push(start.getHours() * 60 + start.getMinutes());
    ends.push(end.getHours() * 60 + end.getMinutes());
  });

  if (starts.length === 0 || ends.length === 0) {
    return {
      startHour: Math.max(0, Math.min(23, Number(fallbackStartHour) || 5)),
      endHour: Math.max(1, Math.min(24, Number(fallbackEndHour) || 18)),
    };
  }

  const startHour = Math.max(0, Math.min(23, Math.floor(Math.min(...starts) / 60)));
  const endHour = Math.max(
    startHour + 1,
    Math.min(24, Math.ceil(Math.max(...ends) / 60))
  );
  return { startHour, endHour };
};

export const getScheduleParticipantLabel = (event = {}) => {
  const first = String(
    event?.team1_label ||
    event?.entry1_label ||
    event?.participant1_label ||
    event?.participant_a ||
    ""
  ).trim();
  const second = String(
    event?.team2_label ||
    event?.entry2_label ||
    event?.participant2_label ||
    event?.participant_b ||
    ""
  ).trim();
  if (first && second) return `${first} vs ${second}`;
  if (first || second) return `${first || "TBD"} vs ${second || "TBD"}`;
  const status = String(event?.status || "").toUpperCase();
  if (
    event?.is_placeholder ||
    event?.is_future_placeholder ||
    status.includes("WAITING") ||
    status.includes("PLACEHOLDER")
  ) {
    return "Waiting for previous result";
  }
  const title = String(event?.title || "").trim();
  if (title.includes(":")) return title.split(":").slice(1).join(":").trim();
  return title || "Waiting for previous result";
};
