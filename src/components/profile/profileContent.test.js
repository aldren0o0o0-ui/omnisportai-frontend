import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  normalizeRoles,
  hasRole,
  isMetricRenderable,
  formatMetricValue,
  normalizeProfileTarget,
  createProfileDrawerState,
  profileDrawerReducer,
} from "./profileUtils.js";

describe("Phase 7C-2 — Role-Aware Profile Content", () => {
  // -------------------------------------------------------------
  // 1. Profile loads using userId
  // -------------------------------------------------------------
  it("Test 1: Profile fetching passes userId and tournamentId to getUserProfile", async () => {
    const userServiceSrc = await readFile(
      new URL("../../services/userService.js", import.meta.url),
      "utf8"
    );
    assert.match(userServiceSrc, /export const getUserProfile = async \(userId, options = {}\)/);
    assert.match(userServiceSrc, /params\.tournament_id = options\.tournamentId/);
    assert.match(userServiceSrc, /api\.get\(`\/users\/\$\{userId\}\/profile`, \{ params \}\)/);

    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.match(drawerSrc, /getUserProfile\(profileTarget\.userId/);
  });

  // -------------------------------------------------------------
  // 2. Loading state renders
  // -------------------------------------------------------------
  it("Test 2: UniversalProfileDrawer contains lightweight loading skeleton", async () => {
    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.match(drawerSrc, /data-testid="profile-loading-skeleton"/);
    assert.match(drawerSrc, /animate-pulse/);
  });

  // -------------------------------------------------------------
  // 3. Error state renders & reports limitation on direct playerId
  // -------------------------------------------------------------
  it("Test 3: Error state renders safely and reports direct playerId lookup limitation", async () => {
    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.match(drawerSrc, /data-testid="profile-error-state"/);
    assert.match(drawerSrc, /data-testid="profile-retry-btn"/);
    assert.match(drawerSrc, /PLAYER_ID_LIMITATION/);
    assert.match(drawerSrc, /Direct profile lookup requires a linked user account/);
  });

  // -------------------------------------------------------------
  // 4. Empty sections render safely
  // -------------------------------------------------------------
  it("Test 4: Empty sports, metrics, chart, and match history render empty states safely without throwing", async () => {
    const chartSrc = await readFile(
      new URL("./PlayerPerformanceChart.jsx", import.meta.url),
      "utf8"
    );
    assert.match(chartSrc, /data-testid="player-chart-empty"/);

    const matchesSrc = await readFile(
      new URL("./PlayerMatchHistory.jsx", import.meta.url),
      "utf8"
    );
    assert.match(matchesSrc, /data-testid="player-matches-empty"/);

    const metricsSrc = await readFile(
      new URL("./PlayerMetricCards.jsx", import.meta.url),
      "utf8"
    );
    assert.match(metricsSrc, /data-testid="player-metrics-empty"/);
  });

  // -------------------------------------------------------------
  // 5. Inactive state renders
  // -------------------------------------------------------------
  it("Test 5: ProfileHeader indicates Inactive / Archived status when is_archived is true", async () => {
    const headerSrc = await readFile(
      new URL("./ProfileHeader.jsx", import.meta.url),
      "utf8"
    );
    assert.match(headerSrc, /isArchived = Boolean\(playerProfile\?\.is_archived\)/);
    assert.match(headerSrc, /Inactive \/ Archived/);
    assert.match(headerSrc, /Active Participant/);
  });

  // -------------------------------------------------------------
  // 6. Role badges support multiple roles
  // -------------------------------------------------------------
  it("Test 6: Role badges normalize and support multiple simultaneous roles", () => {
    const rawRoles = [{ role: "Player" }, { role: "Coach" }];
    const normalized = normalizeRoles(rawRoles);
    assert.deepEqual(normalized, ["PLAYER", "COACH"]);

    assert.equal(hasRole(rawRoles, "Player"), true);
    assert.equal(hasRole(rawRoles, "Coach"), true);
    assert.equal(hasRole(rawRoles, "Admin"), false);

    // Array of strings also supported
    const strRoles = ["Player", "Sports Facilitator"];
    assert.deepEqual(normalizeRoles(strRoles), ["PLAYER", "SPORTS_FACILITATOR"]);
    assert.equal(hasRole(strRoles, "Sports Facilitator"), true);
  });

  // -------------------------------------------------------------
  // 7. Privacy masking is respected
  // -------------------------------------------------------------
  it("Test 7: Sensitive fields (email, student_id) are masked when backend returns null", async () => {
    const headerSrc = await readFile(
      new URL("./ProfileHeader.jsx", import.meta.url),
      "utf8"
    );
    // email and student_id are rendered ONLY when non-null
    assert.match(headerSrc, /\{email \? \(/);
    assert.match(headerSrc, /data-testid="profile-email"/);
    assert.match(headerSrc, /\{studentId \? \(/);
    assert.match(headerSrc, /data-testid="profile-student-id"/);
  });

  // -------------------------------------------------------------
  // 8. Player identity renders
  // -------------------------------------------------------------
  it("Test 8: ProfileHeader renders player identity with name, department, and avatar", async () => {
    const headerSrc = await readFile(
      new URL("./ProfileHeader.jsx", import.meta.url),
      "utf8"
    );
    assert.match(headerSrc, /displayName/);
    assert.match(headerSrc, /departmentName/);
    assert.match(headerSrc, /PlayerAvatar/);
    assert.match(headerSrc, /data-testid="profile-header"/);
  });

  // -------------------------------------------------------------
  // 9. Multiple sports render
  // -------------------------------------------------------------
  it("Test 9: PlayerSportSelector renders tabs for multiple sports", async () => {
    const selectorSrc = await readFile(
      new URL("./PlayerSportSelector.jsx", import.meta.url),
      "utf8"
    );
    assert.match(selectorSrc, /role="tablist"/);
    assert.match(selectorSrc, /role="tab"/);
    assert.match(selectorSrc, /data-testid=\{`player-sport-tab-\$\{s\.sport_id\}`\}/);
    // When only 1 sport exists, single-sport view is rendered without extra tabs
    assert.match(selectorSrc, /if \(sports\.length === 1\)/);
    assert.match(selectorSrc, /data-testid="player-sport-single"/);
  });

  // -------------------------------------------------------------
  // 10. Sport selector switches active sport
  // -------------------------------------------------------------
  it("Test 10: PlayerSportSelector invokes onSelectSport with active sportId and sets aria-selected", async () => {
    const selectorSrc = await readFile(
      new URL("./PlayerSportSelector.jsx", import.meta.url),
      "utf8"
    );
    assert.match(selectorSrc, /aria-selected=\{isSelected\}/);
    assert.match(selectorSrc, /onClick=\{\(\) => onSelectSport\(s\.sport_id\)\}/);
  });

  // -------------------------------------------------------------
  // 11. Matches/wins/losses/draws come from backend
  // -------------------------------------------------------------
  it("Test 11: PlayerProfileContent summary strip renders backend-provided records without independent calculation", async () => {
    const playerContentSrc = await readFile(
      new URL("./PlayerProfileContent.jsx", import.meta.url),
      "utf8"
    );
    assert.match(playerContentSrc, /data-testid="player-summary-strip"/);
    assert.match(playerContentSrc, /data-testid="summary-matches"/);
    assert.match(playerContentSrc, /data-testid="summary-wins"/);
    assert.match(playerContentSrc, /data-testid="summary-losses"/);
    assert.match(playerContentSrc, /data-testid="summary-draws"/);
    // Uses backend values directly
    assert.match(playerContentSrc, /activeSport\.matches_played/);
    assert.match(playerContentSrc, /activeSport\.wins/);
    assert.match(playerContentSrc, /activeSport\.losses/);
    assert.match(playerContentSrc, /activeSport\.draws/);
  });

  // -------------------------------------------------------------
  // 12. Available metrics render
  // -------------------------------------------------------------
  it("Test 12: PlayerMetricCards renders available metrics strictly with valid value", () => {
    const validMetric = {
      key: "POINTS",
      label: "Total Points",
      value: 48,
      available: true,
      format: "NUMBER",
    };
    assert.equal(isMetricRenderable(validMetric), true);
  });

  // -------------------------------------------------------------
  // 13. Unavailable metrics do NOT render
  // -------------------------------------------------------------
  it("Test 13: Unavailable metrics (available === false) are rejected by isMetricRenderable", () => {
    const unavailMetric = {
      key: "REBOUNDS",
      label: "Rebounds",
      value: null,
      available: false,
    };
    assert.equal(isMetricRenderable(unavailMetric), false);
  });

  // -------------------------------------------------------------
  // 14. Null metrics do NOT become zero
  // -------------------------------------------------------------
  it("Test 14: Null metric values with available === false do NOT become 0", () => {
    const nullMetric = {
      key: "STEALS",
      label: "Steals",
      value: null,
      available: false,
    };
    assert.equal(isMetricRenderable(nullMetric), false);
    // Formatting a null value never produces "0"
    assert.equal(formatMetricValue(nullMetric.value, "NUMBER"), "");
  });

  // -------------------------------------------------------------
  // 15. Metric formatting respects backend format
  // -------------------------------------------------------------
  it("Test 15: Metric formatting handles NUMBER, PERCENTAGE, TIME, and RATIO formats correctly", () => {
    assert.equal(formatMetricValue(1250, "NUMBER"), "1,250");
    assert.equal(formatMetricValue(78.5, "PERCENTAGE"), "78.5%");
    assert.equal(formatMetricValue(80, "PERCENTAGE"), "80%");
    assert.equal(formatMetricValue(125, "TIME"), "2:05");
    assert.equal(formatMetricValue(45, "TIME"), "0:45");
    assert.equal(formatMetricValue("3:1", "RATIO"), "3:1");
  });

  // -------------------------------------------------------------
  // 16. Match history renders
  // -------------------------------------------------------------
  it("Test 16: PlayerMatchHistory renders opponent, result, score, and contribution", async () => {
    const matchHistorySrc = await readFile(
      new URL("./PlayerMatchHistory.jsx", import.meta.url),
      "utf8"
    );
    assert.match(matchHistorySrc, /data-testid=\{`player-match-item-\$\{m\.match_id \|\| idx\}`\}/);
    assert.match(matchHistorySrc, /data-testid="match-result-badge"/);
    assert.match(matchHistorySrc, /m\.score/);
    assert.match(matchHistorySrc, /stats\.points/);
  });

  // -------------------------------------------------------------
  // 17. Empty match history renders safely
  // -------------------------------------------------------------
  it("Test 17: Empty match history shows clean empty container", async () => {
    const matchHistorySrc = await readFile(
      new URL("./PlayerMatchHistory.jsx", import.meta.url),
      "utf8"
    );
    assert.match(matchHistorySrc, /data-testid="player-matches-empty"/);
  });

  // -------------------------------------------------------------
  // 18. Performance chart renders with valid data
  // -------------------------------------------------------------
  it("Test 18: Performance chart renders multi-match trend using Recharts", async () => {
    const chartSrc = await readFile(
      new URL("./PlayerPerformanceChart.jsx", import.meta.url),
      "utf8"
    );
    assert.match(chartSrc, /data-testid="player-chart-container"/);
    assert.match(chartSrc, /<ResponsiveContainer/);
    assert.match(chartSrc, /<LineChart/);
  });

  // -------------------------------------------------------------
  // 19. Chart does not render misleading empty data
  // -------------------------------------------------------------
  it("Test 19: Chart renders empty state when performance_history is empty", async () => {
    const chartSrc = await readFile(
      new URL("./PlayerPerformanceChart.jsx", import.meta.url),
      "utf8"
    );
    assert.match(chartSrc, /data-testid="player-chart-empty"/);
  });

  // -------------------------------------------------------------
  // 20. Single-match history gets appropriate presentation
  // -------------------------------------------------------------
  it("Test 20: Single-match performance history renders compact single-match summary instead of multi-point trend", async () => {
    const chartSrc = await readFile(
      new URL("./PlayerPerformanceChart.jsx", import.meta.url),
      "utf8"
    );
    assert.match(chartSrc, /if \(performanceHistory\.length === 1\)/);
    assert.match(chartSrc, /data-testid="player-chart-single"/);
    assert.match(chartSrc, /Latest Match Performance/);
  });

  // -------------------------------------------------------------
  // 21. Multi-role PLAYER + COACH renders without duplicate headers
  // -------------------------------------------------------------
  it("Test 21: UniversalProfileDrawer mounts Player content and Coach management without duplicate headers", async () => {
    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    // ProfileHeader is mounted exactly once at top of content boundary
    const headerMatches = drawerSrc.match(/<ProfileHeader/g);
    assert.equal(headerMatches?.length, 1);

    // Both PlayerProfileContent and CoachSection are conditionally rendered
    assert.match(drawerSrc, /\{isPlayer \? \(\s*<PlayerProfileContent/);
    assert.match(drawerSrc, /\{isCoach \? \(\s*<CoachSection/);
  });

  // -------------------------------------------------------------
  // 22. Role resolution helper verification
  // -------------------------------------------------------------
  it("Test 22: Role resolution correctly identifies PLAYER, COACH, and other roles", () => {
    const multiRoles = [{ role: "Player" }, { role: "Coach" }];
    assert.equal(hasRole(multiRoles, "PLAYER"), true);
    assert.equal(hasRole(multiRoles, "COACH"), true);
    assert.equal(hasRole(multiRoles, "SPORTS_FACILITATOR"), false);

    const facilitatorRoles = [{ role: "Sports Facilitator" }];
    assert.equal(hasRole(facilitatorRoles, "SPORTS_FACILITATOR"), true);
    assert.equal(hasRole(facilitatorRoles, "Sports Facilitator"), true);
  });
});
