import test from "node:test";
import assert from "node:assert/strict";

import { resolveMatchParticipants } from "./participantResolver.js";

test("TEAM participants reuse tournament-aware roster data", () => {
  const match = Object.freeze({ participant_shape: "TEAM", team1_id: 10, team2_id: 20, team1_name: "Falcons" });
  const rosterData = Object.freeze({ 10: Object.freeze([{ id: 1, full_name: "A. One" }, { id: 2, full_name: "B. Two" }]) });
  const before = JSON.stringify({ match, rosterData });
  const [first] = resolveMatchParticipants({ match, rosterData });
  assert.equal(first.source, "team_roster");
  assert.deepEqual(first.members.map((member) => member.playerId), [1, 2]);
  assert.equal(JSON.stringify({ match, rosterData }), before);
});

test("TEAM live participant state preserves active and bench membership", () => {
  const [first] = resolveMatchParticipants({
    match: { participant_shape: "TEAM", team1_id: 10, team2_id: 20 },
    liveState: {
      participant_state: {
        unit_type: "TEAM",
        sides: {
          1: {
            team_id: 10,
            participant_shape: "TEAM",
            active_players: [{ id: 1, name: "Active Player" }],
            bench_players: [{ id: 2, name: "Bench Player" }],
          },
        },
      },
    },
    rosterData: { 10: [{ id: 99, full_name: "Stale Roster Player" }] },
  });
  assert.equal(first.source, "live_participant_state");
  assert.deepEqual(first.members.map((member) => member.playerId), [1, 2]);
});

test("SOLO resolves one entry member without a team", () => {
  const [first] = resolveMatchParticipants({
    match: { participant_shape: "SOLO", entry1_id: 101, entry2_id: 102 },
    entryData: [{ id: 101, entry_name: "CITE Singles", display_name: "Player A", image_url: "/entries/cite-singles.png", members: [{ player_id: 7, display_name: "Player A" }] }],
  });
  assert.equal(first.targetType, "ENTRY");
  assert.equal(first.teamId, null);
  assert.equal(first.members[0].playerId, 7);
  assert.equal(first.displayName, "CITE Singles");
  assert.equal(first.logoUrl, "/entries/cite-singles.png");
  assert.equal(first.resolutionStatus, "resolved");
});

test("DUO preserves both independently identifiable entry members", () => {
  const [first] = resolveMatchParticipants({
    match: { participant_shape: "DUO", entry1_id: 201, entry2_id: 202 },
    entryData: [{ id: 201, entry_name: "COTE Pair", display_name: "A + B", members: [{ player_id: 8, name: "A" }, { player_id: 9, name: "B" }] }],
  });
  assert.equal(first.source, "competition_entry");
  assert.deepEqual(first.members.map((member) => member.playerId), [8, 9]);
  assert.equal(first.displayName, "COTE Pair");
});

test("entry identity wins over legacy team IDs for SOLO and DUO", () => {
  for (const shape of ["SOLO", "DUO"]) {
    const members = shape === "SOLO" ? [{ player_id: 4 }] : [{ player_id: 4 }, { player_id: 5 }];
    const [first] = resolveMatchParticipants({
      match: { participant_shape: shape, entry1_id: 301, entry2_id: 302, team1_id: 10, team2_id: 20 },
      entryData: [{ id: 301, members }],
      rosterData: { 10: [{ id: 99 }] },
    });
    assert.equal(first.targetType, "ENTRY");
    assert.equal(first.source, "competition_entry");
    assert.equal(first.members.some((member) => member.playerId === 99), false);
  }
});

test("TEAM identity wins over coincident entry IDs", () => {
  const [first] = resolveMatchParticipants({
    match: { participant_shape: "TEAM", team1_id: 10, team2_id: 20, entry1_id: 301, entry2_id: 302 },
    entryData: [{ id: 301, members: [{ player_id: 99 }] }],
    rosterData: { 10: [{ id: 1 }] },
  });
  assert.equal(first.targetType, "TEAM");
  assert.equal(first.source, "team_roster");
  assert.deepEqual(first.members.map((member) => member.playerId), [1]);
});

test("valid latest live state wins over stale lower-priority sources", () => {
  const [first] = resolveMatchParticipants({
    match: { participant_shape: "DUO", entry1_id: 401, entry2_id: 402 },
    liveState: { participant_state: { unit_type: "DUO", sides: { 1: { entry_id: 401, team_id: 401, display_name: "Live Pair", active_players: [{ id: 11 }, { id: 12 }] } } } },
    configuration: { participants: { side_a: { entry_id: 401, members: [{ id: 91 }, { id: 92 }] } } },
    entryData: [{ id: 401, members: [{ player_id: 81 }, { player_id: 82 }] }],
  });
  assert.equal(first.source, "live_participant_state");
  assert.deepEqual(first.members.map((member) => member.playerId), [11, 12]);
});

test("ID-inconsistent live state is rejected for the next valid source", () => {
  const [first] = resolveMatchParticipants({
    match: { participant_shape: "SOLO", entry1_id: 501, entry2_id: 502 },
    liveState: { participant_state: { unit_type: "SOLO", sides: { 1: { entry_id: 999, team_id: 999, active_players: [{ id: 90 }] } } } },
    entryData: [{ id: 501, members: [{ player_id: 21 }] }],
  });
  assert.equal(first.source, "competition_entry");
  assert.deepEqual(first.members.map((member) => member.playerId), [21]);
});

test("member-invalid higher-priority state falls through to a valid entry", () => {
  const [first] = resolveMatchParticipants({
    match: { participant_shape: "DUO", entry1_id: 551, entry2_id: 552 },
    liveState: { participant_state: { unit_type: "DUO", sides: { 1: { entry_id: 551, team_id: 551, active_players: [{ id: 90 }] } } } },
    configuration: { participants: { side_a: { entry_id: 551, participant_shape: "SOLO", members: [{ id: 80 }] } } },
    entryData: [{ id: 551, participant_shape: "DUO", members: [{ player_id: 31 }, { player_id: 32 }] }],
  });
  assert.equal(first.source, "competition_entry");
  assert.deepEqual(first.members.map((member) => member.playerId), [31, 32]);
});

test("unresolved participants are explicit and never guessed", () => {
  const [first] = resolveMatchParticipants({ match: { participant_shape: "SOLO", entry1_id: 601, entry2_id: 602 } });
  assert.deepEqual(first.members, []);
  assert.equal(first.resolutionStatus, "participant_unavailable");
});
