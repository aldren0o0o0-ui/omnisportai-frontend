import assert from "node:assert/strict";
import test from "node:test";

import {
  analyticsParticipantType,
  analyticsEmptyState,
  columnsForMetricSchema,
  filterStandingRowsByDepartment,
  rankingExplanation,
} from "./standingsPresentation.js";

test("sport-specific columns do not mix incompatible units", () => {
  const columns = columnsForMetricSchema({
    metrics: [
      { code: "WINS", label: "Wins", visibility: "PUBLIC" },
      { code: "GOALS", label: "Goals", visibility: "PUBLIC" },
    ],
  });
  assert.deepEqual(columns.map((row) => row.code), ["WINS", "GOALS"]);
  assert.equal(columns.some((row) => row.code === "OFFICIAL_TIME"), false);
});

test("ranking explanation is clear and ordered", () => {
  const text = rankingExplanation({ labels: ["Competition points", "Head-to-head result", "Goal difference"] });
  assert.match(text, /1\. Competition points/);
  assert.match(text, /3\. Goal difference/);
});

test("empty, provisional, and stale states have user-friendly copy", () => {
  assert.equal(analyticsEmptyState({ rowCount: 0 }).title, "No standings yet");
  assert.equal(analyticsEmptyState({ rowCount: 2, provisional: true }).title, "Standings are provisional");
  assert.equal(analyticsEmptyState({ rowCount: 2, stale: true }).title, "Standings need to be refreshed");
});

test("analytics participant scope preserves TEAM, SOLO, DUO, race, and player identity", () => {
  assert.equal(analyticsParticipantType({ participantShape: "TEAM" }), "TEAM");
  assert.equal(analyticsParticipantType({ participantShape: "SOLO" }), "SOLO");
  assert.equal(analyticsParticipantType({ participantShape: "DUO" }), "DUO");
  assert.equal(analyticsParticipantType({ sportCode: "ATHLETICS", participantShape: "SOLO" }), "LANE");
  assert.equal(analyticsParticipantType({ participantShape: "TEAM", playerMode: true }), "PLAYER");
});

test("department filtering preserves backend order and rank", () => {
  const rows = [{ rank: 1, department_id: 2 }, { rank: 2, department_id: 1 }, { rank: 3, department_id: 2 }];
  assert.deepEqual(filterStandingRowsByDepartment(rows, 2), [rows[0], rows[2]]);
  assert.equal(filterStandingRowsByDepartment(rows, null), rows);
});
