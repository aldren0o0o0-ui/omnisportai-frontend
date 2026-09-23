import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const readRelative = (relativePath) => readFileSync(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  "utf8",
);

test("viewer composition contains no scorer dashboard or mutation API", () => {
  const source = readRelative("./LiveMatchViewerPage.jsx");
  assert.doesNotMatch(source, /LiveScoringDashboard/);
  assert.doesNotMatch(source, /\bcreateMatchEvent\b|\bdeleteMatchEvent\b|\bundoLastMatchEvent\b/);
  assert.match(source, /getLiveMatchViewer/);
  assert.match(source, /MatchRealtimeClient/);
});

test("viewer presentation dispatches all six capability families without sport-name branches", () => {
  const source = readRelative("../../components/live-match-viewer/MatchPresentation.jsx");
  for (const family of [
    "TIMED_TWO_SIDED",
    "SET_GAME_TWO_SIDED",
    "TENNIS_HIERARCHICAL",
    "ROUND_JUDGED",
    "INNING_SCOREBOARD",
    "RESULT_BOARD",
  ]) {
    assert.match(source, new RegExp(family));
  }
  assert.doesNotMatch(source, /sport\.name\s*===|includes\(["']Basketball/i);
});

test("all role layouts mount the same shared Match viewer route", () => {
  const app = readRelative("../../App.jsx");
  assert.match(app, /LiveMatchViewerPage/);
  assert.ok((app.match(/matches\/:matchId" element=\{renderLazyRoute\(LiveMatchViewerPage\)\}/g) || []).length >= 5);
});
