import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("department overview keeps coach coverage role actions while sharing lifecycle UI", () => {
  const layout = read("./DepartmentDashboardLayout.jsx");
  const page = read("../../../../pages/department/Dashboard.jsx");

  assert.match(layout, /target\?\.current_coach/);
  assert.match(layout, /Coach Coverage Status/);
  assert.match(layout, /\/department\/coach-assignments/);
  assert.match(layout, /DashboardStageSwitcher/);
  assert.match(layout, /LiveDashboardStage/);
  assert.doesNotMatch(layout, /Department Coach Assignments Setup/);
  assert.doesNotMatch(layout, /Department Sports & Disciplines/);
  assert.match(page, /headerAction=\{operationalMode \? \(/);
});
