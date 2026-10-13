import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  isMetricRenderable,
  formatMetricValue,
  formatProfileDate,
  isRecordForSport,
  hasRole,
  normalizeRoles,
} from "./profileUtils.js";

describe("Phase 2 — Modular Frontend Profile Foundation", () => {
  // =========================================================================
  // 1. ProfileView Canonical Component Structure
  // =========================================================================
  it("Test 1: ProfileView imports and mounts core modular components", async () => {
    const src = await readFile(
      new URL("./ProfileView.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import ProfileHeader from ["'].\/ProfileHeader["']/);
    assert.match(src, /import ProfileContextBanner from ["'].\/ProfileContextBanner["']/);
    assert.match(src, /import PlayerSection from ["'].\/player\/PlayerSection["']/);
    assert.match(src, /import CoachSection from ["'].\/operational\/CoachSection["']/);
    assert.match(src, /import FacilitatorSection from ["'].\/operational\/FacilitatorSection["']/);
    assert.match(src, /import DepartmentSection from ["'].\/operational\/DepartmentSection["']/);
    assert.match(src, /import CoordinatorSection from ["'].\/operational\/CoordinatorSection["']/);
    assert.match(src, /import ProfileEditModal from ["'].\/ProfileEditModal["']/);
  });

  it("Test 2: ProfileView checks tournament context and displays unselected state when null", async () => {
    const src = await readFile(
      new URL("./ProfileView.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /selectedTournamentId/);
    assert.match(src, /data-testid="profile-no-intramural"/);
    assert.match(src, /Select an intramural from the workspace navigation/);
  });

  it("Test 3: ProfileView handles loading, error, and edit modal lifecycle cleanly", async () => {
    const src = await readFile(
      new URL("./ProfileView.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /data-testid="profile-loading"/);
    assert.match(src, /data-testid="profile-error"/);
    assert.match(src, /isEditModalOpen/);
    assert.match(src, /setIsEditModalOpen/);
    assert.match(src, /onProfileUpdated=\{fetchProfile\}/);
  });

  // =========================================================================
  // 2. ProfileContextBanner Scoping & Metadata
  // =========================================================================
  it("Test 4: ProfileContextBanner renders tournament metadata and status badges", async () => {
    const src = await readFile(
      new URL("./ProfileContextBanner.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /data-testid="profile-context-banner"/);
    assert.match(src, /intramuralName/);
    assert.match(src, /academicYear/);
    assert.match(src, /Historical record/);
    assert.match(src, /Current workspace/);
  });

  // =========================================================================
  // 3. Player Record Strip & Record Fidelity
  // =========================================================================
  it("Test 5: PlayerRecordStrip renders Played, Wins, Losses, Draws directly from record", async () => {
    const src = await readFile(
      new URL("./player/PlayerRecordStrip.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /data-testid="player-record-strip"/);
    assert.match(src, /matches\s*=\s*0/);
    assert.match(src, /wins\s*=\s*0/);
    assert.match(src, /losses\s*=\s*0/);
    assert.match(src, /draws\s*=\s*0/);
    assert.match(src, /Played/);
    assert.match(src, /Wins/);
    assert.match(src, /Losses/);
    assert.match(src, /Draws/);
  });

  // =========================================================================
  // 4. Player Sport Selector
  // =========================================================================
  it("Test 6: PlayerSportSelector renders single sport summary and multiple sports tablist", async () => {
    const src = await readFile(
      new URL("./player/PlayerSportSelector.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /if \(sports\.length === 1\)/);
    assert.match(src, /data-testid="player-sport-single"/);
    assert.match(src, /role="tablist"/);
    assert.match(src, /role="tab"/);
    assert.match(src, /aria-selected=\{isSelected\}/);
  });

  // =========================================================================
  // 5. Player Metric Cards & Legitimate Zero Preservation
  // =========================================================================
  it("Test 7: PlayerMetricCards only renders available backend metrics and preserves legitimate 0", async () => {
    const src = await readFile(
      new URL("./player/PlayerMetricCards.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /data-testid="player-metrics-(container|empty)"/);
    assert.match(src, /isMetricRenderable/);
    assert.match(src, /formatMetricValue/);
  });

  it("Test 8: profileUtils preserves legitimate 0 and filters null/unavailable metrics", () => {
    assert.equal(isMetricRenderable({ value: 0, available: true }), true);
    assert.equal(isMetricRenderable({ value: "0", available: true }), true);
    assert.equal(isMetricRenderable({ value: 42, available: true }), true);
    assert.equal(isMetricRenderable({ value: null, available: true }), false);
    assert.equal(isMetricRenderable({ value: undefined, available: true }), false);
    assert.equal(isMetricRenderable({ value: 10, available: false }), false);
    assert.equal(isMetricRenderable(null), false);

    assert.equal(formatMetricValue(0), "0");
    assert.equal(formatMetricValue("0"), "0");
    assert.equal(formatMetricValue(15), "15");
    assert.equal(formatMetricValue(null), "");
    assert.equal(formatMetricValue(undefined), "");
  });

  // =========================================================================
  // 6. Player Participation & Match History
  // =========================================================================
  it("Test 9: PlayerParticipationCard renders tournament entry and teammates", async () => {
    const src = await readFile(
      new URL("./player/PlayerParticipationCard.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /data-testid="player-participation-card"/);
    assert.match(src, /part\.(entry_name|team)/);
    assert.match(src, /part\.event_name/);
    assert.match(src, /Partner:|Teammates:/);
  });

  it("Test 10: PlayerMatchHistory renders completed matches and formatted oriented scores", async () => {
    const src = await readFile(
      new URL("./player/PlayerMatchHistory.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /data-testid="player-matches-(container|history)"/);
    assert.match(src, /formatOrientedScore\(rawScore,\s*res\)/);
    assert.match(src, /m\.result/);
  });

  // =========================================================================
  // 7. PlayerSection Modular Integration
  // =========================================================================
  it("Test 11: PlayerSection combines the 5 player subcomponents cleanly", async () => {
    const src = await readFile(
      new URL("./player/PlayerSection.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import PlayerRecordStrip from ["'].\/PlayerRecordStrip["']/);
    assert.match(src, /import PlayerSportSelector from ["'].\/PlayerSportSelector["']/);
    assert.match(src, /import PlayerMetricCards from ["'].\/PlayerMetricCards["']/);
    assert.match(src, /import PlayerParticipationCard from ["'].\/PlayerParticipationCard["']/);
    assert.match(src, /import PlayerMatchHistory from ["'].\/PlayerMatchHistory["']/);
    assert.match(src, /data-testid="player-section"/);
  });

  // =========================================================================
  // 8. Operational Sections Scope & Restraint
  // =========================================================================
  it("Test 12: CoachSection renders managed team context without fake stats", async () => {
    const src = await readFile(
      new URL("./operational/CoachSection.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /data-testid="coach-(management|operational)-section"/);
    assert.match(src, /teams/);
    assert.match(src, /team_name/);
    assert.doesNotMatch(src, /win_percentage|championship_count/i);
  });

  it("Test 13: FacilitatorSection renders assigned duties and schedule", async () => {
    const src = await readFile(
      new URL("./operational/FacilitatorSection.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /data-testid="facilitator-operational-section"/);
    assert.match(src, /assignments/);
    assert.doesNotMatch(src, /referee_rating|star_level/i);
  });

  it("Test 14: DepartmentSection renders department context and delegation", async () => {
    const src = await readFile(
      new URL("./operational/DepartmentSection.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /data-testid="department-(manager|operational)-section"/);
    assert.match(src, /department_name/);
    assert.doesNotMatch(src, /championship_prediction|power_ranking/i);
  });

  it("Test 15: CoordinatorSection renders tournament administration scope without vanity metrics", async () => {
    const src = await readFile(
      new URL("./operational/CoordinatorSection.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /data-testid="coordinator-(management|operational)-section"/);
    assert.match(src, /Tournament Coordination|Institutional Oversight/);
    assert.doesNotMatch(src, /overall_engagement_score|platform_likes/i);
  });

  // =========================================================================
  // 9. ProfileEditModal & userService Alignment
  // =========================================================================
  it("Test 16: ProfileEditModal provides clean self-service profile updating", async () => {
    const src = await readFile(
      new URL("./ProfileEditModal.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /data-testid="profile-edit-modal"/);
    assert.match(src, /full_name/);
    assert.match(src, /bio/);
    assert.match(src, /updateMyProfile/);
  });

  it("Test 17: userService getMyProfile supports tournamentId option", async () => {
    const src = await readFile(
      new URL("../../services/userService.js", import.meta.url),
      "utf8"
    );
    assert.match(src, /export\s+const\s+getMyProfile\s*=\s*async\s*\(options\s*=\s*\{\}\)/);
    assert.match(src, /params\.tournament_id\s*=\s*options\.tournamentId/);
  });

  // =========================================================================
  // 10. Canonical Route Entry Point
  // =========================================================================
  it("Test 18: MyProfile mounts ProfileView and preserves legacy compatibility hook", async () => {
    const src = await readFile(
      new URL("../../pages/profile/MyProfile.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /<ProfileView\s+mode="self"\s*\/>/);
    assert.match(src, /<UserProfileView\s+mode="self"\s*\/>/);
  });
});
