import test from "node:test";
import assert from "node:assert/strict";

import { mapChampionshipLeaderboard } from "./dashboardStandingsUtils.js";

test("dashboard standings preserve backend rank and championship totals", () => {
  const rows = mapChampionshipLeaderboard([
    {
      department_id: 4,
      department_name: "College of Hospitality Management",
      department_code: "COHM",
      rank: 3,
      gold: 1,
      silver: 2,
      bronze: 0,
      fourth: 1,
      participation: 4,
      total_points: 280,
      status: "Provisional",
    },
  ]);

  assert.equal(rows[0].rank, 3);
  assert.equal(rows[0].totalPoints, 280);
  assert.equal(rows[0].status, "Provisional");
});
