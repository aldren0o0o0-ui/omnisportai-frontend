import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveBackProfileRoute, resolveMyProfilePath } from "../../utils/profileNavigation.js";

test("Phase 2 Account Management: Edit Profile & Security Architecture", async (t) => {
  const editProfileSrc = await readFile(
    new URL("../../pages/profile/EditProfilePage.jsx", import.meta.url),
    "utf8"
  );
  const accountSecuritySrc = await readFile(
    new URL("../../pages/profile/AccountSecurityPage.jsx", import.meta.url),
    "utf8"
  );
  const profileViewSrc = await readFile(
    new URL("./ProfileView.jsx", import.meta.url),
    "utf8"
  );
  const appSrc = await readFile(
    new URL("../../App.jsx", import.meta.url),
    "utf8"
  );
  const authApiSrc = await readFile(
    new URL("../../api/authApi.js", import.meta.url),
    "utf8"
  );
  const userServiceSrc = await readFile(
    new URL("../../services/userService.js", import.meta.url),
    "utf8"
  );

  await t.test("EditProfilePage contains required layout, fields, and constraints", () => {
    // Back navigation
    assert.match(editProfileSrc, /data-testid="back-to-profile-button"/);
    assert.match(editProfileSrc, /Back to profile/);

    // Readable width container
    assert.match(editProfileSrc, /max-w-3xl/);

    // Form structure & editable fields
    assert.match(editProfileSrc, /Display name/);
    assert.match(editProfileSrc, /Bio \/ About/);
    assert.match(editProfileSrc, /Profile photo/);
    assert.match(editProfileSrc, /data-testid="save-profile-button"/);

    // Protected / read-only fields
    assert.match(editProfileSrc, /Primary institutional login identifier/);
    assert.match(editProfileSrc, /Managed by institutional administrator/);
    assert.match(editProfileSrc, /Assigned roles/);

    // Calls canonical user update services
    assert.match(editProfileSrc, /updateMyProfile/);
    assert.match(editProfileSrc, /uploadUserProfileImage/);
    assert.match(editProfileSrc, /removeUserProfileImage/);
  });

  await t.test("resolveBackProfileRoute correctly resolves role back paths", () => {
    assert.equal(resolveBackProfileRoute("/coordinator/profile/edit"), "/coordinator/profile");
    assert.equal(resolveBackProfileRoute("/department/profile/edit"), "/department/profile");
    assert.equal(resolveBackProfileRoute("/sport-facilitator/profile/edit"), "/sport-facilitator/profile");
    assert.equal(resolveBackProfileRoute("/coach/profile/edit"), "/coach/profile");
    assert.equal(resolveBackProfileRoute("/viewer/profile/edit"), "/viewer/profile");

    // Fallback from roles
    assert.equal(resolveBackProfileRoute("", ["SPORTS_COORDINATOR"]), "/coordinator/profile");
    assert.equal(resolveBackProfileRoute("", ["VIEWER"]), "/viewer/profile");
  });

  await t.test("resolveMyProfilePath handles redirects correctly", () => {
    assert.equal(resolveMyProfilePath(["SPORTS_COORDINATOR"]), "/coordinator/profile");
    assert.equal(resolveMyProfilePath(["DEPARTMENT_MANAGER"]), "/department/profile");
    assert.equal(resolveMyProfilePath(["SPORTS_FACILITATOR"]), "/sport-facilitator/profile");
    assert.equal(resolveMyProfilePath(["COACH"]), "/coach/profile");
    assert.equal(resolveMyProfilePath(["VIEWER"], true), "/viewer/profile");
  });

  await t.test("AccountSecurityPage contains password change, session notice, and signout", () => {
    // Back navigation
    assert.match(accountSecuritySrc, /data-testid="back-to-profile-button"/);
    assert.match(accountSecuritySrc, /Back to profile/);

    // Readable width
    assert.match(accountSecuritySrc, /max-w-3xl/);

    // Password change form
    assert.match(accountSecuritySrc, /Current password/);
    assert.match(accountSecuritySrc, /New password/);
    assert.match(accountSecuritySrc, /Confirm new password/);
    assert.match(accountSecuritySrc, /data-testid="change-password-button"/);

    // Active sessions section (no fake data, clear institutional notice)
    assert.match(accountSecuritySrc, /Active sessions/);
    assert.match(accountSecuritySrc, /Detailed multi-device fingerprinting/);
    assert.match(accountSecuritySrc, /data-testid="logout-all-button"/);

    // Sign out section
    assert.match(accountSecuritySrc, /data-testid="sign-out-device-button"/);
    assert.match(accountSecuritySrc, /Sign out of this device/);
  });

  await t.test("ProfileView wires actionable rows directly to /profile/edit and /profile/security", () => {
    assert.match(profileViewSrc, /data-testid="edit-profile-row"/);
    assert.match(profileViewSrc, /data-testid="account-security-row"/);
    assert.match(profileViewSrc, /navigate\(`\/\$\{rolePrefix\}\/profile\/edit`\)/);
    assert.match(profileViewSrc, /navigate\(`\/\$\{rolePrefix\}\/profile\/security`\)/);
  });

  await t.test("App.jsx registers all edit and security routes", () => {
    assert.match(appSrc, /path="\/profile\/edit"/);
    assert.match(appSrc, /path="\/profile\/security"/);
    assert.match(appSrc, /path="profile\/edit"/);
    assert.match(appSrc, /path="profile\/security"/);
  });

  await t.test("API clients export required changePassword and logoutAll functions", () => {
    assert.match(authApiSrc, /changePassword:\s*async/);
    assert.match(authApiSrc, /logoutAll:\s*async/);
    assert.match(userServiceSrc, /export const changeMyPassword/);
  });
});
