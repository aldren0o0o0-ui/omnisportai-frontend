import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import {
  isMetricRenderable,
  formatMetricValue,
  formatProfileDate,
  formatOrientedScore,
  isRecordForSport,
  hasRole,
  normalizeRoles,
} from "./profileUtils.js";

describe("Phase 4 — Legacy Profile Cleanup & Final Certification", () => {
  // =========================================================================
  // 1. Canonical Profile Architecture Invariants
  // =========================================================================
  it("Test 1: ProfileView is the sole canonical profile view component", async () => {
    const profileViewSrc = await readFile(
      new URL("./ProfileView.jsx", import.meta.url),
      "utf8"
    );
    assert.match(profileViewSrc, /export const ProfileView/);
    assert.match(profileViewSrc, /ProfileHeader/);
    assert.match(profileViewSrc, /ProfileContextBanner/);
    assert.match(profileViewSrc, /PlayerSection/);
  });

  it("Test 2: MyProfile mounts ProfileView as canonical user profile entry point", async () => {
    const myProfileSrc = await readFile(
      new URL("../../pages/profile/MyProfile.jsx", import.meta.url),
      "utf8"
    );
    assert.match(myProfileSrc, /<ProfileView\s+mode="self"\s*\/>/);
  });

  it("Test 3: UniversalProfileDrawer mounts modular Phase 2 components and 520px width", async () => {
    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.match(drawerSrc, /sm:w-\[520px\]/);
    assert.match(drawerSrc, /<ProfileHeader/);
    assert.match(drawerSrc, /<ProfileContextBanner/);
    assert.match(drawerSrc, /<PlayerProfileContent/);
  });

  // =========================================================================
  // 2. Data Contract & Absence of Social Vanity / AI Insights
  // =========================================================================
  it("Test 4: ProfileHeader contains no social vanity likes or follower metrics", async () => {
    const headerSrc = await readFile(
      new URL("./ProfileHeader.jsx", import.meta.url),
      "utf8"
    );
    assert.doesNotMatch(headerSrc, /<ThumbsUp|<Heart|likes_count/i);
    assert.doesNotMatch(headerSrc, /data-testid="profile-likes"/);
  });

  it("Test 5: PlayerMetricCards does not fabricate synthetic stats or AI insights", async () => {
    const cardsSrc = await readFile(
      new URL("./player/PlayerMetricCards.jsx", import.meta.url),
      "utf8"
    );
    assert.match(cardsSrc, /isMetricRenderable/);
    assert.match(cardsSrc, /formatMetricValue/);
    assert.doesNotMatch(cardsSrc, /AI Insights|win_probability|predicted_score/i);
  });

  // =========================================================================
  // 3. Intramural Tournament Context Isolation
  // =========================================================================
  it("Test 6: Full Profile and Drawer share identical WorkspaceContext tournament scoping", async () => {
    const profileViewSrc = await readFile(
      new URL("./ProfileView.jsx", import.meta.url),
      "utf8"
    );
    const drawerSrc = await readFile(
      new URL("./UniversalProfileDrawer.jsx", import.meta.url),
      "utf8"
    );

    assert.match(profileViewSrc, /useWorkspace\(\)/);
    assert.match(profileViewSrc, /selectedIntramural/);
    assert.match(drawerSrc, /useWorkspace\(\)/);
    assert.match(drawerSrc, /selectedIntramural/);
  });

  // =========================================================================
  // 4. Backend & Legacy Preservation Invariants
  // =========================================================================
  it("Test 7: Backend role_profile_service has active consumer in user_routes.py", async () => {
    const routesSrc = await readFile(
      new URL("../../../../backend/app/api/user_routes.py", import.meta.url),
      "utf8"
    );
    assert.match(routesSrc, /from app\.services\.role_profile_service import build_role_aware_profile_payload/);
    assert.match(routesSrc, /build_role_aware_profile_payload\(/);
  });

  it("Test 8: Legacy components exist on disk to preserve certified baseline continuity", async () => {
    const legacyFiles = [
      new URL("../../components/user/UserProfileView.jsx", import.meta.url),
      new URL("../../pages/shared/ProfilePage.jsx", import.meta.url),
      new URL("../../pages/coordinator/user_management/UserProfileDrawer.jsx", import.meta.url),
      new URL("../../../../backend/app/services/role_profile_service.py", import.meta.url),
    ];
    for (const fileUrl of legacyFiles) {
      await assert.doesNotReject(access(fileUrl), `Expected ${fileUrl} to exist on disk`);
    }
  });

  // =========================================================================
  // 5. User Service Unified Contract
  // =========================================================================
  it("Test 9: userService supports tournament_id scoping for both self and peer profiles", async () => {
    const userSvcSrc = await readFile(
      new URL("../../services/userService.js", import.meta.url),
      "utf8"
    );
    assert.match(userSvcSrc, /export const getMyProfile = async \(options = \{\}\)/);
    assert.match(userSvcSrc, /params\.tournament_id = options\.tournamentId/);
    assert.match(userSvcSrc, /export const getUserProfile = async \(userId, options = \{\}\)/);
  });

  // =========================================================================
  // 6. Route Prefetch Alignment
  // =========================================================================
  it("Test 10: routePrefetch.js targets canonical MyProfile route", async () => {
    const prefetchSrc = await readFile(
      new URL("../../router/routePrefetch.js", import.meta.url),
      "utf8"
    );
    assert.match(prefetchSrc, /const loadMyProfilePage = \(\) => import\("\.\.\/pages\/profile\/MyProfile"\)/);
    assert.match(prefetchSrc, /const loadProfilePage = loadMyProfilePage/);
    assert.match(prefetchSrc, /\["\/profile",\s*loadMyProfilePage\]/);
  });
});
