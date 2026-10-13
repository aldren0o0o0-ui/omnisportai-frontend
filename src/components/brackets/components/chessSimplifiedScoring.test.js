import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Chess UI does not declare manual clock controls or adjustment fields", () => {
  const source = fs.readFileSync(
    new URL("./SpecializedScoringPanel.jsx", import.meta.url),
    "utf8"
  );

  // Manual clock input and adjustment commands must be removed from the WIN_LOSS section
  const winLossSection = source.slice(source.indexOf('engineType === "WIN_LOSS"'));
  assert.equal(winLossSection.includes("Clock adjustment (seconds)"), false);
  assert.equal(winLossSection.includes("TIME_ADJUSTMENT"), false);
  assert.equal(winLossSection.includes("CLOCK_START"), false);
  assert.equal(winLossSection.includes("CLOCK_PAUSE"), false);
});

test("Chess UI declares direct White Wins, Black Wins, and Rematch flow", () => {
  const source = fs.readFileSync(
    new URL("./SpecializedScoringPanel.jsx", import.meta.url),
    "utf8"
  );

  assert.equal(source.includes("🏆 White Wins (1 – 0)"), true);
  assert.equal(source.includes("🏆 Black Wins (0 – 1)"), true);
  assert.equal(source.includes("🤝 Game Draw → Start Tiebreak Rematch"), true);
  assert.equal(source.includes("Swap Colors"), true);
  assert.equal(source.includes("Finalize Match as Draw (0 – 0)"), true);
});

test("LiveScoringDashboard keeps SpecializedScoringPanel mounted in read-only mode upon completion", () => {
  const dashboard = fs.readFileSync(
    new URL("../LiveScoringDashboard.jsx", import.meta.url),
    "utf8"
  );

  // Gated on specializedEngineType and canWrite receives !completedMatch
  assert.equal(dashboard.includes("canWrite={canComposerSubmit && !completedMatch}"), true);
  assert.equal(dashboard.includes("{!completedMatch && specializedEngineType && ("), false);
});
