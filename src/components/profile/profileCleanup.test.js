import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import {
  resolveProfileUserId,
  normalizeProfileTarget,
  createProfileDrawerState,
  profileDrawerReducer,
  normalizeRoles,
} from "./profileUtils.js";

describe("Phase 7C-6 — Profile Architecture Cleanup & Consolidation", () => {
  // --- A. Zero Production Imports of Decommissioned Components ---
  it("Test 1: UserProfileDrawer has zero active production imports across components and pages", async () => {
    const filesToAudit = [
      "../../pages/coordinator/Teams.jsx",
      "../../pages/coordinator/Players.jsx",
      "../../pages/coordinator/UserManagement.jsx",
      "../../pages/coach/PlayerApplications.jsx",
      "../../components/dashboard/role_dashboard/layouts/DepartmentDashboardLayout.jsx",
      "../../components/layout/AppTopHeader.jsx",
      "../../components/teams/modals/ApplicationDetailsModal.jsx",
      "../../components/teams/modals/TeamProfileModal.jsx",
    ];
    for (const relPath of filesToAudit) {
      const src = await readFile(new URL(relPath, import.meta.url), "utf8");
      assert.doesNotMatch(
        src,
        /import\s+UserProfileDrawer\s+from/,
        `File ${relPath} must not import UserProfileDrawer`
      );
      assert.doesNotMatch(
        src,
        /<UserProfileDrawer[\s/>]/,
        `File ${relPath} must not mount UserProfileDrawer`
      );
    }
  });

  it("Test 2: DirectoryPlayerProfileDrawer has zero active production imports", async () => {
    const filesToAudit = [
      "../../components/dashboard/role_dashboard/layouts/CoachDashboardLayout.jsx",
      "../../components/directory/ParticipantDrawer.jsx",
      "../../pages/shared/CompetitionDirectoryPage.jsx",
    ];
    for (const relPath of filesToAudit) {
      const src = await readFile(new URL(relPath, import.meta.url), "utf8");
      assert.doesNotMatch(
        src,
        /import\s+DirectoryPlayerProfileDrawer\s+from/,
        `File ${relPath} must not import DirectoryPlayerProfileDrawer`
      );
      assert.doesNotMatch(
        src,
        /<DirectoryPlayerProfileDrawer[\s/>]/,
        `File ${relPath} must not mount DirectoryPlayerProfileDrawer`
      );
    }
  });

  it("Test 3: PlayerDetailDrilldown has zero active production imports", async () => {
    const filesToAudit = [
      "../../components/dashboard/TeamDetailsDrawer.jsx",
      "../../components/dashboard/team_drawer/PlayerPerformanceList.jsx",
    ];
    for (const relPath of filesToAudit) {
      const src = await readFile(new URL(relPath, import.meta.url), "utf8");
      assert.doesNotMatch(
        src,
        /import\s+.*PlayerDetailDrilldown.*from/,
        `File ${relPath} must not import PlayerDetailDrilldown`
      );
      assert.doesNotMatch(
        src,
        /<PlayerDetailDrilldown[\s/>]/,
        `File ${relPath} must not mount PlayerDetailDrilldown`
      );
    }
  });

  it("Test 4: ApplicationDetailsModal.jsx is completely purged of dead legacy drawer imports", async () => {
    const src = await readFile(
      new URL("../../components/teams/modals/ApplicationDetailsModal.jsx", import.meta.url),
      "utf8"
    );
    assert.doesNotMatch(src, /import\s+.*UserProfileDrawer.*from/);
    assert.doesNotMatch(src, /<UserProfileDrawer/);
  });

  it("Test 5: TeamProfileModal.jsx is completely purged of dead legacy drawer imports", async () => {
    const src = await readFile(
      new URL("../../components/teams/modals/TeamProfileModal.jsx", import.meta.url),
      "utf8"
    );
    assert.doesNotMatch(src, /import\s+.*UserProfileDrawer.*from/);
    assert.doesNotMatch(src, /<UserProfileDrawer/);
  });

  // --- B. Retained Components & Unique Functionality Preservation ---
  it("Test 6: UserProfileView.jsx is actively imported by MyProfile.jsx in mode='self'", async () => {
    const src = await readFile(
      new URL("../../pages/profile/MyProfile.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s+UserProfileView\s+from\s+["'].*UserProfileView["']/);
    assert.match(src, /<UserProfileView\s+mode="self"\s*\/>/);
  });

  it("Test 7: UserProfileView.jsx preserves unique self-editing and avatar management functions", async () => {
    const src = await readFile(
      new URL("../user/UserProfileView.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /uploadUserProfileImage/);
    assert.match(src, /removeUserProfileImage/);
    assert.match(src, /updateMyProfile/);
    assert.match(src, /getMyProfile/);
  });

  it("Test 8: ProfilePage.jsx is retained as a dedicated route and prefetched in routePrefetch.js", async () => {
    const prefetchSrc = await readFile(
      new URL("../../router/routePrefetch.js", import.meta.url),
      "utf8"
    );
    assert.match(prefetchSrc, /import\("\.\.\/pages\/shared\/ProfilePage"\)/);
    assert.match(prefetchSrc, /\["\/coordinator\/profile",\s*loadProfilePage\]/);
  });

  it("Test 9: ProfilePage.jsx preserves dedicated role analytics and AI insights", async () => {
    const pageSrc = await readFile(
      new URL("../../pages/shared/ProfilePage.jsx", import.meta.url),
      "utf8"
    );
    assert.match(pageSrc, /getMyRoleProfile/);
    assert.match(pageSrc, /AI Insights/);
    assert.match(pageSrc, /Activity Timeline/);
  });

  it("Test 10: Legacy components exist on disk to preserve certified baseline continuity", async () => {
    const paths = [
      new URL("../../pages/coordinator/user_management/UserProfileDrawer.jsx", import.meta.url),
      new URL("../directory/DirectoryPlayerProfileDrawer.jsx", import.meta.url),
      new URL("../dashboard/team_drawer/PlayerDetailDrilldown.jsx", import.meta.url),
    ];
    for (const p of paths) {
      await assert.doesNotReject(access(p), `Path ${p} must remain on disk`);
    }
  });

  // --- C. Canonical Utility Parity & Consolidation ---
  it("Test 11: resolveProfileUserId returns positive integer when valid numeric argument provided", () => {
    assert.equal(resolveProfileUserId(42), 42);
    assert.equal(resolveProfileUserId("84"), 84);
  });

  it("Test 12: resolveProfileUserId returns 0 for zero, negatives, and invalid values", () => {
    assert.equal(resolveProfileUserId(0), 0);
    assert.equal(resolveProfileUserId(-5), 0);
    assert.equal(resolveProfileUserId(null), 0);
    assert.equal(resolveProfileUserId(undefined), 0);
    assert.equal(resolveProfileUserId(""), 0);
    assert.equal(resolveProfileUserId("invalid"), 0);
  });

  it("Test 13: resolveProfileUserId scans multiple arguments and returns first positive number", () => {
    assert.equal(resolveProfileUserId(null, undefined, 15, 20), 15);
    assert.equal(resolveProfileUserId(0, "", "108"), 108);
    assert.equal(resolveProfileUserId(null, 0, undefined), 0);
  });

  it("Test 14: resolveProfileUserId is exported from profileUtils.js and index.js", async () => {
    assert.equal(typeof resolveProfileUserId, "function");
    const indexSrc = await readFile(new URL("./index.js", import.meta.url), "utf8");
    assert.match(indexSrc, /resolveProfileUserId/);
  });

  // --- D. Consumers Use Canonical Utility Without Local Duplication ---
  it("Test 15: Teams.jsx imports canonical resolveProfileUserId and has no duplicate local definition", async () => {
    const src = await readFile(
      new URL("../../pages/coordinator/Teams.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{[^}]*resolveProfileUserId[^}]*\}\s*from\s*["']\.\.\/\.\.\/components\/profile["']/);
    assert.doesNotMatch(src, /const\s+resolveProfileUserId\s*=/);
  });

  it("Test 16: Players.jsx imports canonical resolveProfileUserId and has no duplicate local definition", async () => {
    const src = await readFile(
      new URL("../../pages/coordinator/Players.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{[^}]*resolveProfileUserId[^}]*\}\s*from\s*["']\.\.\/\.\.\/components\/profile["']/);
    assert.doesNotMatch(src, /const\s+resolveProfileUserId\s*=/);
  });

  it("Test 17: PlayerApplications.jsx imports canonical resolveProfileUserId and has no duplicate local definition", async () => {
    const src = await readFile(
      new URL("../../pages/coach/PlayerApplications.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{[^}]*resolveProfileUserId[^}]*\}\s*from\s*["']\.\.\/\.\.\/components\/profile["']/);
    assert.doesNotMatch(src, /const\s+resolveProfileUserId\s*=/);
  });

  it("Test 18: ApplicationDetailsModal.jsx imports canonical resolveProfileUserId and has no duplicate local definition", async () => {
    const src = await readFile(
      new URL("../../components/teams/modals/ApplicationDetailsModal.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{[^}]*resolveProfileUserId[^}]*\}\s*from\s*["']\.\.\/\.\.\/\.\.\/components\/profile["']/);
    assert.doesNotMatch(src, /const\s+resolveProfileUserId\s*=/);
  });

  it("Test 19: TeamProfileModal.jsx imports canonical resolveProfileUserId and has no duplicate local definition", async () => {
    const src = await readFile(
      new URL("../../components/teams/modals/TeamProfileModal.jsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /import\s*\{[^}]*resolveProfileUserId[^}]*\}\s*from\s*["']\.\.\/\.\.\/\.\.\/components\/profile["']/);
    assert.doesNotMatch(src, /const\s+resolveProfileUserId\s*=/);
  });

  it("Test 20: DirectoryPlayerProfileDrawer.jsx has its import statements organized at top of file", async () => {
    const src = await readFile(
      new URL("../directory/DirectoryPlayerProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    const lastExportIdx = src.lastIndexOf("export default");
    const lastImportIdx = src.lastIndexOf("import ");
    assert.ok(lastImportIdx < lastExportIdx, "All imports must precede export default");
  });

  // --- E. Universal Architecture Singleton & RBAC Guardrails ---
  it("Test 21: App.jsx mounts UniversalProfileDrawer exactly once inside ProfileDrawerProvider", async () => {
    const appSrc = await readFile(new URL("../../App.jsx", import.meta.url), "utf8");
    const drawerMatches = appSrc.match(/<UniversalProfileDrawer\s*\/>/g);
    assert.equal(drawerMatches?.length, 1, "UniversalProfileDrawer must be mounted exactly once");
    const providerMatches = appSrc.match(/<ProfileDrawerProvider>/g);
    assert.equal(providerMatches?.length, 1, "ProfileDrawerProvider must wrap the route tree");
  });

  it("Test 22: Profile drawer state transitions (OPEN, CLOSE, RESET) remain fully functional", () => {
    const initial = createProfileDrawerState();
    assert.equal(initial.isOpen, false);
    assert.equal(initial.profileTarget, null);

    const openState = profileDrawerReducer(initial, {
      type: "OPEN",
      payload: { userId: 50, playerId: 100, tournamentId: 1 },
    });
    assert.equal(openState.isOpen, true);
    assert.equal(openState.profileTarget.userId, 50);
    assert.equal(openState.profileTarget.playerId, 100);

    const closeState = profileDrawerReducer(openState, { type: "CLOSE" });
    assert.equal(closeState.isOpen, false);

    const resetState = profileDrawerReducer(openState, { type: "RESET" });
    assert.equal(resetState.isOpen, false);
    assert.equal(resetState.profileTarget, null);
  });

  it("Test 23: normalizeRoles handles array, string, and object inputs with deduplication", () => {
    const roles = ["player", { role: "COACH" }, "PLAYER", { name: "sports_coordinator" }];
    const normalized = normalizeRoles(roles);
    assert.deepEqual(normalized, ["PLAYER", "COACH", "SPORTS_COORDINATOR"]);
  });

  it("Test 24: normalizeProfileTarget converts numbers, numeric strings, and polymorphic objects", () => {
    assert.deepEqual(normalizeProfileTarget(25), { userId: 25 });
    assert.deepEqual(normalizeProfileTarget("70"), { userId: 70 });
    assert.deepEqual(normalizeProfileTarget({ playerId: "12", tournamentId: "3" }), {
      playerId: 12,
      tournamentId: 3,
    });
    assert.equal(normalizeProfileTarget(null), null);
    assert.equal(normalizeProfileTarget(""), null);
  });

  it("Test 25: LiveScoringDashboard.jsx is protected and does not import useProfileDrawer", async () => {
    const src = await readFile(
      new URL("../brackets/LiveScoringDashboard.jsx", import.meta.url),
      "utf8"
    );
    assert.doesNotMatch(src, /useProfileDrawer/);
  });
});
