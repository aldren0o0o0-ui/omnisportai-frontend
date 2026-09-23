import assert from "node:assert/strict";
import test from "node:test";
import { approvalMemberCount, mergeApprovalRows } from "./facilitatorOperationsUtils.js";

test("merges the same approval represented by dashboard and canonical entry shapes", () => {
  const entries = [{ id: "entry-41", entryId: 41, type: "entry", name: "CITE Entry", sport_id: 3, department_id: 7, participant_shape: "SOLO", members: [{ player_id: 9 }] }];
  const pending = [{ approval_id: 41, kind: "SOLO", name: "Renamed CITE Sprinter", sport: "Athletics 100m Sprint", department: "CITE", status: "PENDING_REVIEW" }];
  const rows = mergeApprovalRows(pending, entries);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].entryId, 41);
  assert.equal(rows[0].name, "Renamed CITE Sprinter");
  assert.equal(rows[0].members.length, 1);
  assert.equal(rows[0].sport, "Athletics 100m Sprint");
});

test("uses actual members before fallback count fields", () => {
  assert.equal(approvalMemberCount({ members: [{}, {}], member_count: 0 }), 2);
  assert.equal(approvalMemberCount({ player_count: 1 }), 1);
});

test("shows the canonical solo entry instead of its owning legacy team registration", () => {
  const entries = [
    { id: "team-8", teamId: 8, type: "team", name: "CITE Athletics 100m Sprint Solo Entry 1", sport_id: 3, department_id: 7 },
    { id: "entry-41", entryId: 41, teamId: 8, type: "entry", participant_shape: "SOLO", name: "CITE Athletics 100m Sprint Solo", sport_id: 3, department_id: 7, members: [{}] },
  ];
  const pending = [{ approval_id: 41, kind: "SOLO", name: "CITE Athletics 100m Sprint Solo", sport_id: 3, department_id: 7 }];
  const rows = mergeApprovalRows(pending, entries);

  assert.equal(rows.length, 1);
  assert.equal(rows.filter((row) => row.entryId === 41).length, 1);
  assert.equal(rows.find((row) => row.entryId === 41).name, "CITE Athletics 100m Sprint Solo");
});
