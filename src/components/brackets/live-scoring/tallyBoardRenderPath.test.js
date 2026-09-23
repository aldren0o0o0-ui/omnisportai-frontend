import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { resolveLiveScoringSurface } from "./tallyBoardSurfaceResolver.js";
import { getSportUiProfile } from "../utils/sportUiProfile.js";

test("legacy Basketball snapshots use the timed-team compatibility profile and new render path", () => {
  const profile = getSportUiProfile("basketball", null, {
    sport_definition: { sport: "generic" },
    runtime_governance: { capability_source: "LEGACY_LOCKED_SNAPSHOT" },
    match_type: "SCORE",
  });
  assert.equal(profile.engineType, "");
  assert.equal(profile.profileFamily, "TIMED_TEAM");
  assert.equal(profile.profileSource, "SPORT_COMPATIBILITY");
  assert.equal(resolveLiveScoringSurface({ profileFamily: profile.profileFamily, sportKey: "basketball" }), "BASKETBALL_TIMED_TEAM");
});

test("dashboard selects exactly one Basketball primary render branch", () => {
  const dashboard = fs.readFileSync(new URL("../LiveScoringDashboard.jsx", import.meta.url), "utf8");
  const branchStart = dashboard.indexOf(") : useTimedTeamSurface ? (");
  const timedSurface = dashboard.indexOf("<TimedTeamSurface", branchStart);
  const legacyBranch = dashboard.indexOf(") : (", timedSurface);
  const legacyScoreboard = dashboard.indexOf("<ScoreboardDisplay", legacyBranch);
  assert.ok(branchStart > 0);
  assert.ok(timedSurface > branchStart);
  assert.ok(legacyBranch > timedSurface);
  assert.ok(legacyScoreboard > legacyBranch);
  assert.equal(dashboard.slice(branchStart, legacyBranch).includes("<ScoreboardDisplay"), false);
  assert.equal(dashboard.slice(branchStart, legacyBranch).includes("<SportActionPanel"), false);
  assert.equal(dashboard.slice(branchStart, legacyBranch).includes(">More actions</summary>"), false);
});

test("timed-team component declares direct active players, score actions, clock, and compact secondary flow", () => {
  const surface = fs.readFileSync(new URL("./TimedTeamSurface.jsx", import.meta.url), "utf8");
  const shell = fs.readFileSync(new URL("./TallyBoardShell.jsx", import.meta.url), "utf8");
  assert.match(surface, /Players on court/);
  assert.match(surface, /Player from bench/);
  assert.match(surface, /Choose a bench player/);
  assert.match(surface, /Add \$\{control\.points\} point/);
  assert.match(surface, /Match clock and period/);
  assert.match(surface, /Confirm substitution/);
  assert.match(surface, /aria-label="Match actions"/);
  assert.match(shell, /Last action/);
  assert.match(shell, /Undo last action/);
  assert.match(shell, /secondaryPanels/);
});

test("Badminton and non-Basketball timed-team sports remain on the legacy surface", () => {
  assert.equal(resolveLiveScoringSurface({ profileFamily: "SET_RALLY", sportKey: "badminton" }), "LEGACY");
  assert.equal(resolveLiveScoringSurface({ profileFamily: "TIMED_TEAM", sportKey: "football_11v11" }), "LEGACY");
  assert.equal(resolveLiveScoringSurface({ profileFamily: "TIMED_TEAM", sportKey: "handball_7v7" }), "LEGACY");
});

test("legacy sport actions are always visible without a More actions disclosure", () => {
  const panel = fs.readFileSync(new URL("../components/SportActionPanel.jsx", import.meta.url), "utf8");
  assert.equal(panel.includes("More actions"), false);
  assert.equal(panel.includes("<details"), false);
  assert.match(panel, /Additional scoring actions/);
});

test("canonical JUDGE_SCORECARD selects the dedicated Boxing surface instead of the generic scoreboard", () => {
  const dashboard = fs.readFileSync(new URL("../LiveScoringDashboard.jsx", import.meta.url), "utf8");
  const branch = dashboard.indexOf(") : useBoxingScorecardSurface ? (");
  const surface = dashboard.indexOf("<BoxingScorecardSurface", branch);
  const legacy = dashboard.indexOf(") : (", surface);
  assert.ok(branch > 0);
  assert.ok(surface > branch);
  assert.ok(legacy > surface);
  assert.equal(dashboard.slice(branch, legacy).includes("<ScoreboardDisplay"), false);
});

test("live-scoring controls honor operational Match readiness before submitting", () => {
  const dashboard = fs.readFileSync(new URL("../LiveScoringDashboard.jsx", import.meta.url), "utf8");
  assert.match(dashboard, /const isOperationallyReady = operationalReadiness\?\.ready !== false/);
  assert.match(dashboard, /&& isOperationallyReady\s*&& Boolean\(safeDisplay\?\.allow_composer\)/);
  assert.match(dashboard, /operationalReadinessMessage \|\| blockingSessionError/);
  assert.match(dashboard, /\[\.\.\.new Set\(messages\)\]\.join\(" "\)/);
  assert.match(dashboard, /if \(!isOperationallyReady\) return operationalReadinessMessage/);
  assert.match(dashboard, /code === "MATCH_NOT_READY"/);
  assert.match(dashboard, /detail\.blockers/);
  assert.match(dashboard, /clockControls=\{primaryClockControls\}/);
  assert.equal(dashboard.includes("clockControls={canComposerSubmit ? primaryClockControls : []}"), false);
});

test("an unscheduled downstream match shows a scheduling-required state instead of a disabled scorer", () => {
  const dashboard = fs.readFileSync(new URL("../LiveScoringDashboard.jsx", import.meta.url), "utf8");
  const gate = dashboard.indexOf("{scheduleReadinessBlocker ? (");
  const timedSurface = dashboard.indexOf(") : useTimedTeamSurface ? (", gate);
  assert.ok(gate > 0);
  assert.ok(timedSurface > gate);
  const content = dashboard.slice(gate, timedSurface);
  assert.match(content, /Scoring unavailable/);
  assert.match(content, /Scheduling required/);
  assert.match(content, /has its participants, but it has not been scheduled yet/);
  assert.match(content, /Schedule Match/);
  assert.match(content, /Contact the Sports Coordinator/);
  assert.equal(content.includes("<BoxingScorecardSurface"), false);
});

test("detailed controls are embedded without a duplicate Action Console shell", () => {
  const dashboard = fs.readFileSync(new URL("../LiveScoringDashboard.jsx", import.meta.url), "utf8");
  const detailedStart = dashboard.indexOf("validatedConfig={detailedValidatedConfig}");
  assert.ok(detailedStart > 0);
  assert.match(dashboard.slice(Math.max(0, detailedStart - 100), detailedStart), /embedded/);
});

test("Boxing operator surface exposes corners, presets, incidents, and no generic point score", () => {
  const surface = fs.readFileSync(new URL("./BoxingScorecardSurface.jsx", import.meta.url), "utf8");
  assert.match(surface, /Red Corner/);
  assert.match(surface, /Blue Corner/);
  assert.match(surface, /Submit Round/);
  assert.match(surface, />End Bout</);
  assert.match(surface, /BOXING_SCORE_PRESETS/);
  assert.equal(surface.includes("Rounds Won"), false);
  assert.equal(surface.includes("PUNCH"), false);
  assert.equal(surface.includes(">Custom<"), false);
  assert.equal(surface.includes("Deduction -1"), false);
  assert.match(surface, /buildBoxingCornerPayload/);
});
