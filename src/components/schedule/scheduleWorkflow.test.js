import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildScheduleScope,
  buildScheduleValidationParams,
  buildOfficialProgramSetupRows,
  canUseScheduleGeneration,
  classifyScheduleFailure,
  classifyScheduleCheck,
  getScheduleParticipantLabel,
  isSchedulePageResolving,
  normalizeScheduleVenueIds,
  presentScheduleIssue,
  resolveScheduleSelectionScope,
  resolveScheduleEmptyState,
  resolveVisibleScheduleHourRange,
  validateOfficialProgramSetup,
} from "./scheduleWorkflow.js";

test("schedule content waits for the exact selected Intramural to resolve", () => {
  assert.equal(
    isSchedulePageResolving({
      tournamentListLoading: true,
      tournamentContextKey: "5",
      resolvedTournamentContextKey: "",
    }),
    true
  );
  assert.equal(
    isSchedulePageResolving({
      tournamentContextKey: "5",
      resolvedTournamentContextKey: "5",
      selectedTournamentId: "36",
      presentedTournamentId: "",
    }),
    true
  );
  assert.equal(
    isSchedulePageResolving({
      tournamentContextKey: "5",
      resolvedTournamentContextKey: "5",
      selectedTournamentId: "36",
      presentedTournamentId: "36",
    }),
    false
  );
});

test("empty schedule states use backend preflight status without local business gates", () => {
  assert.equal(resolveScheduleEmptyState({ hasIntramural: false, hasTournament: false }).key, "no_intramural");
  const blockedState = resolveScheduleEmptyState({
    hasIntramural: true, hasTournament: true, preflightStatus: "BLOCKED", blockingCount: 2,
  });
  assert.equal(blockedState.key, "blocked");
  assert.equal(blockedState.canGenerate, false);
  assert.equal(resolveScheduleEmptyState({
    hasIntramural: true, hasTournament: true, preflightStatus: "READY", canGenerate: true,
  }).key, "ready");
  assert.equal(resolveScheduleEmptyState({
    hasIntramural: true, hasTournament: true, canGenerate: true,
  }).key, "not_checked");
});

test("an existing schedule has no empty state", () => {
  assert.equal(resolveScheduleEmptyState({ hasSchedule: true }), null);
});

test("only coordinator access can expose generation", () => {
  assert.equal(canUseScheduleGeneration({ effective_mode: "sports_coordinator" }), true);
  for (const mode of ["sports_facilitator", "department_manager", "coach", "player", "viewer"]) {
    assert.equal(canUseScheduleGeneration({ effective_mode: mode }), false);
  }
});

test("passed checks generate immediately while warnings and blockers are separated", () => {
  assert.equal(classifyScheduleCheck({ status: "READY", can_generate: true }).outcome, "passed");
  assert.equal(classifyScheduleCheck({
    status: "WARNING", warnings: [{ code: "SINGLE_COMPATIBLE_VENUE", severity: "WARNING" }],
  }).outcome, "warning");
  assert.equal(classifyScheduleCheck({
    status: "BLOCKED", can_generate: false,
    blocking_issues: [{ code: "VENUE_CAPACITY_EXCEEDED", severity: "BLOCKING", blocking: true }],
  }).outcome, "blocked");
});

test("backend exact-placement warnings remain warnings even with real unscheduled Matches", () => {
  const realFailure = {
    code: "EXACT_PLACEMENT_FAILED",
    severity: "WARNING",
    evidence: { unscheduled_matches: [{ match_id: 8, is_placeholder: false }] },
  };
  const result = classifyScheduleCheck({ status: "WARNING", can_generate: true, warnings: [realFailure] });
  assert.equal(result.outcome, "warning");
  assert.equal(result.blockers.length, 0);
  assert.equal(result.warnings.length, 1);

  const placeholderOnly = {
    ...realFailure,
    evidence: { unscheduled_matches: [{ match_id: 9, is_placeholder: true }] },
  };
  assert.equal(classifyScheduleCheck({ status: "WARNING", warnings: [placeholderOnly] }).outcome, "warning");
});

