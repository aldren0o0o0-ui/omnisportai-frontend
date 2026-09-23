import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectSportCategory,
  getPrimaryMetricConfig,
  formatMetricBadge,
  resolveDrawerPerformanceState,
  filterEntryMatches,
  formatMatchHistoryItem,
  extractDisciplineRecords,
} from "./teamDrawerUtils.js";

describe("teamDrawerUtils", () => {
  it("detects sport category correctly", () => {
    assert.equal(detectSportCategory("Basketball Men"), "BASKETBALL");
    assert.equal(detectSportCategory("Volleyball Women"), "VOLLEYBALL");
    assert.equal(detectSportCategory("Badminton Singles"), "RACKET");
    assert.equal(detectSportCategory("Tennis Doubles"), "RACKET");
    assert.equal(detectSportCategory("Archery Recurve"), "TARGET");
    assert.equal(detectSportCategory("Athletics 100m"), "RACE");
    assert.equal(detectSportCategory("Football"), "FOOTBALL");
    assert.equal(detectSportCategory("Sepak Takraw"), "SEPAK_TAKRAW");
    assert.equal(detectSportCategory("Unknown Sport"), "GENERIC");
  });

  it("returns primary metric config adapted by sport", () => {
    const bballConfig = getPrimaryMetricConfig("BASKETBALL", [{ code: "POINTS_TOTAL" }, { code: "ASSISTS" }]);
    assert.equal(bballConfig.key, "POINTS_TOTAL");
    assert.equal(bballConfig.shortLabel, "PTS");

    const vballConfig = getPrimaryMetricConfig("VOLLEYBALL", [{ code: "KILLS" }, { code: "BLOCKS" }]);
    assert.equal(vballConfig.key, "KILLS");
    assert.equal(vballConfig.shortLabel, "Kills");

    const footballConfig = getPrimaryMetricConfig("FOOTBALL", [{ code: "GOALS" }]);
    assert.equal(footballConfig.key, "GOALS");
    assert.equal(footballConfig.shortLabel, "GLS");
  });

  it("formats metric badges cleanly", () => {
    assert.equal(formatMetricBadge("POINTS_TOTAL", 16), "16 PTS");
    assert.equal(formatMetricBadge("ASSISTS", 6), "6 AST");
    assert.equal(formatMetricBadge("REBOUNDS", 5), "5 REB");
    assert.equal(formatMetricBadge("KILLS", 8), "8 Kills");
    assert.equal(formatMetricBadge("UNKNOWN_KEY", 2), "2 unknown key");
    assert.equal(formatMetricBadge("POINTS_TOTAL", null), null);
  });

  it("resolves the 3-state drawer lifecycle correctly", () => {
    // State A: Before competition / no matches
    const stateA = resolveDrawerPerformanceState({
      tournament: { lifecycle_status: "ANNOUNCED" },
      matches: [],
      playerAnalyticsRows: [],
      teamStandingRow: null,
    });
    assert.equal(stateA, "NOT_STARTED");

    // State B: Competition underway but no recorded player stats
    const stateB = resolveDrawerPerformanceState({
      tournament: { lifecycle_status: "RUNNING" },
      matches: [{ status: "LIVE" }],
      playerAnalyticsRows: [],
      teamStandingRow: null,
    });
    assert.equal(stateB, "STARTED_NO_STATS");

    // State C: Real player stats exist
    const stateC = resolveDrawerPerformanceState({
      tournament: { lifecycle_status: "RUNNING" },
      matches: [{ status: "COMPLETED" }],
      playerAnalyticsRows: [{ participant_id: 1, metrics: { POINTS_TOTAL: 16 } }],
      teamStandingRow: { metrics: { MATCHES_PLAYED: 1, WINS: 1 } },
    });
    assert.equal(stateC, "DATA_AVAILABLE");
  });

  it("filters and formats match history accurately", () => {
    const sampleMatches = [
      {
        id: 101,
        team1_id: 5,
        team1_name: "CITE Warriors",
        team2_id: 8,
        team2_name: "COTE Knights",
        department2_code: "COTE",
        score_team1: 82,
        score_team2: 74,
        status: "COMPLETED",
        match_date: "2026-08-28T10:00:00Z",
      },
      {
        id: 102,
        team1_id: 9,
        team1_name: "CCJE Enforcers",
        team2_id: 5,
        team2_name: "CITE Warriors",
        department1_code: "CCJE",
        score_team1: 69,
        score_team2: 76,
        status: "COMPLETED",
        match_date: "2026-08-27T10:00:00Z",
      },
      {
        id: 103,
        team1_id: 2,
        team1_name: "COHM",
        team2_id: 3,
        team2_name: "CAS",
        status: "COMPLETED",
      },
    ];

    const filtered = filterEntryMatches(sampleMatches, { teamId: 5 });
    assert.equal(filtered.length, 2);

    const formatted1 = formatMatchHistoryItem(filtered[0], { teamId: 5 });
    assert.equal(formatted1.opponentName, "COTE Knights");
    assert.equal(formatted1.outcome, "WIN");
    assert.equal(formatted1.scoreDisplay, "82 – 74");

    const formatted2 = formatMatchHistoryItem(filtered[1], { teamId: 5 });
    assert.equal(formatted2.opponentName, "CCJE Enforcers");
    assert.equal(formatted2.outcome, "WIN");
    assert.equal(formatted2.scoreDisplay, "76 – 69");
  });

  it("extracts discipline records adapted by sport", () => {
    const bballRows = [
      { metrics: { PERSONAL_FOULS: 4, TECHNICAL_FOULS: 1 } },
      { metrics: { PERSONAL_FOULS: 2, TECHNICAL_FOULS: 0 } },
    ];
    const discipline = extractDisciplineRecords("BASKETBALL", bballRows);
    assert.equal(discipline.hasDisciplineData, true);
    assert.equal(discipline.totalViolations, 7);
    assert.equal(discipline.counters[0].label, "Personal Fouls");
    assert.equal(discipline.counters[0].value, 6);
    assert.equal(discipline.counters[1].label, "Technical Fouls");
    assert.equal(discipline.counters[1].value, 1);
  });
});
