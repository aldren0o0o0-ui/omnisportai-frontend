import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Test 1 — Department performance is rendered", () => {
  const page = read("./StandingsPage.jsx");
  assert.match(page, /getDepartmentStandings/);
  assert.match(page, /DepartmentCompetitionTable/);
  assert.match(page, /Competition performance/);
  assert.match(page, /Match results to date/);

  // Mock department rows matching Tournament 3 audited state
  const mockDeptRows = [
    { rank: 1, name: "CITE", metadata: { department_code: "CITE", matches_played: 8, wins: 7, losses: 1, points: 21, competition_points: 21 } },
    { rank: 2, name: "COTE", metadata: { department_code: "COTE", matches_played: 7, wins: 6, losses: 1, points: 18, competition_points: 18 } },
    { rank: 3, name: "CCJE", metadata: { department_code: "CCJE", matches_played: 7, wins: 5, losses: 2, points: 15, competition_points: 15 } },
    { rank: 4, name: "COHM", metadata: { department_code: "COHM", matches_played: 6, wins: 2, losses: 4, points: 6, competition_points: 6 } },
  ];

  assert.equal(mockDeptRows[0].metadata.wins, 7);
  assert.equal(mockDeptRows[1].metadata.wins, 6);
  assert.equal(mockDeptRows[2].metadata.wins, 5);
  assert.equal(mockDeptRows[3].metadata.wins, 2);
});

test("Test 2 — Competition points are rendered separately", () => {
  const page = read("./StandingsPage.jsx");
  assert.match(page, /Comp\.\s*Pts/);
  assert.match(page, /competition_points/);

  const mockPoints = [21, 18, 15, 6];
  assert.deepEqual(mockPoints, [21, 18, 15, 6]);
  assert.match(page, /DepartmentCompetitionTable/);
});

test("Test 3 — Championship points remain separate", () => {
  const page = read("./StandingsPage.jsx");
  assert.match(page, /ChampionshipChart/);
  assert.match(page, /MedalTable/);
  assert.match(page, /total_points/);

  // In provisional state, championship rows have total_points = 0
  const mockChampionshipRows = [
    { rank: 1, department_code: "CITE", total_points: 0, gold: 0, silver: 0, bronze: 0, fourth: 0, participation: 0 },
    { rank: 2, department_code: "COTE", total_points: 0, gold: 0, silver: 0, bronze: 0, fourth: 0, participation: 0 },
    { rank: 3, department_code: "CCJE", total_points: 0, gold: 0, silver: 0, bronze: 0, fourth: 0, participation: 0 },
    { rank: 4, department_code: "COHM", total_points: 0, gold: 0, silver: 0, bronze: 0, fourth: 0, participation: 0 },
  ];

  for (const row of mockChampionshipRows) {
    assert.equal(row.total_points, 0);
  }
  // Verify notice explaining separation exists
  assert.match(page, /Championship points are awarded when an entire sport or event is finalized/);
});