test("backend blockers stop generation and warning flags never change collection authority", () => {
  const blocker = { code: "NO_ACTIVE_BRACKET", severity: "BLOCKING", blocking: true };
  assert.equal(classifyScheduleCheck({
    status: "BLOCKED",
    can_generate: false,
    blocking_issues: [blocker],
  }).outcome, "blocked");

  const oddlyFlaggedWarning = { ...blocker, code: "EXACT_PLACEMENT_FAILED" };
  const warningResult = classifyScheduleCheck({
    status: "WARNING",
    can_generate: true,
    warnings: [oddlyFlaggedWarning],
  });
  assert.equal(warningResult.outcome, "warning");
  assert.equal(warningResult.blockers.length, 0);
});

test("unknown generation failures remain system errors instead of invented blockers", () => {
  assert.equal(classifyScheduleFailure({ response: { status: 500, data: {} } }).kind, "system_error");
  assert.equal(classifyScheduleFailure(new Error("Network down")).kind, "system_error");
  assert.equal(classifyScheduleFailure({
    response: { data: { detail: { code: "PARTIAL_SCHEDULE_NOT_ALLOWED" } } },
  }).kind, "solver_failure");
  assert.equal(classifyScheduleFailure({
    response: { data: { detail: { blocking_issues: [{ code: "NO_ACTIVE_BRACKET" }] } } },
  }).kind, "blocked");
});

test("issue copy is user friendly and preserves technical evidence", () => {
  const issue = presentScheduleIssue({
    code: "SINGLE_COMPATIBLE_VENUE",
    severity: "WARNING",
    evidence: { sport_name: "Badminton", venue_id: 4 },
  });
  assert.equal(issue.title, "Only one venue is available for Badminton");
  assert.equal(issue.destination, "venues");
  assert.equal(issue.technical.evidence.venue_id, 4);
});

test("schedule issues point non-technical users to the page that can fix them", () => {
  const venueIssue = presentScheduleIssue({ code: "NO_COMPATIBLE_VENUE", severity: "BLOCKING" });
  assert.equal(venueIssue.title, "A sport has no suitable venue");
  assert.equal(venueIssue.destination, "venues");
  assert.equal(venueIssue.actionLabel, "Fix Venues");

  const durationIssue = presentScheduleIssue({ code: "SPORT_DURATION_MISSING", severity: "BLOCKING" });
  assert.equal(durationIssue.destination, "sports");
  assert.equal(durationIssue.actionLabel, "Fix Match Length");

  const participantIssue = presentScheduleIssue({ code: "MATCH_PARTICIPANTS_UNRESOLVED", severity: "BLOCKING" });
  assert.equal(participantIssue.destination, "brackets");
  assert.equal(participantIssue.actionLabel, "Open Brackets");

  const scopedParticipantIssue = presentScheduleIssue({
    code: "MATCH_PARTICIPANTS_UNRESOLVED",
    severity: "BLOCKING",
    event_name: "Men's Volleyball",
    sport_name: "Volleyball",
  });
  assert.equal(scopedParticipantIssue.title, "Participants are missing for Men's Volleyball");
});

test("unknown backend issue text is not exposed to non-technical users", () => {
  const issue = presentScheduleIssue({
    code: "UNKNOWN_INTERNAL_CASE",
    message: "CP-SAT infeasible: candidate domain exhausted",
  });
  assert.equal(issue.explanation, "Something in the current setup prevents the schedule from being created.");
  assert.equal(issue.explanation.includes("CP-SAT"), false);
  assert.equal(issue.technical.message, "CP-SAT infeasible: candidate domain exhausted");
});

test("warning explanations use specific evidence in a brief expandable why message", () => {
  const issue = presentScheduleIssue({
    code: "SINGLE_COMPATIBLE_VENUE",
    severity: "WARNING",
    sport_name: "Beach Volleyball 2v2",
    evidence: {
      compatible_venue_name: "Beach Court",
      compatible_venues_count: 1,
    },
  });

  assert.equal(
    issue.whyExplanation,
    "Beach Volleyball 2v2 currently has only one suitable venue: Beach Court. All of its matches must share that venue, so a delay or overlapping demand could make the schedule tight."
  );
  assert.equal(issue.whyExplanation.split(".").filter(Boolean).length, 2);
});

