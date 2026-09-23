import assert from "node:assert/strict";
import test from "node:test";
import { getDefaultScheduleView } from "./responsiveScheduleView.js";

test("schedule uses agenda list for compact viewports", () => {
  assert.equal(getDefaultScheduleView(true), "list");
});

test("schedule preserves tournament board for wider viewports", () => {
  assert.equal(getDefaultScheduleView(false), "tournament");
});