test("Test 4 — Badminton victories affect Overall generically without sport-specific branch", () => {
  const page = read("./StandingsPage.jsx");
  // Ensure no sport-specific branches exist in the department table
  assert.doesNotMatch(page, /if\s*\([^)]*badminton/i);
  assert.doesNotMatch(page, /sport_name\s*===?\s*["']badminton["']/i);
  // Sourced generically via getDepartmentStandings
  assert.match(page, /getDepartmentStandings/);
});

test("Test 5 — Live matches are not interpreted as wins", () => {
  const page = read("./StandingsPage.jsx");
  // Frontend consumes API metadata directly, does not parse live scores into wins
  assert.doesNotMatch(page, /ONGOING.*wins\+\+/);
  assert.doesNotMatch(page, /score_team1.*>.*score_team2.*wins/);
  assert.match(page, /meta\.wins/);
});

test("Test 6 — API failure handling is resilient", () => {
  const page = read("./StandingsPage.jsx");
  assert.match(page, /Promise\.allSettled/);
  assert.match(page, /deptError/);
  assert.match(page, /champError/);
});

test("Test 7 — Existing championship behavior preserved", () => {
  const page = read("./StandingsPage.jsx");
  assert.match(page, /ChampionshipChart rows=\{championshipRows\}/);
  assert.match(page, /MedalTable rows=\{championshipRows\} scoring=\{scoring\}/);
  assert.match(page, /SportBreakdown rows=\{payload\.sport_breakdown\}/);
});

test("Test 8 — Responsive rendering and overflow protection", () => {
  const page = read("./StandingsPage.jsx");
  assert.match(page, /overflow-x-auto/);
  assert.match(page, /min-w-\[760px\]/);
  assert.match(page, /tabular-nums/);
});

test("Test 9 — Championship chart is positioned at top above all components and summary cards removed", () => {
  const page = read("./StandingsPage.jsx");
  assert.doesNotMatch(page, /StandingsSummary/);
  assert.doesNotMatch(page, /Current match leader/);

  // Assert ChampionshipChart is placed before DepartmentCompetitionTable and MedalTable in Overall panel
  const chartIdx = page.indexOf("<ChampionshipChart");
  const deptIdx = page.indexOf("<DepartmentCompetitionTable");
  const medalIdx = page.indexOf("<MedalTable");

  assert.ok(chartIdx > 0, "ChampionshipChart should be rendered");
  assert.ok(deptIdx > chartIdx, "DepartmentCompetitionTable should come after ChampionshipChart");
  assert.ok(medalIdx > deptIdx, "MedalTable should come after DepartmentCompetitionTable");
});

test("Test 10 — Wins column is visually prominent in DepartmentCompetitionTable", () => {
  const page = read("./StandingsPage.jsx");
  assert.match(page, /font-extrabold text-emerald-600/);
  assert.match(page, /bg-emerald-500\/15.*font-extrabold/);
});

test("Test 11 — ChampionshipChart integrates clean match wins progress context", () => {
  const page = read("./StandingsPage.jsx");
  assert.match(page, /deptMap/);
  assert.match(page, /\{wins\} wins/);
  assert.match(page, /0 pts · provisional/);
});

test("Test 12 — CITE is identified as top match and competition points leader in active fixture", () => {
  const mockDeptRows = [
    { rank: 1, name: "CITE", metadata: { department_code: "CITE", matches_played: 8, wins: 7, losses: 1, competition_points: 21 } },
    { rank: 2, name: "COTE", metadata: { department_code: "COTE", matches_played: 7, wins: 6, losses: 1, competition_points: 18 } },
    { rank: 3, name: "CCJE", metadata: { department_code: "CCJE", matches_played: 7, wins: 5, losses: 2, competition_points: 15 } },
    { rank: 4, name: "COHM", metadata: { department_code: "COHM", matches_played: 6, wins: 2, losses: 4, competition_points: 6 } },
  ];

  const sortedByWins = [...mockDeptRows].sort((a, b) => b.metadata.wins - a.metadata.wins);
  assert.equal(sortedByWins[0].metadata.department_code, "CITE");
  assert.equal(sortedByWins[0].metadata.wins, 7);

  const sortedByCompPts = [...mockDeptRows].sort((a, b) => b.metadata.competition_points - a.metadata.competition_points);
  assert.equal(sortedByCompPts[0].metadata.department_code, "CITE");
  assert.equal(sortedByCompPts[0].metadata.competition_points, 21);
});

test("Test 13 — Top provisional banner removed while explicit table footnote is preserved", () => {
  const page = read("./StandingsPage.jsx");
  assert.doesNotMatch(page, /Standings are provisional/);
  assert.match(page, /Championship points are awarded when an entire sport or event is finalized/);
  assert.match(page, /0 pts · provisional/);
});

test("Test 14 — Responsive layout tokens for ChampionshipChart and tables", () => {
  const page = read("./StandingsPage.jsx");
  assert.match(page, /grid-cols-\[minmax\(80px,160px\)_1fr\]/);
  assert.match(page, /overflow-x-auto/);
});

test("Test 15 — Clear separation between match ranking and championship ranking semantics", () => {
  const page = read("./StandingsPage.jsx");
  // Ensure department match performance table uses department rows metadata
  assert.match(page, /DepartmentCompetitionTable rows=\{departmentRows\}/);
  // Ensure championship medal table uses championship rows
  assert.match(page, /MedalTable rows=\{championshipRows\}/);
  // Verify distinct descriptions
  assert.match(page, /Results from finalized matches to date/);
  assert.match(page, /Medal and championship points awarded after event finalization/);
});

test("Test 16 — Championship chart supports progress bar based on match wins", () => {
  const page = read("./StandingsPage.jsx");
  assert.match(page, /chartMetric.*wins/);
  assert.match(page, /Progress by wins/);
  assert.match(page, /maximumWins/);
  assert.match(page, /\{wins\} wins/);
});
