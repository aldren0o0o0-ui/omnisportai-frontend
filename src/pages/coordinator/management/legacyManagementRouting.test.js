import assert from "node:assert/strict";
import test from "node:test";
import { resolveLegacyManagementTarget } from "./legacyManagementRouting.js";

test("legacy management routes preserve intended workflows", () => {
  assert.equal(resolveLegacyManagementTarget(), "/coordinator/management/users");
  assert.equal(resolveLegacyManagementTarget({ search: "?tab=departments" }), "/coordinator/management/departments");
  assert.equal(resolveLegacyManagementTarget({ kind: "facilitators" }), "/coordinator/management/users?section=role-coverage&type=facilitator");
  assert.equal(resolveLegacyManagementTarget({ kind: "staff" }), "/coordinator/management/users?section=staff");
});

test("legacy return target survives redirect", () => {
  assert.equal(resolveLegacyManagementTarget({ search: "?tab=department-managers&return_to=%2Fcoordinator%2Fintramurals" }), "/coordinator/management/users?section=role-coverage&type=manager&return_to=%2Fcoordinator%2Fintramurals");
});
