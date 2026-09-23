import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  isMetricRenderable,
  formatMetricValue,
  formatProfileDate,
  isRecordForSport,
  hasRole,
  normalizeRoles,
} from "./profileUtils.js";

describe("Phase 7C-3 — Player Profile UX + Sport-Specific Analytics Visualization", () => {
  // =========================================================================
  // SPORT SELECTOR
  // =========================================================================
  it("Test 1: Single sport renders without unnecessary selector", async () => {
    const selectorSrc = await readFile(
      new URL("./PlayerSportSelector.jsx", import.meta.url),
      "utf8"
    );
    assert.match(selectorSrc, /if \(sports\.length === 1\)/);
    assert.match(selectorSrc, /data-testid="player-sport-single"/);
    assert.match(selectorSrc, /single\.sport_name/);
  });

  it("Test 2: Multiple sports render selector", async () => {
    const selectorSrc = await readFile(
      new URL("./PlayerSportSelector.jsx", import.meta.url),
      "utf8"
    );
    assert.match(selectorSrc, /data-testid="player-sport-selector"/);
    assert.match(selectorSrc, /role="tablist"/);
    assert.match(selectorSrc, /role="tab"/);
    assert.match(selectorSrc, /data-testid=\{`player-sport-tab-\$\{s\.sport_id\}`\}/);
  });

  it("Test 3: Selected sport is identifiable by aria-selected and active styling", async () => {
    const selectorSrc = await readFile(
      new URL("./PlayerSportSelector.jsx", import.meta.url),
      "utf8"
    );
    assert.match(selectorSrc, /aria-selected=\{isSelected\}/);
    assert.match(selectorSrc, /tabIndex=\{isSelected \? 0 : -1\}/);
    assert.match(selectorSrc, /isSelected/);
  });

  it("Test 4: Switching sports changes active context", async () => {
    const contentSrc = await readFile(
      new URL("./PlayerProfileContent.jsx", import.meta.url),
      "utf8"
    );
    assert.match(contentSrc, /onSelectSport=\{setSelectedSportId\}/);
    assert.match(contentSrc, /s\.sport_id\) === String\(selectedSportId\)/);
    assert.match(contentSrc, /activeSport/);
  });

  it("Test 5: Many sports remain usable without layout assumptions and support arrow navigation", async () => {
    const selectorSrc = await readFile(
      new URL("./PlayerSportSelector.jsx", import.meta.url),
      "utf8"
    );
    assert.match(selectorSrc, /overflow-x-auto/);
    assert.match(selectorSrc, /ArrowRight/);
    assert.match(selectorSrc, /ArrowLeft/);
  });

  // =========================================================================
  // METRICS
  // =========================================================================
  it("Test 6: Available metric renders", () => {
    const validMetric = {
      key: "POINTS",
      label: "Total Points",
      value: 68,
      available: true,
      format: "NUMBER",
    };
    assert.equal(isMetricRenderable(validMetric), true);
    assert.equal(formatMetricValue(validMetric.value, validMetric.format), "68");
  });

  it("Test 7: Null metric does not render", () => {
    const nullMetric = {
      key: "REBOUNDS",
      label: "Rebounds",
      value: null,
      available: false,
    };
    assert.equal(isMetricRenderable(nullMetric), false);
    assert.equal(formatMetricValue(nullMetric.value, "NUMBER"), "");
  });

  it("Test 8: Unavailable metric does not render", () => {
    const unavail = {
      key: "STEALS",
      label: "Steals",
      value: 5,
      available: false,
    };
    assert.equal(isMetricRenderable(unavail), false);
  });

  it("Test 9: Basketball does not show unsupported rebound/steal/block/turnover values as zero", () => {
    const basketballMetrics = [
      { key: "POINTS", label: "Points", value: 45, available: true, format: "NUMBER" },
      { key: "ASSISTS", label: "Assists", value: 8, available: true, format: "NUMBER" },
      { key: "REBOUNDS", label: "Rebounds", value: null, available: false },
      { key: "STEALS", label: "Steals", value: null, available: false },
      { key: "BLOCKS", label: "Blocks", value: null, available: false },
      { key: "TURNOVERS", label: "Turnovers", value: null, available: false },
    ];

    const renderable = basketballMetrics.filter(isMetricRenderable);
    assert.equal(renderable.length, 2);
    const keys = renderable.map((m) => m.key);
    assert.deepEqual(keys, ["POINTS", "ASSISTS"]);
    assert.equal(keys.includes("REBOUNDS"), false);
    assert.equal(keys.includes("STEALS"), false);
    assert.equal(keys.includes("BLOCKS"), false);
    assert.equal(keys.includes("TURNOVERS"), false);
  });

  it("Test 10: Different sports can expose different metric sets without hardcoded shapes", () => {
    const badmintonMetrics = [
      { key: "RALLY_POINTS", label: "Rally Points", value: 120, available: true, format: "NUMBER" },
      { key: "SETS_WON", label: "Sets Won", value: 6, available: true, format: "NUMBER" },
    ];
    const volleyballMetrics = [
      { key: "SERVICE_ACES", label: "Aces", value: 12, available: true, format: "NUMBER" },
      { key: "SPIKES_KILLED", label: "Spikes", value: 24, available: true, format: "NUMBER" },
    ];

    const badm = badmintonMetrics.filter(isMetricRenderable);
    const volley = volleyballMetrics.filter(isMetricRenderable);

    assert.equal(badm.length, 2);
    assert.equal(volley.length, 2);
    assert.equal(badm[0].key, "RALLY_POINTS");
    assert.equal(volley[0].key, "SERVICE_ACES");
  });

  // =========================================================================
  // RECORD
  // =========================================================================
  it("Test 11: Backend wins/losses/draws render directly", async () => {
    const contentSrc = await readFile(
      new URL("./PlayerProfileContent.jsx", import.meta.url),
      "utf8"
    );
    assert.match(contentSrc, /matches:\s*activeSport\.matches_played/);
    assert.match(contentSrc, /wins:\s*activeSport\.wins/);
    assert.match(contentSrc, /losses:\s*activeSport\.losses/);
    assert.match(contentSrc, /draws:\s*activeSport\.draws/);
  });

  it("Test 12: Frontend does not recalculate record from match history", async () => {
    const contentSrc = await readFile(
      new URL("./PlayerProfileContent.jsx", import.meta.url),
      "utf8"
    );
    // Does not recalculate wins by iterating match history
    assert.doesNotMatch(contentSrc, /matchHistory\.filter\(.*result === ['"]WIN['"]\)\.length/);
    assert.doesNotMatch(contentSrc, /matchHistory\.reduce\(.*wins/);
  });

  // =========================================================================
  // CHART
  // =========================================================================
  it("Test 13: Valid multi-match data renders chart with Recharts", async () => {
    const chartSrc = await readFile(
      new URL("./PlayerPerformanceChart.jsx", import.meta.url),
      "utf8"
    );
    assert.match(chartSrc, /data-testid="player-chart-container"/);
    assert.match(chartSrc, /<ResponsiveContainer/);
    assert.match(chartSrc, /<LineChart/);
    assert.match(chartSrc, /<Line/);
  });

  it("Test 14: Chart uses selected sport only", () => {
    const activeSport = { sport_id: 14, sport_name: "Basketball", sport_code: "BASKETBALL" };
    const history = [
      { match_id: 1, sport_id: 14, sport: "Basketball", metric_value: 20 },
      { match_id: 2, sport_id: 15, sport: "Badminton", metric_value: 21 },
      { match_id: 3, sport_id: 14, sport: "Basketball", metric_value: 15 },
    ];

    const filtered = history.filter((m) => isRecordForSport(m, activeSport));
    assert.equal(filtered.length, 2);
    assert.deepEqual(filtered.map((m) => m.match_id), [1, 3]);
  });

  it("Test 15: One match renders single-match summary instead of trend", async () => {
    const chartSrc = await readFile(
      new URL("./PlayerPerformanceChart.jsx", import.meta.url),
      "utf8"
    );
    assert.match(chartSrc, /if \(performanceHistory\.length === 1\)/);
    assert.match(chartSrc, /data-testid="player-chart-single"/);
    assert.match(chartSrc, /Latest Match Performance/);
  });

  it("Test 16: Zero matches renders empty state", async () => {
    const chartSrc = await readFile(
      new URL("./PlayerPerformanceChart.jsx", import.meta.url),
      "utf8"
    );
    assert.match(chartSrc, /data-testid="player-chart-empty"/);
    assert.match(chartSrc, /No historical performance trend data available/);
  });

  it("Test 17: Missing numeric values do not create fabricated points", async () => {
    const chartSrc = await readFile(
      new URL("./PlayerPerformanceChart.jsx", import.meta.url),
      "utf8"
    );
    assert.match(chartSrc, /Number\.isFinite\(Number\(m\.metric_value\)\)/);
  });

  it("Test 18: Chart does not mix unrelated sports", () => {
    const bball = { sport_id: 1, sport_name: "Basketball", sport_code: "BASKETBALL" };
    const badm = { sport_id: 2, sport_name: "Badminton", sport_code: "BADMINTON" };

    const item1 = { sport_id: 1, sport: "Basketball", metric_value: 18 };
    const item2 = { sport_id: 2, sport: "Badminton", metric_value: 21 };

    assert.equal(isRecordForSport(item1, bball), true);
    assert.equal(isRecordForSport(item1, badm), false);
    assert.equal(isRecordForSport(item2, bball), false);
    assert.equal(isRecordForSport(item2, badm), true);
  });

  // =========================================================================
  // MATCH HISTORY
  // =========================================================================
  it("Test 19: Completed matches render", async () => {
    const matchesSrc = await readFile(
      new URL("./PlayerMatchHistory.jsx", import.meta.url),
      "utf8"
    );
    assert.match(matchesSrc, /data-testid=\{`player-match-item-\$\{m\.match_id \|\| idx\}`\}/);
    assert.match(matchesSrc, /data-testid="player-matches-container"/);
  });

  it("Test 20: Match result comes from backend", async () => {
    const matchesSrc = await readFile(
      new URL("./PlayerMatchHistory.jsx", import.meta.url),
      "utf8"
    );
    assert.match(matchesSrc, /String\(m\.result \|\| "PENDING"\)\.toUpperCase\(\)/);
    assert.match(matchesSrc, /data-testid="match-result-badge"/);
  });

  it("Test 21: Score comes from backend without reconstruction", async () => {
    const matchesSrc = await readFile(
      new URL("./PlayerMatchHistory.jsx", import.meta.url),
      "utf8"
    );
    assert.match(matchesSrc, /const score = m\.score \|\| null/);
    assert.match(matchesSrc, /\{score\}/);
  });

  it("Test 22: Missing contribution does not become zero", async () => {
    const matchesSrc = await readFile(
      new URL("./PlayerMatchHistory.jsx", import.meta.url),
      "utf8"
    );
    assert.match(matchesSrc, /if \(!stats \|\| typeof stats !== "object"\) return null;/);
    assert.match(matchesSrc, /stats\.points !== undefined && stats\.points !== null/);
  });

  it("Test 23: Selected sport filters history correctly", () => {
    const activeSport = { sport_id: 10, sport_name: "Volleyball", sport_code: "VOLLEYBALL" };
    const matches = [
      { match_id: 101, sport_id: 10, opponent: "COTE", result: "WIN" },
      { match_id: 102, sport_id: 20, opponent: "CCJE", result: "LOSS" },
    ];
    const filtered = matches.filter((m) => isRecordForSport(m, activeSport));
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].match_id, 101);
  });

  // =========================================================================
  // PARTICIPATION
  // =========================================================================
  it("Test 24: Team/entry context renders for active sport", async () => {
    const contentSrc = await readFile(
      new URL("./PlayerProfileContent.jsx", import.meta.url),
      "utf8"
    );
    assert.match(contentSrc, /data-testid="player-participation-context"/);
    assert.match(contentSrc, /entry_name/);
  });

  it("Test 25: Missing participation is handled gracefully without crash", async () => {
    const contentSrc = await readFile(
      new URL("./PlayerProfileContent.jsx", import.meta.url),
      "utf8"
    );
    assert.match(contentSrc, /participations\.length > 0 \?/);
    assert.match(contentSrc, /data-testid="player-no-sports"/);
  });

  // =========================================================================
  // MULTI-ROLE
  // =========================================================================
  it("Test 26: PLAYER + COACH still renders player experience correctly", async () => {
    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.match(drawerSrc, /\{isPlayer \? \(\s*<PlayerProfileContent/);
    assert.match(drawerSrc, /\{isCoach \? \(\s*<CoachSection/);

    const roles = [{ role: "Player" }, { role: "Coach" }];
    assert.equal(hasRole(roles, "Player"), true);
    assert.equal(hasRole(roles, "Coach"), true);
  });

  // =========================================================================
  // UTILITY / DATE FORMATTER
  // =========================================================================
  it("Test 27: formatProfileDate parses valid dates and safely handles missing or invalid dates", () => {
    assert.equal(formatProfileDate("2026-09-12T10:00:00"), "Sep 12, 2026");
    assert.equal(formatProfileDate(null), "");
    assert.equal(formatProfileDate(undefined), "");
    assert.equal(formatProfileDate("not-a-date"), "");
  });
});