test("blocking explanations quantify affected matches when evidence is available", () => {
  const issue = presentScheduleIssue({
    code: "MATCH_PARTICIPANTS_UNRESOLVED",
    severity: "BLOCKING",
    event_name: "Men's Volleyball",
    evidence: { match_ids: [7, 8] },
  });

  assert.match(issue.whyExplanation, /2 matches in Men's Volleyball/);
  assert.match(issue.whyExplanation, /wrong competitors/);
});

test("event and fingerprint remain in the exact generation scope", () => {
  assert.deepEqual(buildScheduleScope({
    sportId: 7,
    tournamentSportEventId: 19,
    preflightFingerprint: "1234567890abcdef",
  }), {
    sport_id: 7,
    tournament_sport_event_id: 19,
    preflight_fingerprint: "1234567890abcdef",
  });
});

test("an empty venue selection uses tournament-assigned venues", () => {
  assert.equal(normalizeScheduleVenueIds(undefined), null);
  assert.equal(normalizeScheduleVenueIds(null), null);
  assert.equal(normalizeScheduleVenueIds([]), null);
  assert.deepEqual(normalizeScheduleVenueIds([3, 8]), [3, 8]);
});

test("validation preserves the exact selected Sport and Event", () => {
  assert.deepEqual(buildScheduleValidationParams({
    sportId: 7,
    tournamentSportEventId: 19,
  }), {
    sport_id: 7,
    tournament_sport_event_id: 19,
  });
  assert.deepEqual(buildScheduleValidationParams(), {});
});

test("refresh scope remains primitive and stable when event rows are reloaded", () => {
  const firstLoad = [{
    sportKey: "badminton",
    sport_id: 7,
    eventCategoryKey: "singles",
    tournament_sport_event_id: 19,
  }];
  const secondLoad = firstLoad.map((row) => ({ ...row }));

  assert.deepEqual(
    resolveScheduleSelectionScope(firstLoad, "badminton", "singles"),
    resolveScheduleSelectionScope(secondLoad, "badminton", "singles")
  );
  assert.deepEqual(
    resolveScheduleSelectionScope(secondLoad, "all", "all"),
    { sportId: null, tournamentSportEventId: null }
  );
});

test("calendar participant labels support TEAM, SOLO, DUO, and future placeholders", () => {
  assert.equal(getScheduleParticipantLabel({ team1_label: "CITE", team2_label: "COTE" }), "CITE vs COTE");
  assert.equal(getScheduleParticipantLabel({ entry1_label: "Ana", entry2_label: "Bea" }), "Ana vs Bea");
  assert.equal(getScheduleParticipantLabel({ participant1_label: "Ana / Ali", participant2_label: "Bea / Ben" }), "Ana / Ali vs Bea / Ben");
  assert.equal(getScheduleParticipantLabel({ is_future_placeholder: true }), "Waiting for previous result");
  assert.equal(
    getScheduleParticipantLabel({
      is_future_placeholder: true,
      team1_label: "Winner of Match 1",
      team2_label: "Winner of Match 2",
    }),
    "Winner of Match 1 vs Winner of Match 2"
  );
});

test("horizontal calendar starts at the earliest visible match and ends after the latest", () => {
  const range = resolveVisibleScheduleHourRange({
    events: [
      {
        start: new Date(2026, 6, 1, 8, 20),
        end: new Date(2026, 6, 1, 9, 0),
      },
      {
        start: new Date(2026, 6, 2, 15, 30),
        end: new Date(2026, 6, 2, 16, 10),
      },
    ],
  });
  assert.deepEqual(range, { startHour: 8, endHour: 17 });
  assert.deepEqual(
    resolveVisibleScheduleHourRange({
      events: [],
      fallbackStartHour: 5,
      fallbackEndHour: 18,
    }),
    { startHour: 5, endHour: 18 }
  );
});

test("horizontal calendar range includes program blocks outside match hours", () => {
  const range = resolveVisibleScheduleHourRange({
    events: [
      {
        start: new Date(2026, 8, 2, 10, 0),
        end: new Date(2026, 8, 2, 11, 0),
      },
      {
        start: new Date(2026, 8, 2, 8, 0),
        end: new Date(2026, 8, 2, 10, 0),
        __kind: "PROGRAM_BLOCK",
      },
    ],
  });
  assert.deepEqual(range, { startHour: 8, endHour: 11 });
});

test("official program setup defaults dates only and preserves existing rows", () => {
  const emptyRows = buildOfficialProgramSetupRows({
    tournamentStartDate: "2026-08-01",
    tournamentEndDate: "2026-08-05",
  });
  assert.deepEqual(
    emptyRows.map(({ type, enabled, date, startTime, endTime }) => ({ type, enabled, date, startTime, endTime })),
    [
      { type: "OPENING_PROGRAM", enabled: false, date: "2026-08-01", startTime: "", endTime: "" },
      { type: "AWARDING", enabled: false, date: "2026-08-05", startTime: "", endTime: "" },
      { type: "CLOSING_CEREMONY", enabled: false, date: "2026-08-05", startTime: "", endTime: "" },
    ]
  );

  const existing = buildOfficialProgramSetupRows({
    tournamentStartDate: "2026-08-01",
    tournamentEndDate: "2026-08-05",
    programBlocks: [{
      id: 17,
      block_type: "OPENING_PROGRAM",
      date: "2026-08-02",
      start_time: "08:30:00",
      end_time: "10:00:00",
    }],
  });
  assert.equal(existing[0].enabled, true);
  assert.equal(existing[0].existingId, 17);
  assert.equal(existing[0].date, "2026-08-02");
  assert.equal(existing[0].startTime, "08:30");
});

test("official program setup requires explicit times and rejects overlaps", () => {
  const rows = buildOfficialProgramSetupRows({
    tournamentStartDate: "2026-08-01",
    tournamentEndDate: "2026-08-05",
  });
  rows[0].enabled = true;
  let errors = validateOfficialProgramSetup({
    rows,
    tournamentStartDate: "2026-08-01",
    tournamentEndDate: "2026-08-05",
  });
  assert.match(errors.OPENING_PROGRAM.join(" "), /start time is required/);
  assert.match(errors.OPENING_PROGRAM.join(" "), /end time is required/);

  rows[0].startTime = "08:00";
  rows[0].endTime = "10:00";
  rows[1] = { ...rows[1], enabled: true, date: "2026-08-01", startTime: "09:30", endTime: "10:30" };
  errors = validateOfficialProgramSetup({
    rows,
    tournamentStartDate: "2026-08-01",
    tournamentEndDate: "2026-08-05",
  });
  assert.match(errors.OPENING_PROGRAM.join(" "), /overlaps Awarding/);
  assert.match(errors.AWARDING.join(" "), /overlaps Opening Program/);

  rows[1].startTime = "10:00";
  errors = validateOfficialProgramSetup({
    rows,
    tournamentStartDate: "2026-08-01",
    tournamentEndDate: "2026-08-05",
  });
  assert.deepEqual(errors, {});
});

test("Schedules supplies the existing ProgramBlockModal contract and guided workflow", () => {
  const source = readFileSync(new URL("../../pages/coordinator/Schedules.jsx", import.meta.url), "utf8");
  assert.match(source, /isSportsCoordinator=\{Boolean\(isSportsCoordinator/);
  assert.match(source, /programBlocks=\{programBlocks\}/);
  assert.match(source, /openOfficialProgramSetup/);
  assert.match(source, /handleProgramSetupContinue/);
  assert.match(source, /runPreflightStep\(\{/);
  assert.match(source, /setScheduleCheckMode\(check\.outcome === "warning" \? "warning" : "ready"\)/);
});

test("Schedules exposes preflight and draft regeneration without published regeneration", () => {
  const source = readFileSync(new URL("../../pages/coordinator/Schedules.jsx", import.meta.url), "utf8");
  assert.match(source, /label: preflightRunning \? "Checking…" : "Run Preflight"/);
  assert.match(source, /label: "Regenerate Draft"/);
  assert.match(source, /if \(hasPublishedSchedule\) return null/);
  assert.match(source, /preflightIntent: regenerationMode \? "regenerate_replace" : "incremental_add"/);
});

test("Venue Settings presents capacity-aware canonical diagnostics", () => {
  const source = readFileSync(new URL("../../pages/coordinator/TournamentSettingsVenues.jsx", import.meta.url), "utf8");
  assert.match(source, /No venue capacity or availability conflicts were found/);
  assert.match(source, /simultaneous matches \/ .*playing areas/);
  assert.doesNotMatch(source, /already has a scheduled match in this time window/);
});
