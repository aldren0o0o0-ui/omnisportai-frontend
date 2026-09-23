import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  isLiveEvent,
  prioritizeMatchCenterEvents,
} from "./dashboardEventUtils.js";

const now = new Date("2026-09-07T10:30:00Z");

test("match center prioritizes live and recently scored matches before future fixtures", () => {
  const events = [
    { id: 1, start: "2026-09-07T12:00:00Z", end: "2026-09-07T13:00:00Z", status: "SCHEDULED" },
    { id: 2, start: "2026-09-07T09:00:00Z", end: "2026-09-07T10:00:00Z", status: "COMPLETED", score_team1: 2, score_team2: 1 },
    { id: 3, start: "2026-09-07T10:00:00Z", end: "2026-09-07T11:00:00Z", status: "ONGOING", score_team1: 0, score_team2: 0 },
    { id: 4, start: "2026-09-06T08:00:00Z", end: "2026-09-06T09:00:00Z", status: "SCHEDULED" },
  ];

  assert.deepEqual(
    prioritizeMatchCenterEvents(events, now).map((event) => event.id),
    [3, 2, 1, 4]
  );
});

test("a scheduled match inside its assigned time window is treated as starting now", () => {
  assert.equal(isLiveEvent({
    start: "2026-09-07T10:00:00Z",
    end: "2026-09-07T11:00:00Z",
    status: "SCHEDULED",
  }, now), true);
});

test("live match rows render the authoritative score even when it is zero to zero", () => {
  const source = readFileSync(new URL("./MatchCenterPanel.jsx", import.meta.url), "utf8");
  assert.match(source, /\{eventScore\.left\}-\{eventScore\.right\}/);
  assert.doesNotMatch(source, /eventScore\.hasScore \? `\$\{eventScore\.left\}-\$\{eventScore\.right\}` : "LIVE"/);
});

test("bracket details expose the shared score link and department uses its own wrapper", () => {
  const panel = readFileSync(new URL("../../../brackets/MatchDetailsPanel.jsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("../../../../App.jsx", import.meta.url), "utf8");
  assert.match(panel, /View match score/);
  assert.match(app, /path="brackets" element=\{renderLazyRoute\(DepartmentBrackets\)\}/);
});
