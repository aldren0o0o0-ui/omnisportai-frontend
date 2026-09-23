import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canEditDepartment,
  canEditSport,
  canEditEntry,
  canManageRoster,
  isUserParticipantInEntry,
  getRoleScopeTabs,
  getRoleEmptyState,
} from "./ownershipCapabilities.js";

describe("ownershipCapabilities", () => {
  const coordinatorUser = { id: 1, role: "SPORTS_COORDINATOR" };
  const deptManagerUser = { id: 2, role: "DEPARTMENT_MANAGER", department_id: 10 };
  const coachUser = { id: 3, role: "COACH", department_id: 10 };
  const facilitatorUser = { id: 4, role: "SPORTS_FACILITATOR", sport_id: 5 };
  const viewerUser = { id: 5, role: "VIEWER", email: "viewer@example.com" };

  it("evaluates department edit permissions accurately", () => {
    const dept10 = { id: 10, department_name: "CITE" };
    const dept20 = { id: 20, department_name: "COHM" };

    assert.equal(canEditDepartment(coordinatorUser, dept10), true);
    assert.equal(canEditDepartment(deptManagerUser, dept10, "department_manager"), true);
    assert.equal(canEditDepartment(deptManagerUser, dept20, "department_manager"), false);
    assert.equal(canEditDepartment(coachUser, dept10, "coach"), false);
    assert.equal(canEditDepartment(viewerUser, dept10, "viewer"), false);
  });

  it("evaluates sport edit permissions accurately", () => {
    const sport5 = { id: 5, sport_name: "Basketball" };
    const sport8 = { id: 8, sport_name: "Volleyball" };

    assert.equal(canEditSport(coordinatorUser, sport5), true);
    assert.equal(canEditSport(facilitatorUser, sport5, "sports_facilitator", [5]), true);
    assert.equal(canEditSport(facilitatorUser, sport8, "sports_facilitator", [5]), false);
    assert.equal(canEditSport(deptManagerUser, sport5, "department_manager"), false);
    assert.equal(canEditSport(coachUser, sport5, "coach"), false);
  });

  it("evaluates entry edit permissions accurately", () => {
    const entryDept10 = {
      id: 101,
      department_id: 10,
      coach: { user_id: 3 },
    };
    const entryDept20 = {
      id: 102,
      department_id: 20,
      coach: { user_id: 99 },
    };

    assert.equal(canEditEntry(coordinatorUser, entryDept10), true);
    assert.equal(canEditEntry(deptManagerUser, entryDept10, "department_manager"), true);
    assert.equal(canEditEntry(deptManagerUser, entryDept20, "department_manager"), false);
    assert.equal(canEditEntry(coachUser, entryDept10, "coach"), true);
    assert.equal(canEditEntry(coachUser, entryDept20, "coach"), false);
    assert.equal(canEditEntry(facilitatorUser, entryDept10, "sports_facilitator"), false);
    assert.equal(canEditEntry(viewerUser, entryDept10, "viewer"), false);
  });

  it("detects user participation in an entry", () => {
    const entry = {
      id: 101,
      members: [{ user_id: 5, player_email: "viewer@example.com" }],
    };
    assert.equal(isUserParticipantInEntry(viewerUser, entry), true);

    const otherEntry = {
      id: 102,
      members: [{ user_id: 99, player_email: "other@example.com" }],
    };
    assert.equal(isUserParticipantInEntry(viewerUser, otherEntry), false);
  });

  it("returns correct scope tabs for roles", () => {
    assert.deepEqual(getRoleScopeTabs("department_manager"), [
      { id: "owned", label: "My Department" },
      { id: "all", label: "All Departments" },
    ]);
    assert.deepEqual(getRoleScopeTabs("coach"), [
      { id: "owned", label: "My Entry" },
      { id: "all", label: "Browse Teams & Entries" },
    ]);
    assert.deepEqual(getRoleScopeTabs("sports_facilitator"), [
      { id: "owned", label: "My Sports" },
      { id: "all", label: "All Teams & Entries" },
    ]);
    assert.deepEqual(getRoleScopeTabs("sports_coordinator"), []);
    assert.deepEqual(getRoleScopeTabs("viewer"), []);
  });

  it("returns clean empty states without clutter", () => {
    const coachEmpty = getRoleEmptyState("coach", false);
    assert.match(coachEmpty.title, /No entry assigned/);

    const filterEmpty = getRoleEmptyState("coach", true);
    assert.match(filterEmpty.title, /No matching entries/);
  });
});
