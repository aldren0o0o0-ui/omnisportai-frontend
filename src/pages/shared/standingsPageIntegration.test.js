import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("shared Standings exposes overall, sport, competitor, and player views", () => {
  const page = read("./StandingsPage.jsx");
  assert.match(page, /Overall/);
  assert.match(page, /Sport \/ Event/);
  assert.match(page, /Teams \/ Entries/);
  assert.match(page, /Players/);
  assert.match(page, /role="tablist"/);
  assert.doesNotMatch(page, /Leaderboard Dashboard/);
});

test("analytics panel uses backend options, leaderboard, ranks, and metric schema", () => {
  const panel = read("./AnalyticsStandingsPanel.jsx");
  assert.match(panel, /getAnalyticsOptions/);
  assert.match(panel, /getAnalyticsLeaderboard/);
  assert.match(panel, /row\.rank/);
  assert.match(panel, /columnsForMetricSchema/);
  assert.doesNotMatch(panel, /payload\?\.rows[^;]*\.sort\(/);
});

test("analytics integration keeps scoped filters and stale-response protection", () => {
  const panel = read("./AnalyticsStandingsPanel.jsx");
  assert.match(panel, /tournamentId, sportId, eventId/);
  assert.match(panel, /participantType/);
  assert.match(panel, /requestId !== requestSequence\.current/);
  assert.match(panel, /Department/);
});

test("wide standings tables keep rank and competitor columns sticky", () => {
  const panel = read("./AnalyticsStandingsPanel.jsx");
  assert.match(panel, /sticky left-0/);
  assert.match(panel, /sticky left-16/);
  assert.match(panel, /overflow-x-auto/);
});
