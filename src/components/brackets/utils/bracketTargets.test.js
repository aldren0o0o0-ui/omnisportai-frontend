import assert from "node:assert/strict";
import test from "node:test";

import {
  getMatchParticipantLabel,
  getMatchParticipantTarget,
  hasResolvedMatchParticipants,
} from "./bracketTargets.js";

test("TEAM match participants enable live scoring", () => {
  const match = {
    team1_id: 11,
    team2_id: 12,
    entry1_id: 101,
    entry2_id: 102,
    participant_shape: "TEAM",
    team1_name: "Hawks",
    team2_name: "Eagles",
  };

  assert.equal(hasResolvedMatchParticipants(match), true);
  assert.deepEqual(getMatchParticipantTarget(match, 1), { type: "TEAM", id: 11 });
  assert.equal(getMatchParticipantLabel(match, 2), "Eagles");
});

test("SOLO and DUO entry participants enable live scoring without Team IDs", () => {
  const match = {
    entry1_id: 21,
    entry2_id: 22,
    participant1: { source_type: "ENTRY", display_name: "CITE Singles", entry_id: 21 },
    participant2: { source_type: "ENTRY", display_name: "COTE Pair", entry_id: 22 },
  };

  assert.equal(hasResolvedMatchParticipants(match), true);
  assert.deepEqual(getMatchParticipantTarget(match, 1), { type: "ENTRY", id: 21 });
  assert.equal(getMatchParticipantLabel(match, 1), "CITE Singles");
  assert.equal(getMatchParticipantLabel(match, 2), "COTE Pair");
});

test("future-round placeholders do not expose live-scoring actions", () => {
  const match = {
    participant1: { source_type: "PLACEHOLDER", display_name: "Winner of Match 1" },
    participant2: { source_type: "PLACEHOLDER", display_name: "Winner of Match 2" },
  };

  assert.equal(hasResolvedMatchParticipants(match), false);
  assert.equal(getMatchParticipantLabel(match, 1), "Winner of Match 1");
});
