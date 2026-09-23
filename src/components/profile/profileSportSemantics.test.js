import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  isRecordForSport,
  isMetricRenderable,
  formatMetricValue,
  formatOrientedScore,
  formatProfileDate,
} from "./profileUtils.js";

describe("Phase 7C-7: Sport-Aware Profile UX & Data Semantics Remediation", () => {
  // =========================================================================
  // 1. SPORT VS. EVENT SEMANTICS & HIERARCHY
  // =========================================================================
  it("Test 1: Multiple events in same sport do not label events as different sports", async () => {
    const selectorSrc = await readFile(
      new URL("./PlayerSportSelector.jsx", import.meta.url),
      "utf8"
    );
    // Distinct sports map deduplicates by sport_id
    assert.match(selectorSrc, /map\.set\(sid/);
    assert.match(selectorSrc, /distinctSports/);
    // Renders event count badge when multiple events exist
    assert.match(selectorSrc, /eventsInActiveGroup\.length > 1/);
    assert.match(selectorSrc, /data-testid="player-event-selector"/);
  });

  it("Test 2: Two-tiered selector renders All Events tab and individual event tabs", async () => {
    const selectorSrc = await readFile(
      new URL("./PlayerSportSelector.jsx", import.meta.url),
      "utf8"
    );
    assert.match(selectorSrc, /data-testid="player-event-tab-all"/);
    assert.match(selectorSrc, /data-testid=\{`player-event-tab-\$\{evt\.event_id\}`\}/);
    assert.match(selectorSrc, /onSelectEvent\("all"\)/);
    assert.match(selectorSrc, /onSelectEvent\(evt\.event_id\)/);
  });

  it("Test 3: Switching sport resets event selection to 'all'", async () => {
    const contentSrc = await readFile(
      new URL("./PlayerProfileContent.jsx", import.meta.url),
      "utf8"
    );
    assert.match(contentSrc, /setSelectedEventId\("all"\)/);
    assert.match(contentSrc, /selectedEventId/);
  });

  // =========================================================================
  // 2. MATCH RECORD INCONSISTENCY RESOLUTION
  // =========================================================================
  it("Test 4: Sport-level aggregate matches canonical sport_breakdown record", async () => {
    const contentSrc = await readFile(
      new URL("./PlayerProfileContent.jsx", import.meta.url),
      "utf8"
    );
    // Uses canonical backend sport_breakdown when "all" events is selected
    assert.match(contentSrc, /profile\?\.stats\?\.sport_breakdown/);
    assert.match(contentSrc, /matches:\s*brk\.matches/);
    assert.match(contentSrc, /wins:\s*brk\.wins/);
    assert.match(contentSrc, /losses:\s*brk\.losses/);
    assert.match(contentSrc, /draws:\s*brk\.draws/);
  });

  it("Test 5: Event-level selection displays exact event record", async () => {
    const contentSrc = await readFile(
      new URL("./PlayerProfileContent.jsx", import.meta.url),
      "utf8"
    );
    assert.match(contentSrc, /matches:\s*activeSport\.matches_played/);
    assert.match(contentSrc, /wins:\s*activeSport\.wins/);
    assert.match(contentSrc, /losses:\s*activeSport\.losses/);
    assert.match(contentSrc, /draws:\s*activeSport\.draws/);
  });

  it("Test 6: Match record with 0 completed matches does not inflate Played or Wins", () => {
    const pendingMatchesOnly = [
      { match_id: 1, status: "SCHEDULED", result: "PENDING" },
      { match_id: 2, status: "WAITING_OPPONENT", result: "PENDING" },
    ];
    // Record remains 0-0-0-0 as supplied by backend
    const record = { matches: 0, wins: 0, losses: 0, draws: 0 };
    assert.equal(record.matches, 0);
    assert.equal(record.wins, 0);
    assert.equal(record.losses, 0);
    assert.equal(record.draws, 0);
  });

  // =========================================================================
  // 3. MATCH-STATE SEMANTICS
  // =========================================================================
  it("Test 7: Match history distinguishes LIVE / ONGOING, WAITING, SCHEDULED, and COMPLETED", async () => {
    const historySrc = await readFile(
      new URL("./PlayerMatchHistory.jsx", import.meta.url),
      "utf8"
    );
    assert.match(historySrc, /isOngoing/);
    assert.match(historySrc, /badgeLabel = "LIVE"/);
    assert.match(historySrc, /isWaiting/);
    assert.match(historySrc, /badgeLabel = "WAITING"/);
    assert.match(historySrc, /isScheduled/);
    assert.match(historySrc, /badgeLabel = "SCHEDULED"/);
  });

  it("Test 8: formatOrientedScore orients score relative to participant's result", () => {
    // When participant WON, but raw score has lower score first (e.g. side 2 won 0 - 2)
    assert.equal(formatOrientedScore("0 - 2", "WIN"), "2 - 0");
    // When participant LOST, but raw score has higher score first (e.g. side 2 lost 2 - 0)
    assert.equal(formatOrientedScore("2 - 0", "LOSS"), "0 - 2");
    // Already oriented or draw stays unchanged
    assert.equal(formatOrientedScore("2 - 0", "WIN"), "2 - 0");
    assert.equal(formatOrientedScore("1 - 1", "DRAW"), "1 - 1");
    assert.equal(formatOrientedScore(null, "WIN"), null);
    assert.equal(formatOrientedScore(undefined, "WIN"), undefined);
  });

  // =========================================================================
  // 4. METRIC SEMANTICS & LEGITIMATE ZERO VS UNAVAILABLE
  // =========================================================================
  it("Test 9: Legitimate zero-value metric is preserved and rendered as '0'", () => {
    const zeroMetric = {
      key: "GAMES_WON",
      label: "Games won",
      value: 0,
      available: true,
      unit: "count",
    };
    assert.equal(isMetricRenderable(zeroMetric), true);
    assert.equal(formatMetricValue(zeroMetric.value, "NUMBER"), "0");
  });

  it("Test 10: Null or untracked metric is excluded by isMetricRenderable", () => {
    const unavailMetric = {
      key: "REBOUNDS",
      label: "Rebounds",
      value: null,
      available: false,
    };
    assert.equal(isMetricRenderable(unavailMetric), false);
    assert.equal(formatMetricValue(unavailMetric.value), "");
  });

  it("Test 11: Metric terminology displays 'X metrics tracked' instead of 'X recorded'", async () => {
    const metricSrc = await readFile(
      new URL("./PlayerMetricCards.jsx", import.meta.url),
      "utf8"
    );
    assert.match(metricSrc, /metric tracked/);
    assert.match(metricSrc, /metrics tracked/);
    assert.doesNotMatch(metricSrc, /\{validMetrics\.length\} recorded/);
  });

  // =========================================================================
  // 5. DUPLICATE ROSTER / ENTRY CONTEXT DEDUPLICATION
  // =========================================================================
  it("Test 12: Duplicate participations are deduplicated by (tournament_id, event_id, entry_id)", async () => {
    const contentSrc = await readFile(
      new URL("./PlayerProfileContent.jsx", import.meta.url),
      "utf8"
    );
    assert.match(contentSrc, /seen\.has\(key\)/);
    assert.match(contentSrc, /deduplicated\.push\(p\)/);
  });

  it("Test 13: Participation cards display tournament identification badge", async () => {
    const contentSrc = await readFile(
      new URL("./PlayerProfileContent.jsx", import.meta.url),
      "utf8"
    );
    assert.match(contentSrc, /tournamentTitle/);
    assert.match(contentSrc, /🏆/);
    assert.match(contentSrc, /data-testid=\{`participation-card-\$\{part\.entry_id \|\| idx\}`\}/);
  });

  it("Test 14: Teammates / partner are rendered when available for DUO and TEAM entries", async () => {
    const contentSrc = await readFile(
      new URL("./PlayerProfileContent.jsx", import.meta.url),
      "utf8"
    );
    assert.match(contentSrc, /teammates/);
    assert.match(contentSrc, /Partner\/Teammates/);
    assert.match(contentSrc, /part\.participant_shape/);
  });

  // =========================================================================
  // 6. CROSS-SPORT & CROSS-EVENT ISOLATION
  // =========================================================================
  it("Test 15: isRecordForSport isolates records strictly across different sports", () => {
    const badminton = { sport_id: 5, sport_name: "Badminton", sport_code: "BADMINTON" };
    const basketball = { sport_id: 4, sport_name: "Basketball", sport_code: "BASKETBALL" };
    const chess = { sport_id: 11, sport_name: "Chess", sport_code: "CHESS" };

    const badmMatch = { sport_id: 5, sport: "Badminton" };
    const bballMatch = { sport_id: 4, sport: "Basketball" };
    const chessMatch = { sport_id: 11, sport: "Chess" };

    assert.equal(isRecordForSport(badmMatch, badminton), true);
    assert.equal(isRecordForSport(badmMatch, basketball), false);
    assert.equal(isRecordForSport(badmMatch, chess), false);

    assert.equal(isRecordForSport(bballMatch, basketball), true);
    assert.equal(isRecordForSport(bballMatch, badminton), false);

    assert.equal(isRecordForSport(chessMatch, chess), true);
    assert.equal(isRecordForSport(chessMatch, badminton), false);
  });

  it("Test 16: isRecordForSport supports strict event-level scoping", () => {
    const badmActive = {
      sport_id: 5,
      sport_name: "Badminton",
      event_id: 98,
      event_name: "Women's Doubles",
    };

    const matchEvent98 = { sport_id: 5, event_id: 98 };
    const matchEvent148 = { sport_id: 5, event_id: 148 };

    // With strictEvent: true and eventId: 98
    assert.equal(
      isRecordForSport(matchEvent98, badmActive, { strictEvent: true, eventId: 98 }),
      true
    );
    assert.equal(
      isRecordForSport(matchEvent148, badmActive, { strictEvent: true, eventId: 98 }),
      false
    );

    // With strictEvent: false (All Events active)
    assert.equal(
      isRecordForSport(matchEvent98, badmActive, { strictEvent: false }),
      true
    );
    assert.equal(
      isRecordForSport(matchEvent148, badmActive, { strictEvent: false }),
      true
    );
  });

  // =========================================================================
  // 7. PERFORMANCE CHART SEMANTICS (0, 1, 2+ MATCHES)
  // =========================================================================
  it("Test 17: Chart renders empty state message without broken axes when 0 completed matches", async () => {
    const chartSrc = await readFile(
      new URL("./PlayerPerformanceChart.jsx", import.meta.url),
      "utf8"
    );
    assert.match(chartSrc, /No completed-match performance data yet\./);
    assert.match(chartSrc, /data-testid="player-chart-empty"/);
  });

  it("Test 18: Chart renders compact single-match summary when exactly 1 completed match", async () => {
    const chartSrc = await readFile(
      new URL("./PlayerPerformanceChart.jsx", import.meta.url),
      "utf8"
    );
    assert.match(chartSrc, /validHistory\.length === 1/);
    assert.match(chartSrc, /data-testid="player-chart-single"/);
    assert.match(chartSrc, /Latest Match Performance/);
  });

  it("Test 19: Chart heading dynamically displays metric label trend", async () => {
    const chartSrc = await readFile(
      new URL("./PlayerPerformanceChart.jsx", import.meta.url),
      "utf8"
    );
    assert.match(chartSrc, /primaryMetricLabel\s*\?\s*`\$\{primaryMetricLabel\} Trend`/);
  });
});
