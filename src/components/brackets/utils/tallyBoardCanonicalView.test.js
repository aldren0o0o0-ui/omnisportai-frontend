import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCanonicalPlayerOptions,
  buildCanonicalPlayerStatsTable,
  findResolvedParticipant,
  shouldClearSelectedPlayer,
} from "./tallyBoardCanonicalView.js";

const participants = [
  { side: 1, targetId: 10, displayName: "Alpha", resolutionStatus: "resolved", members: [{ playerId: 1, displayName: "A" }, { playerId: 2, displayName: "B" }] },
  { side: 2, targetId: 20, displayName: "Beta", resolutionStatus: "resolved", members: [{ playerId: 3, displayName: "C" }] },
];

test("canonical player options are target-scoped for TEAM, SOLO, and DUO targets", () => {
  assert.deepEqual(buildCanonicalPlayerOptions({ participants, selectedTargetId: 10 }).map((row) => row.id), [1, 2]);
  assert.deepEqual(buildCanonicalPlayerOptions({ participants, selectedTargetId: 20 }).map((row) => row.id), [3]);
  assert.equal(buildCanonicalPlayerOptions({ participants }).length, 3);
});

test("selected player clears only when membership becomes stale", () => {
  const alpha = findResolvedParticipant(participants, 10);
  assert.equal(shouldClearSelectedPlayer({ selectedPlayerId: 1, participant: alpha }), false);
  assert.equal(shouldClearSelectedPlayer({ selectedPlayerId: 99, participant: alpha }), true);
  assert.equal(shouldClearSelectedPlayer({ selectedPlayerId: "", participant: alpha }), false);
});

test("basketball integration uses canonical primary aliases, zeroes, sorting, and hides unknown keys", () => {
  const table = buildCanonicalPlayerStatsTable({
    sportKey: "basketball",
    participants,
    playerStats: { 1: { POINTS: 4, ASSIST: 2, REBOUND: 1, UNKNOWN_INTERNAL: 50 }, 2: { POINTS: 8 } },
  });
  assert.deepEqual(table.columns.map((column) => column.label), ["PTS", "AST", "REB", "STL", "BLK", "TO"]);
  assert.deepEqual(table.rows.map((row) => row.playerId), [2, 1, 3]);
  assert.equal(table.rows[1].metrics.assists.displayValue, "2");
  assert.equal(table.rows[1].metrics.blocks.displayValue, "0");
  assert.equal(table.columns.some((column) => column.key === "UNKNOWN_INTERNAL"), false);
  assert.deepEqual(table.secondaryColumns.map((column) => column.label), ["FT", "2PM", "3PM", "PF", "TECH"]);
  assert.equal(table.secondaryColumns.some((column) => table.columns.some((primary) => primary.key === column.key)), false);
});

test("football integration uses meaningful columns without generic violations", () => {
  const table = buildCanonicalPlayerStatsTable({ sportKey: "football_11v11", participants, playerStats: { 1: { GOAL: 1, YELLOW_CARD: 1, FOUL: 2 } } });
  assert.deepEqual(table.columns.map((column) => column.label), ["G", "YC", "RC", "PF"]);
  assert.equal(table.columns.some((column) => column.key === "violations"), false);
});

test("specialized player tables retain unavailable values instead of false zeroes", () => {
  const table = buildCanonicalPlayerStatsTable({ sportKey: "boxing", participants, playerStats: {}, engineType: "JUDGE_SCORECARD" });
  assert.equal(table.rows[0].metrics.result.displayValue, "—");
  assert.equal(table.rows[0].metrics.warnings.displayValue, "—");
});

test("replacement live state recomputes canonical values without local state", () => {
  const first = buildCanonicalPlayerStatsTable({ sportKey: "basketball", participants, playerStats: { 1: { ASSIST: 2 } } });
  const next = buildCanonicalPlayerStatsTable({ sportKey: "basketball", participants, playerStats: { 1: { ASSIST: 1 } } });
  assert.equal(first.rows.find((row) => row.playerId === 1).metrics.assists.value, 2);
  assert.equal(next.rows.find((row) => row.playerId === 1).metrics.assists.value, 1);
});
