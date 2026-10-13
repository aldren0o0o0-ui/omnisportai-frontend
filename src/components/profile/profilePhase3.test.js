import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import {
  normalizeProfileTarget,
  createProfileDrawerState,
  profileDrawerReducer,
} from "./profileUtils.js";

describe("Phase 3 — Profile Integration & Entry-Point Alignment", () => {
  // =========================================================================
  // 1. Profile Entry-Point & Route Alignment
  // =========================================================================
  it("Test 1: App.jsx mounts MyProfile for all role profile routes", async () => {
    const appSrc = await readFile(
      new URL("../../App.jsx", import.meta.url),
      "utf8"
    );
    // Role profile sub-routes
    assert.match(appSrc, /<Route path="profile" element=\{renderLazyRoute\(MyProfile\)\} \/>/);
    // Profile root redirect
    assert.match(appSrc, /<Route path="\/profile" element=\{renderLazyRoute\(ProfileRouteRedirect\)\} \/>/);
  });

  it("Test 2: ProfileRouteRedirect directs users to canonical role profile endpoints", async () => {
    const redirectSrc = await readFile(
      new URL("../../pages/profile/ProfileRouteRedirect.jsx", import.meta.url),
      "utf8"
    );
    assert.match(redirectSrc, /\/coordinator\/profile/);
    assert.match(redirectSrc, /\/department\/profile/);
    assert.match(redirectSrc, /\/sport-facilitator\/profile/);
    assert.match(redirectSrc, /\/coach\/profile/);
    assert.match(redirectSrc, /\/viewer\/profile/);
  });

  it("Test 3: MyProfile renders the canonical ProfileView component", async () => {
    const myProfileSrc = await readFile(
      new URL("../../pages/profile/MyProfile.jsx", import.meta.url),
      "utf8"
    );
    assert.match(myProfileSrc, /import ProfileView from ["']\.\.\/\.\.\/components\/profile\/ProfileView["']/);
    assert.match(myProfileSrc, /<ProfileView\s+mode="self"\s*\/>/);
  });

  // =========================================================================
  // 2. Intramural Context Scoping Consistency
  // =========================================================================
  it("Test 4: ProfileView retrieves intramural context from WorkspaceContext", async () => {
    const profileViewSrc = await readFile(
      new URL("./ProfileView.jsx", import.meta.url),
      "utf8"
    );
    assert.match(profileViewSrc, /useWorkspace\(\)/);
    assert.match(profileViewSrc, /selectedIntramural/);
    assert.match(profileViewSrc, /options\.tournamentId\s*=\s*selectedTournamentId/);
  });

  it("Test 5: UniversalProfileDrawer retrieves intramural context from WorkspaceContext", async () => {
    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.match(drawerSrc, /import\s*\{\s*useWorkspace\s*\}\s*from\s*["']\.\.\/\.\.\/context\/WorkspaceContext["']/);
    assert.match(drawerSrc, /useWorkspace\(\)/);
    assert.match(drawerSrc, /effectiveTournamentId/);
    assert.match(drawerSrc, /tournamentId:\s*effectiveTournamentId/);
  });

  it("Test 6: UniversalProfileDrawer mounts ProfileContextBanner for intramural scoping", async () => {
    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.match(drawerSrc, /import ProfileContextBanner from ["']\.\/ProfileContextBanner["']/);
    assert.match(drawerSrc, /<ProfileContextBanner/);
  });

  // =========================================================================
  // 3. Universal Profile Drawer Dimensions & Privacy
  // =========================================================================
  it("Test 7: UniversalProfileDrawer maintains responsive width (520px on desktop)", async () => {
    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.match(drawerSrc, /sm:w-\[520px\]/);
    assert.match(drawerSrc, /data-testid="universal-profile-drawer"/);
    assert.match(drawerSrc, /data-testid="universal-profile-backdrop"/);
    assert.match(drawerSrc, /data-testid="universal-profile-close-btn"/);
  });

  it("Test 8: Drawer respects backend privacy semantics without client-side escalation", async () => {
    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    // Does not forge or override visibility
    assert.match(drawerSrc, /visibility=\{profile\.visibility\}/);
    assert.match(drawerSrc, /user=\{profile\.user\}/);
  });

  // =========================================================================
  // 4. Route Prefetch Alignment
  // =========================================================================
  it("Test 9: routePrefetch.js targets canonical MyProfile and includes /profile", async () => {
    const prefetchSrc = await readFile(
      new URL("../../router/routePrefetch.js", import.meta.url),
      "utf8"
    );
    assert.match(prefetchSrc, /const loadMyProfilePage = \(\) => import\("\.\.\/pages\/profile\/MyProfile"\)/);
    assert.match(prefetchSrc, /\["\/profile",\s*loadMyProfilePage\]/);
    assert.match(prefetchSrc, /const loadProfilePage = loadMyProfilePage/);
    assert.match(prefetchSrc, /import\("\.\.\/pages\/shared\/ProfilePage"\)/);
  });

  // =========================================================================
  // 5. Peer Profile Trigger Compatibility
  // =========================================================================
  it("Test 10: AppTopHeader integrates useProfileDrawer for user navigation", async () => {
    const headerSrc = await readFile(
      new URL("../layout/AppTopHeader.jsx", import.meta.url),
      "utf8"
    );
    assert.match(headerSrc, /import\s*\{\s*useProfileDrawer\s*\}\s*from\s*["']\.\.\/profile["']/);
    assert.match(headerSrc, /openProfile/);
  });

  it("Test 11: Players directory integrates useProfileDrawer for peer drilldown", async () => {
    const playersSrc = await readFile(
      new URL("../../pages/coordinator/Players.jsx", import.meta.url),
      "utf8"
    );
    assert.match(playersSrc, /openProfile/);
    assert.match(playersSrc, /resolveProfileUserId/);
  });

  // =========================================================================
  // 6. Non-Destructive Legacy Preservation
  // =========================================================================
  it("Test 12: Legacy profile modules are preserved on disk without premature deletion", async () => {
    const legacyFiles = [
      new URL("../../components/user/UserProfileView.jsx", import.meta.url),
      new URL("../../pages/shared/ProfilePage.jsx", import.meta.url),
      new URL("../../../../backend/app/services/role_profile_service.py", import.meta.url),
    ];
    for (const fileUrl of legacyFiles) {
      await assert.doesNotReject(access(fileUrl), `Expected ${fileUrl} to exist on disk`);
    }
  });
});
