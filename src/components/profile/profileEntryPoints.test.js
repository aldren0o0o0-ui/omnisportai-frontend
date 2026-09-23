import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import {
  normalizeProfileTarget,
  createProfileDrawerState,
  profileDrawerReducer,
} from "./profileUtils.js";

describe("Phase 7C-5 — Global Profile Entry-Point Migration", () => {
  // --- A. Standings & Analytics Surfaces ---
  it("Test 1: AnalyticsStandingsPanel imports useProfileDrawer and supplies scope to table", async () => {
    const src = await readFile(
      new URL("../../pages/shared/AnalyticsStandingsPanel.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{\s*useProfileDrawer\s*\}\s*from\s*["']\.\.\/\.\.\/components\/profile["']/);
    assert.match(src, /const\s*\{\s*openProfile\s*\}\s*=\s*useProfileDrawer\(\)/);
    assert.match(src, /tournamentId=\{tournamentId\}/);
    assert.match(src, /sportId=\{sportId\}/);
  });

  it("Test 2: AnalyticsStandingsPanel AnalyticsTable row click triggers openProfile with player scope", async () => {
    const src = await readFile(
      new URL("../../pages/shared/AnalyticsStandingsPanel.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /openProfile\(\{\s*playerId:\s*Number\(row\.participant_id\),\s*tournamentId/);
  });

  // --- B. Tournament & Coordinator Surfaces ---
  it("Test 3: Players.jsx imports useProfileDrawer and removes local UserProfileDrawer", async () => {
    const src = await readFile(
      new URL("../../pages/coordinator/Players.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{[^}]*useProfileDrawer[^}]*\}\s*from\s*["']\.\.\/\.\.\/components\/profile["']/);
    assert.doesNotMatch(src, /import\s+UserProfileDrawer/);
    assert.doesNotMatch(src, /<UserProfileDrawer/);
  });

  it("Test 4: Players.jsx openUserProfile delegates to openProfile with userId and playerId", async () => {
    const src = await readFile(
      new URL("../../pages/coordinator/Players.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /const\s+openUserProfile\s*=\s*\(userId,\s*playerId\s*=\s*null\)\s*=>/);
    assert.match(src, /openProfile\(\{\s*userId:\s*resolved\s*\|\|\s*null,\s*playerId:\s*playerId\s*\?\s*Number\(playerId\)\s*:\s*null,\s*\}\)/);
  });

  it("Test 5: Teams.jsx imports useProfileDrawer and eliminates local UserProfileDrawer", async () => {
    const src = await readFile(
      new URL("../../pages/coordinator/Teams.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{[^}]*useProfileDrawer[^}]*\}\s*from\s*["']\.\.\/\.\.\/components\/profile["']/);
    assert.doesNotMatch(src, /import\s+UserProfileDrawer/);
    assert.doesNotMatch(src, /<UserProfileDrawer/);
  });

  it("Test 6: Teams.jsx openUserProfileDrawer delegates to openProfile with scope", async () => {
    const src = await readFile(
      new URL("../../pages/coordinator/Teams.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /const\s+openUserProfileDrawer\s*=\s*\(userId,\s*playerId\s*=\s*null\)\s*=>/);
    assert.match(src, /openProfile\(\{\s*userId:\s*resolved\s*\|\|\s*null,\s*playerId:\s*playerId\s*\?\s*Number\(playerId\)\s*:\s*null,\s*tournamentId:\s*selectedTournamentId\s*\?\s*Number\(selectedTournamentId\)\s*:\s*null,\s*\}\)/);
  });

  it("Test 7: TeamDetailsDrawer.jsx imports useProfileDrawer and eliminates PlayerDetailDrilldown mount", async () => {
    const src = await readFile(
      new URL("../../components/dashboard/TeamDetailsDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{\s*useProfileDrawer\s*\}\s*from\s*["']\.\.\/profile["']/);
    assert.doesNotMatch(src, /import\s+PlayerDetailDrilldown/);
    assert.doesNotMatch(src, /<PlayerDetailDrilldown/);
  });

  it("Test 8: TeamDetailsDrawer.jsx wires PlayerPerformanceList onSelectPlayer to openProfile", async () => {
    const src = await readFile(
      new URL("../../components/dashboard/TeamDetailsDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /onSelectPlayer=\{\(player\)\s*=>\s*\{\s*openProfile\(\{/);
    assert.match(src, /userId:\s*player\?\.user_id\s*\|\|\s*null/);
    assert.match(src, /playerId:\s*player\?\.id\s*\|\|\s*player\?\.player_id\s*\|\|\s*player\?\.participant_id\s*\|\|\s*null/);
  });

  it("Test 9: TeamDetailsDrawer.jsx renders clickable roster rows that open profile before matches exist", async () => {
    const src = await readFile(
      new URL("../../components/dashboard/TeamDetailsDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /mergedPlayers\.map\(\(player,\s*idx\)\s*=>\s*\(\s*<button/);
    assert.match(src, /openProfile\(\{\s*userId:\s*player\?\.user_id/);
  });

  // --- C. Role Dashboard Surfaces ---
  it("Test 10: CoachDashboardLayout.jsx imports useProfileDrawer and eliminates DirectoryPlayerProfileDrawer mount", async () => {
    const src = await readFile(
      new URL("../../components/dashboard/role_dashboard/layouts/CoachDashboardLayout.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{\s*useProfileDrawer\s*\}\s*from\s*["']\.\.\/\.\.\/\.\.\/profile["']/);
    assert.doesNotMatch(src, /import\s+DirectoryPlayerProfileDrawer/);
    assert.doesNotMatch(src, /<DirectoryPlayerProfileDrawer/);
  });

  it("Test 11: CoachDashboardLayout.jsx delegates onSelectPlayer from CoachOperationsDashboard to openProfile", async () => {
    const src = await readFile(
      new URL("../../components/dashboard/role_dashboard/layouts/CoachDashboardLayout.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /onSelectPlayer=\{\(\{ player, participant \}\)\s*=>\s*\{\s*openProfile\(\{/);
    assert.match(src, /userId:\s*player\?\.user_id\s*\|\|\s*null/);
    assert.match(src, /playerId:\s*player\?\.player_id\s*\|\|\s*player\?\.id\s*\|\|\s*null/);
    assert.match(src, /sportId:\s*participant\?\.sport_id\s*\?\s*Number\(participant\.sport_id\)\s*:\s*null/);
  });

  it("Test 12: ParticipantDrawer.jsx imports useProfileDrawer and wires coach and member identity clicks", async () => {
    const src = await readFile(
      new URL("../../components/directory/ParticipantDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{\s*useProfileDrawer\s*\}\s*from\s*["']\.\.\/profile["']/);
    assert.match(src, /const\s*\{\s*openProfile\s*\}\s*=\s*useProfileDrawer\(\)/);
    // Coach click
    assert.match(src, /openProfile\(\{\s*userId:\s*Number\(coachUserId\)/);
    // Member click
    assert.match(src, /openProfile\(\{\s*playerId:\s*member\.player_id\s*\|\|\s*member\.id\s*\|\|\s*null/);
  });

  it("Test 13: PlayerDashboardLayout.jsx imports useProfileDrawer and renders interactive teammate buttons", async () => {
    const src = await readFile(
      new URL("../../components/dashboard/role_dashboard/layouts/PlayerDashboardLayout.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{\s*useProfileDrawer\s*\}\s*from\s*["']\.\.\/\.\.\/\.\.\/profile["']/);
    assert.match(src, /players\.map\(\(player\)\s*=>\s*\{[\s\S]*?<button[\s\S]*?openProfile\(\{/);
  });

  // --- D. Administrative & Header Surfaces ---
  it("Test 14: UserManagement.jsx imports useProfileDrawer and eliminates local UserProfileDrawer mount", async () => {
    const src = await readFile(
      new URL("../../pages/coordinator/UserManagement.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{\s*useProfileDrawer\s*\}\s*from\s*["']\.\.\/\.\.\/components\/profile["']/);
    assert.doesNotMatch(src, /import\s+UserProfileDrawer/);
    assert.doesNotMatch(src, /<UserProfileDrawer/);
  });

  it("Test 15: UserManagement.jsx openUserProfile calls openProfile with resolvedId and scope", async () => {
    const src = await readFile(
      new URL("../../pages/coordinator/UserManagement.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /const\s+openUserProfile\s*=\s*\(row\)\s*=>\s*\{[\s\S]*?openProfile\(\{\s*userId:\s*resolvedId,\s*tournamentId:\s*selectedTournamentId/);
  });

  it("Test 16: PlayerApplications.jsx imports useProfileDrawer and eliminates local UserProfileDrawer", async () => {
    const src = await readFile(
      new URL("../../pages/coach/PlayerApplications.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{[^}]*useProfileDrawer[^}]*\}\s*from\s*["']\.\.\/\.\.\/components\/profile["']/);
    assert.doesNotMatch(src, /import\s+UserProfileDrawer/);
    assert.doesNotMatch(src, /<UserProfileDrawer/);
  });

  it("Test 17: PlayerApplications.jsx openUserProfile calls openProfile with resolved userId and tournamentId", async () => {
    const src = await readFile(
      new URL("../../pages/coach/PlayerApplications.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /const\s+openUserProfile\s*=\s*\(userId\)\s*=>\s*\{[\s\S]*?openProfile\(\{\s*userId:\s*resolved,\s*tournamentId:\s*selectedTournamentId/);
  });

  it("Test 18: DepartmentDashboardLayout.jsx imports useProfileDrawer and removes local UserProfileDrawer", async () => {
    const src = await readFile(
      new URL("../../components/dashboard/role_dashboard/layouts/DepartmentDashboardLayout.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{\s*useProfileDrawer\s*\}\s*from\s*["']\.\.\/\.\.\/\.\.\/profile["']/);
    assert.doesNotMatch(src, /import\s+UserProfileDrawer/);
    assert.doesNotMatch(src, /<UserProfileDrawer/);
  });

  it("Test 19: DepartmentDashboardLayout.jsx coach row button calls openProfile with coachUserId", async () => {
    const src = await readFile(
      new URL("../../components/dashboard/role_dashboard/layouts/DepartmentDashboardLayout.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /openProfile\(\{\s*userId:\s*Number\(coachUserId\),\s*tournamentId:\s*tournamentId/);
  });

  it("Test 20: AppTopHeader.jsx imports useProfileDrawer and removes local UserProfileDrawer", async () => {
    const src = await readFile(
      new URL("../../components/layout/AppTopHeader.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{\s*useProfileDrawer\s*\}\s*from\s*["']\.\.\/profile["']/);
    assert.doesNotMatch(src, /import\s+UserProfileDrawer/);
    assert.doesNotMatch(src, /<UserProfileDrawer/);
  });

  it("Test 21: AppTopHeader.jsx search item click delegates to openProfile with userId and playerId", async () => {
    const src = await readFile(
      new URL("../../components/layout/AppTopHeader.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /openProfile\(\{\s*userId:\s*item\.userId\s*\|\|\s*null,\s*playerId:\s*item\.playerId\s*\|\|\s*item\.id\s*\|\|\s*null/);
  });

  // --- E. Viewer & Announcement Surfaces ---
  it("Test 22: ViewerPanels.jsx imports useProfileDrawer and provides profile buttons in RosterPanel", async () => {
    const src = await readFile(
      new URL("../../components/live-match-viewer/ViewerPanels.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{\s*useProfileDrawer\s*\}\s*from\s*["']\.\.\/profile["']/);
    assert.match(src, /openProfile\(\{\s*playerId:\s*memberPlayerId\s*\?\s*Number\(memberPlayerId\)\s*:\s*null,\s*userId:\s*memberUserId\s*\?\s*Number\(memberUserId\)\s*:\s*null/);
  });

  it("Test 23: AnnouncementDetailPage.jsx imports useProfileDrawer and renders creator profile button", async () => {
    const src = await readFile(
      new URL("../../pages/shared/AnnouncementDetailPage.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{\s*useProfileDrawer\s*\}\s*from\s*["']\.\.\/\.\.\/components\/profile["']/);
    assert.match(src, /openProfile\(\{\s*userId:\s*Number\(announcement\.created_by_user_id\)\s*\}\)/);
  });

  // --- F. Architectural Invariants & Protected Components ---
  it("Test 24: LiveScoringDashboard.jsx is protected and retains its scoring attribution interactions untouched", async () => {
    const src = await readFile(
      new URL("../brackets/LiveScoringDashboard.jsx", import.meta.url),
      "utf8"
    );
    // Does not hijack player selection for profile drawers
    assert.doesNotMatch(src, /useProfileDrawer/);
    assert.match(src, /buildCanonicalPlayerOptions/);
    assert.match(src, /resolveActionAttributionPolicy/);
  });

  it("Test 25: ProfilePage.jsx and MyProfile.jsx remain intact as dedicated account-management routes", async () => {
    const profilePageSrc = await readFile(
      new URL("../../pages/shared/ProfilePage.jsx", import.meta.url),
      "utf8"
    );
    assert.match(profilePageSrc, /ProfilePage/);
    assert.match(profilePageSrc, /uploadUserProfileImage/);

    const myProfileSrc = await readFile(
      new URL("../../pages/profile/MyProfile.jsx", import.meta.url),
      "utf8"
    );
    assert.match(myProfileSrc, /mode="self"/);
    assert.match(myProfileSrc, /UserProfileView/);

    const userProfileViewSrc = await readFile(
      new URL("../user/UserProfileView.jsx", import.meta.url),
      "utf8"
    );
    assert.match(userProfileViewSrc, /uploadUserProfileImage/);
    assert.match(userProfileViewSrc, /removeUserProfileImage/);
  });

  it("Test 26: Legacy profile components are preserved on disk without deletion", async () => {
    const legacyPaths = [
      new URL("../../pages/coordinator/user_management/UserProfileDrawer.jsx", import.meta.url),
      new URL("../../components/user/UserProfileView.jsx", import.meta.url),
      new URL("../../components/directory/DirectoryPlayerProfileDrawer.jsx", import.meta.url),
      new URL("../../components/dashboard/team_drawer/PlayerDetailDrilldown.jsx", import.meta.url),
      new URL("../../pages/shared/ProfilePage.jsx", import.meta.url),
    ];
    for (const fileUrl of legacyPaths) {
      await assert.doesNotReject(access(fileUrl), `Expected ${fileUrl} to exist on disk`);
    }
  });

  it("Test 27: App.jsx mounts UniversalProfileDrawer exactly once at application root", async () => {
    const appSrc = await readFile(
      new URL("../../App.jsx", import.meta.url),
      "utf8"
    );
    const matches = appSrc.match(/<UniversalProfileDrawer\s*\/>/g);
    assert.equal(matches?.length, 1, "UniversalProfileDrawer must be mounted exactly once in App.jsx");
    assert.match(appSrc, /<ProfileDrawerProvider>/);
  });

  // --- G. Profile Context & Reducer Contract ---
  it("Test 28: Profile drawer handles both userId and playerId in single payload", () => {
    const target = normalizeProfileTarget({
      userId: 55,
      playerId: 102,
      tournamentId: 3,
      sportId: 1,
    });
    assert.deepEqual(target, {
      userId: 55,
      playerId: 102,
      tournamentId: 3,
      sportId: 1,
    });

    const state = createProfileDrawerState();
    const next = profileDrawerReducer(state, { type: "OPEN", payload: target });
    assert.equal(next.isOpen, true);
    assert.equal(next.profileTarget.userId, 55);
    assert.equal(next.profileTarget.playerId, 102);
  });

  it("Test 29: Profile drawer handles playerId-only payload smoothly", () => {
    const target = normalizeProfileTarget({ playerId: 99, tournamentId: 5 });
    assert.deepEqual(target, { playerId: 99, tournamentId: 5 });
    const state = createProfileDrawerState();
    const next = profileDrawerReducer(state, { type: "OPEN", payload: target });
    assert.equal(next.isOpen, true);
    assert.equal(next.profileTarget.playerId, 99);
    assert.equal(next.profileTarget.userId, undefined);
  });

  it("Test 30: Profile drawer handles userId-only payload smoothly", () => {
    const target = normalizeProfileTarget({ userId: 77, roleHint: "COACH" });
    assert.deepEqual(target, { userId: 77, roleHint: "COACH" });
    const state = createProfileDrawerState();
    const next = profileDrawerReducer(state, { type: "OPEN", payload: target });
    assert.equal(next.isOpen, true);
    assert.equal(next.profileTarget.userId, 77);
  });

  it("Test 31: Drawer close updates isOpen to false", () => {
    const openedState = profileDrawerReducer(createProfileDrawerState(), {
      type: "OPEN",
      payload: { userId: 12 },
    });
    assert.equal(openedState.isOpen, true);
    const closedState = profileDrawerReducer(openedState, { type: "CLOSE" });
    assert.equal(closedState.isOpen, false);
  });
});
