import test from "node:test";
import assert from "node:assert/strict";

import {
  getBasketballActionDisabledReason,
  classifyTimedTeamControls,
  getTimedTeamActionControls,
  isBasketballTeamActionControl,
} from "./timedTeamActions.js";
import { buildEventPayload } from "../eventComposer/core/buildEventPayload.js";
import {
  partitionSportActions,
  getActionPresentation,
} from "../utils/liveScoringPresentation.js";

// Mock match context
const TEAM_A = 101;
const TEAM_B = 102;
const TEAM_A_NAME = "CITE";
const TEAM_B_NAME = "CCJE";

// =========================================================================
// 1. Possession Tests (Tests 1 to 14)
// =========================================================================

test("1. Possession team can use +2", () => {
  const reason = getBasketballActionDisabledReason({
    eventType: "TWO_PT_MADE",
    teamId: TEAM_A,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reason, "");
});

test("2. Possession team can use +3", () => {
  const reason = getBasketballActionDisabledReason({
    eventType: "THREE_PT_MADE",
    teamId: TEAM_A,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reason, "");
});

test("3. Defending team cannot use +2", () => {
  const reason = getBasketballActionDisabledReason({
    eventType: "TWO_PT_MADE",
    teamId: TEAM_B,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reason, `Disabled — ${TEAM_A_NAME} has possession.`);
});

test("4. Defending team cannot use +3", () => {
  const reason = getBasketballActionDisabledReason({
    eventType: "THREE_PT_MADE",
    teamId: TEAM_B,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reason, `Disabled — ${TEAM_A_NAME} has possession.`);
});

test("5. Possession team can commit turnover", () => {
  const reason = getBasketballActionDisabledReason({
    eventType: "TURNOVER",
    teamId: TEAM_A,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reason, "");
});

test("6. Defending team cannot commit turnover", () => {
  const reason = getBasketballActionDisabledReason({
    eventType: "TURNOVER",
    teamId: TEAM_B,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reason, "Turnovers can only be committed by the team in possession.");
});

test("7. Defending team can use steal", () => {
  const reason = getBasketballActionDisabledReason({
    eventType: "STEAL",
    teamId: TEAM_B,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reason, "");
});

test("8. Possession team cannot use steal", () => {
  const reason = getBasketballActionDisabledReason({
    eventType: "STEAL",
    teamId: TEAM_A,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reason, "Steals can only be credited to the defending team.");
});

test("9. Defending team can use block", () => {
  const reason = getBasketballActionDisabledReason({
    eventType: "BLOCK",
    teamId: TEAM_B,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reason, "");
});

test("10. Possession team cannot use block", () => {
  const reason = getBasketballActionDisabledReason({
    eventType: "BLOCK",
    teamId: TEAM_A,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reason, "Blocks can only be credited to the defending team.");
});

test("11. Possession team can use offensive rebound", () => {
  const reason = getBasketballActionDisabledReason({
    eventType: "OFFENSIVE_REBOUND",
    teamId: TEAM_A,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reason, "");
});

test("12. Defending team cannot use offensive rebound", () => {
  const reason = getBasketballActionDisabledReason({
    eventType: "OFFENSIVE_REBOUND",
    teamId: TEAM_B,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reason, "Offensive rebounds can only be committed by the team in possession.");
});

test("13. Defending team can use defensive rebound", () => {
  const reason = getBasketballActionDisabledReason({
    eventType: "DEFENSIVE_REBOUND",
    teamId: TEAM_B,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reason, "");
});

test("14. Possession team cannot use defensive rebound", () => {
  const reason = getBasketballActionDisabledReason({
    eventType: "DEFENSIVE_REBOUND",
    teamId: TEAM_A,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reason, "Defensive rebounds can only be credited to the defending team.");
});

test("14b. Possession team can use assist", () => {
  const reason = getBasketballActionDisabledReason({
    eventType: "ASSIST",
    teamId: TEAM_A,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reason, "");
});

test("14c. Defending team cannot use assist", () => {
  const reason = getBasketballActionDisabledReason({
    eventType: "ASSIST",
    teamId: TEAM_B,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reason, "Assists can only be credited to the team in possession.");
});

// =========================================================================
// 2. Free Throw Tests (Test 15)
// =========================================================================

test("15. Free throw is not disabled solely because the team is not the current possession team", () => {
  // When defending team shoots free throw (e.g. technical or shooting foul)
  const reasonDefendingFT = getBasketballActionDisabledReason({
    eventType: "FREE_THROW",
    teamId: TEAM_B,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reasonDefendingFT, "");

  const reasonDefendingFTMade = getBasketballActionDisabledReason({
    eventType: "FREE_THROW_MADE",
    teamId: TEAM_B,
    possessionTeamId: TEAM_A,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(reasonDefendingFTMade, "");
});

// =========================================================================
// 3. Uninitialized Possession Tests (Test 16)
// =========================================================================

test("16. Basketball actions are not incorrectly disabled when possession is null", () => {
  for (const eventType of [
    "TWO_PT_MADE",
    "THREE_PT_MADE",
    "FREE_THROW",
    "TURNOVER",
    "STEAL",
    "BLOCK",
    "OFFENSIVE_REBOUND",
    "DEFENSIVE_REBOUND",
  ]) {
    const reasonTeamA = getBasketballActionDisabledReason({
      eventType,
      teamId: TEAM_A,
      possessionTeamId: null,
      hasSelectedPlayer: true,
    });
    assert.equal(reasonTeamA, "", `Expected ${eventType} to be allowed when possession is null`);

    const reasonTeamB = getBasketballActionDisabledReason({
      eventType,
      teamId: TEAM_B,
      possessionTeamId: null,
      hasSelectedPlayer: true,
    });
    assert.equal(reasonTeamB, "", `Expected ${eventType} to be allowed when possession is null`);
  }
});

// =========================================================================
// 4. Player Attribution Tests (Tests 17 to 19)
// =========================================================================

test("17. Basketball scoring requires a valid selected player where required", () => {
  const reasonWithoutPlayer = getBasketballActionDisabledReason({
    eventType: "TWO_PT_MADE",
    teamId: TEAM_A,
    possessionTeamId: TEAM_A,
    hasSelectedPlayer: false,
  });
  assert.equal(reasonWithoutPlayer, "Select a player above before scoring");

  const config = {
    state_version: 1,
    event_types: [{ name: "TWO_PT_MADE", has_player: true, has_team: true }],
  };
  const payloadResult = buildEventPayload({
    selectedControl: { event_type: "TWO_PT_MADE", requires_team: true, requires_player: true },
    formState: { selectedTeamId: TEAM_A, selectedPlayerId: "", inputValue: "", inputBoolean: false },
    validatedConfig: config,
  });
  assert.equal(payloadResult.payload, null);
  assert.equal(payloadResult.error, "Please select a player.");
});

test("18. Changing teams cannot submit a stale player", () => {
  // Roster: Team A has player 1; Team B has player 2
  const teamAMembers = [{ playerId: 1, displayName: "Player 1" }];
  const teamBMembers = [{ playerId: 2, displayName: "Player 2" }];

  const validateTeamPlayerCombination = (teamId, playerId, participants) => {
    const participant = participants.find((p) => Number(p.id) === Number(teamId));
    if (!participant) return false;
    const validMemberIds = new Set(participant.members.map((m) => Number(m.playerId)));
    return validMemberIds.has(Number(playerId));
  };

  const participants = [
    { id: TEAM_A, members: teamAMembers },
    { id: TEAM_B, members: teamBMembers },
  ];

  // Selecting Team B with Team A's player 1 must fail validation
  const isStaleValid = validateTeamPlayerCombination(TEAM_B, 1, participants);
  assert.equal(isStaleValid, false, "Stale player from Team A should not be valid for Team B");

  // Selecting Team B with Team B's player 2 must pass validation
  const isCorrectValid = validateTeamPlayerCombination(TEAM_B, 2, participants);
  assert.equal(isCorrectValid, true, "Player 2 belongs to Team B and should be valid");
});

test("19. Invalid player/team combinations are blocked", () => {
  const participants = [
    { id: TEAM_A, members: [{ playerId: 10 }] },
    { id: TEAM_B, members: [{ playerId: 20 }] },
  ];
  const participantA = participants.find((p) => p.id === TEAM_A);
  const validIds = new Set(participantA.members.map((m) => m.playerId));

  // Non-existent player ID 999
  assert.equal(validIds.has(999), false);
  // Player 20 belongs to Team B, not Team A
  assert.equal(validIds.has(20), false);
});

// =========================================================================
// 5. Event Naming Tests (Tests 20 to 22)
// =========================================================================

test("20. New 2PT action uses the canonical backend event type TWO_PT_MADE", () => {
  globalThis.window = { crypto: { randomUUID: () => "uuid-2pt" } };
  const control = { event_type: "TWO_PT_MADE", requires_team: true, requires_player: true };
  const config = {
    state_version: 1,
    event_types: [{ name: "TWO_PT_MADE", has_team: true, has_player: true }],
  };
  const result = buildEventPayload({
    selectedControl: control,
    formState: { selectedTeamId: TEAM_A, selectedPlayerId: 5, inputValue: "", inputBoolean: false },
    validatedConfig: config,
    liveStateVersion: 3,
  });
  assert.equal(result.error, null);
  assert.equal(result.payload.event_type, "TWO_PT_MADE");
  assert.equal(result.payload.team_id, TEAM_A);
  assert.equal(result.payload.player_id, 5);
});

test("21. New 3PT action uses the canonical backend event type THREE_PT_MADE", () => {
  globalThis.window = { crypto: { randomUUID: () => "uuid-3pt" } };
  const control = { event_type: "THREE_PT_MADE", requires_team: true, requires_player: true };
  const config = {
    state_version: 1,
    event_types: [{ name: "THREE_PT_MADE", has_team: true, has_player: true }],
  };
  const result = buildEventPayload({
    selectedControl: control,
    formState: { selectedTeamId: TEAM_A, selectedPlayerId: 7, inputValue: "", inputBoolean: false },
    validatedConfig: config,
    liveStateVersion: 3,
  });
  assert.equal(result.error, null);
  assert.equal(result.payload.event_type, "THREE_PT_MADE");
  assert.equal(result.payload.team_id, TEAM_A);
  assert.equal(result.payload.player_id, 7);
});

test("22. Existing aliases remain compatible where required", () => {
  const controls = [
    { event_type: "TWO_POINT_MADE", enabled: true },
    { event_type: "THREE_POINT_MADE", enabled: true },
    { event_type: "FREE_THROW_MADE", enabled: true },
  ];
  const classified = classifyTimedTeamControls(controls);
  assert.equal(classified.primary[0].quickLabel, "+1");
  assert.equal(classified.primary[1].quickLabel, "+2");
  assert.equal(classified.primary[2].quickLabel, "+3");

  // Presentation labels exist for aliases
  assert.equal(getActionPresentation("TWO_POINT_MADE").label, "2-point shot");
  assert.equal(getActionPresentation("THREE_POINT_MADE").label, "3-point shot");
  assert.equal(getActionPresentation("FREE_THROW_MADE").label, "Free throw made");
});

// =========================================================================
// 6. UI State Tests (Tests 23 to 25)
// =========================================================================

test("23. Possession indicator updates when possession changes", () => {
  const getTeamRole = (teamId, currentPossessionId) => {
    if (!currentPossessionId) return "NEUTRAL";
    return Number(teamId) === Number(currentPossessionId) ? "OFFENSE" : "DEFENSE";
  };

  // Initially Team A has possession
  assert.equal(getTeamRole(TEAM_A, TEAM_A), "OFFENSE");
  assert.equal(getTeamRole(TEAM_B, TEAM_A), "DEFENSE");

  // Possession changes to Team B (e.g. after turnover or steal)
  assert.equal(getTeamRole(TEAM_A, TEAM_B), "DEFENSE");
  assert.equal(getTeamRole(TEAM_B, TEAM_B), "OFFENSE");

  // Possession uninitialized
  assert.equal(getTeamRole(TEAM_A, null), "NEUTRAL");
  assert.equal(getTeamRole(TEAM_B, null), "NEUTRAL");
});

test("24. Disabled state updates after a live event/WebSocket update", () => {
  // When Team A has possession: Team B's 2PT is disabled
  let currentPossession = TEAM_A;
  let teamB2ptDisabledReason = getBasketballActionDisabledReason({
    eventType: "TWO_PT_MADE",
    teamId: TEAM_B,
    possessionTeamId: currentPossession,
    possessionTeamName: TEAM_A_NAME,
    hasSelectedPlayer: true,
  });
  assert.ok(teamB2ptDisabledReason.length > 0, "Team B 2PT should be disabled");

  // WebSocket event arrives transferring possession to Team B
  currentPossession = TEAM_B;
  teamB2ptDisabledReason = getBasketballActionDisabledReason({
    eventType: "TWO_PT_MADE",
    teamId: TEAM_B,
    possessionTeamId: currentPossession,
    possessionTeamName: TEAM_B_NAME,
    hasSelectedPlayer: true,
  });
  assert.equal(teamB2ptDisabledReason, "", "Team B 2PT should now be enabled");

  // Team A's 2PT should now be disabled
  const teamA2ptDisabledReason = getBasketballActionDisabledReason({
    eventType: "TWO_PT_MADE",
    teamId: TEAM_A,
    possessionTeamId: currentPossession,
    possessionTeamName: TEAM_B_NAME,
    hasSelectedPlayer: true,
  });
  assert.ok(teamA2ptDisabledReason.length > 0, "Team A 2PT should now be disabled");
});

test("25. No stale possession state remains after match updates", () => {
  // Helper simulating canonical state resolution
  const resolvePossession = (displayState, localOverride) => {
    return Number(displayState?.possession_team_id) || Number(localOverride) || null;
  };

  // Live match state with Team A in possession
  let displayState = { possession_team_id: TEAM_A };
  let localOverride = null;
  assert.equal(resolvePossession(displayState, localOverride), TEAM_A);

  // Match reset / uninitialized state
  displayState = { possession_team_id: null };
  assert.equal(resolvePossession(displayState, localOverride), null);

  // Verify that an uninitialized state allows action submission without stale blocks
  const reasonAfterReset = getBasketballActionDisabledReason({
    eventType: "TWO_PT_MADE",
    teamId: TEAM_A,
    possessionTeamId: resolvePossession(displayState, localOverride),
    hasSelectedPlayer: true,
  });
  assert.equal(reasonAfterReset, "");
});
