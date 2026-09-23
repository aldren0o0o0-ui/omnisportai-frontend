import assert from "node:assert/strict";
import test from "node:test";

import {
  canShowCorrectionMutation,
  correctionErrorMessage,
  correctionStatusPresentation,
  defaultCorrectionType,
  summarizeCorrectionImpact,
} from "./resultCorrectionPresentation.js";

test("completed Match correction controls fail closed without backend capability", () => {
  assert.equal(canShowCorrectionMutation({ completed: true, capability: undefined }), false);
  assert.equal(canShowCorrectionMutation({ completed: true, capability: true }), true);
  assert.equal(canShowCorrectionMutation({ completed: false, capability: true }), false);
});

test("sport-specific correction forms are selected without raw JSON", () => {
  assert.equal(defaultCorrectionType("Swimming"), "OFFICIAL_TIME_CORRECTION");
  assert.equal(defaultCorrectionType("Boxing"), "JUDGE_SCORECARD_CORRECTION");
  assert.equal(defaultCorrectionType("Archery"), "ARCHERY_RESULT_CORRECTION");
  assert.equal(defaultCorrectionType("Chess"), "CHESS_RESULT_CORRECTION");
  assert.equal(defaultCorrectionType("Badminton"), "SCORE_CORRECTION");
});

test("correction lifecycle uses user-friendly labels", () => {
  assert.equal(correctionStatusPresentation("SUBMITTED").label, "Waiting for review");
  assert.equal(correctionStatusPresentation("APPLIED").label, "Applied");
  assert.equal(correctionStatusPresentation("FAILED").label, "Blocked");
});

test("downstream and stale errors are understandable", () => {
  assert.match(correctionErrorMessage({ response: { data: { detail: { code: "CORRECTION_STATE_STALE" } } } }), /Refresh/);
  assert.match(correctionErrorMessage({ response: { data: { detail: { code: "DOWNSTREAM_MATCH_ALREADY_STARTED" } } } }), /already started/);
});

test("impact summary explains bracket, analytics, and notification changes", () => {
  const rows = summarizeCorrectionImpact({
    result_changes: [{ field: "winner" }],
    affected_downstream_matches: [7],
    standings_affected: true,
    statistics_affected: true,
    notifications_affected: true,
  });
  assert.equal(rows.length, 5);
  assert.match(rows.join(" "), /standings/i);
  assert.match(rows.join(" "), /notification/i);
});

