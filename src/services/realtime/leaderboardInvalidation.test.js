import test from "node:test";
import assert from "node:assert/strict";

import { acceptLeaderboardInvalidation } from "./leaderboardInvalidation.js";

const event = (id, version, sportId = 5) => ({
  event_id: id,
  event_type: "leaderboard.invalidated",
  state_version: version,
  payload: { tournament_id: 86, sport_id: sportId, event_id: 71, version },
});

test("leaderboard invalidation rejects duplicate, stale, and unrelated Sport events", () => {
  const seen = new Map();
  const versions = new Map();
  assert.equal(acceptLeaderboardInvalidation({ message: event("a", 41), sportId: 5, seen, versions }), true);
  assert.equal(acceptLeaderboardInvalidation({ message: event("a", 41), sportId: 5, seen, versions }), false);
  assert.equal(acceptLeaderboardInvalidation({ message: event("b", 40), sportId: 5, seen, versions }), false);
  assert.equal(acceptLeaderboardInvalidation({ message: event("c", 42, 9), sportId: 5, seen, versions }), false);
  assert.equal(acceptLeaderboardInvalidation({ message: event("d", 42), sportId: 5, seen, versions }), true);
});
