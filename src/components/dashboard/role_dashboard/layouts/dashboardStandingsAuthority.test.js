import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) => readFileSync(new URL(name, import.meta.url), "utf8");

const ROLE_LAYOUTS = [
  "./CoachDashboardLayout.jsx",
  "./DepartmentDashboardLayout.jsx",
  "./FacilitatorDashboardLayout.jsx",
  "./ViewerDashboardLayout.jsx",
];

test("role dashboards do not derive standings or placements from schedule events", () => {
  for (const file of ROLE_LAYOUTS) {
    const source = read(file);
    assert.doesNotMatch(source, /deriveGroupedStandings|deriveSportBreakdown|deriveOlympicLeaderboard/);
    assert.match(source, /getChampionshipStandings/);
    assert.match(source, /mapChampionshipLeaderboard/);
    assert.match(source, /mapChampionshipSportBreakdown/);
  }
});

test("dashboard standings utility contains presentation mapping only", () => {
  const source = read("./dashboardStandingsUtils.js");
  assert.doesNotMatch(source, /sort\(|pointSystem|scoreFor|scoreAgainst|matches_played/);
  assert.match(source, /rank:\s*row\?\.rank/);
  assert.match(source, /totalPoints:\s*row\?\.total_points/);
});

test("dashboard standings failures render unavailable state instead of local fallback", () => {
  const lifecycle = read("./DashboardLifecycleStages.jsx");
  const panels = read("./dashboardPanels.jsx");
  assert.match(lifecycle, /standingsUnavailable/);
  assert.match(panels, /Unable to load standings\./);
  for (const file of ROLE_LAYOUTS) {
    assert.match(read(file), /championshipUnavailable|ViewerDashboardLayout/);
  }
});
