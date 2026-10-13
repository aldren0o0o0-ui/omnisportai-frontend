import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  resolveRolePrefix,
  resolveMySettingsPath,
  resolveBackSettingsRoute,
} from "../../utils/settingsNavigation.js";

test("OmniSport AI — Settings Redesign & Information Architecture Verification", async (t) => {
  const settingsPageSrc = await readFile(
    new URL("../../pages/settings/SettingsPage.jsx", import.meta.url),
    "utf8"
  );
  const notificationPrefSrc = await readFile(
    new URL("../../pages/shared/NotificationPreferences.jsx", import.meta.url),
    "utf8"
  );
  const appearancePageSrc = await readFile(
    new URL("../../pages/settings/AppearancePage.jsx", import.meta.url),
    "utf8"
  );
  const aboutPageSrc = await readFile(
    new URL("../../pages/settings/AboutPage.jsx", import.meta.url),
    "utf8"
  );
  const appSrc = await readFile(
    new URL("../../App.jsx", import.meta.url),
    "utf8"
  );
  const topHeaderSrc = await readFile(
    new URL("../../components/layout/AppTopHeader.jsx", import.meta.url),
    "utf8"
  );

  await t.test("Main Settings page contains ONLY the 4 approved sections", () => {
    // 1. Notifications
    assert.match(settingsPageSrc, /Notifications/);
    assert.match(settingsPageSrc, /Notification Settings/);
    assert.match(settingsPageSrc, /Manage how OmniSport AI notifies you\./);

    // 2. Preferences
    assert.match(settingsPageSrc, /Preferences/);
    assert.match(settingsPageSrc, /Appearance/);
    assert.match(settingsPageSrc, /Manage display and theme preferences\./);

    // 3. Account
    assert.match(settingsPageSrc, /Account/);
    assert.match(settingsPageSrc, /Edit Profile/);
    assert.match(settingsPageSrc, /Account & Security/);

    // 4. System
    assert.match(settingsPageSrc, /System/);
    assert.match(settingsPageSrc, /About OmniSport AI/);
    assert.match(settingsPageSrc, /View application information\./);

    // EXPLICITLY NO "Sound & Alerts" or speculative settings
    assert.doesNotMatch(settingsPageSrc, /Sound\s*(&|and)?\s*Alerts/i);
    assert.doesNotMatch(settingsPageSrc, /Two-factor/i);
    assert.doesNotMatch(settingsPageSrc, /Connected devices/i);
    assert.doesNotMatch(settingsPageSrc, /Data export/i);
  });

  await t.test("Main Settings page uses flat list rows, chevrons, and readable width", () => {
    assert.match(settingsPageSrc, /max-w-3xl/);
    assert.match(settingsPageSrc, /divide-y/);
    assert.match(settingsPageSrc, /border-y/);
    assert.match(settingsPageSrc, /ChevronRight/);

    // Test IDs
    assert.match(settingsPageSrc, /data-testid="settings-notifications-row"/);
    assert.match(settingsPageSrc, /data-testid="settings-appearance-row"/);
    assert.match(settingsPageSrc, /data-testid="settings-edit-profile-row"/);
    assert.match(settingsPageSrc, /data-testid="settings-account-security-row"/);
    assert.match(settingsPageSrc, /data-testid="settings-about-row"/);
  });

  await t.test("NotificationPreferences uses flat list rows instead of large card containers", () => {
    // Back navigation
    assert.match(notificationPrefSrc, /data-testid="back-to-settings-button"/);
    assert.match(notificationPrefSrc, /Back to settings/);

    // Readable width
    assert.match(notificationPrefSrc, /max-w-3xl/);
    assert.match(notificationPrefSrc, /divide-y/);
    assert.match(notificationPrefSrc, /border-y/);

    // Does NOT use bulky card wrappers
    assert.doesNotMatch(notificationPrefSrc, /<DashboardCard/);
    assert.doesNotMatch(notificationPrefSrc, /<PageHeaderCard/);

    // Core functionality preserved
    assert.match(notificationPrefSrc, /data-testid="in-app-notifications-row"/);
    assert.match(notificationPrefSrc, /Always active/);

    assert.match(notificationPrefSrc, /data-testid="match-reminders-toggle"/);
    assert.match(notificationPrefSrc, /data-testid="reminder-time-select"/);
    assert.match(notificationPrefSrc, /data-testid="browser-notifications-toggle"/);

    // EXPLICITLY NO "Sound & Alerts"
    assert.doesNotMatch(notificationPrefSrc, /Sound\s*(&|and)?\s*Alerts/i);
  });

  await t.test("AppearancePage provides dark/light theme management", () => {
    assert.match(appearancePageSrc, /data-testid="back-to-settings-button"/);
    assert.match(appearancePageSrc, /max-w-3xl/);
    assert.match(appearancePageSrc, /data-testid="theme-dark-option"/);
    assert.match(appearancePageSrc, /data-testid="theme-light-option"/);
    assert.match(appearancePageSrc, /useTheme/);
  });

  await t.test("AboutPage provides clean system release details", () => {
    assert.match(aboutPageSrc, /data-testid="back-to-settings-button"/);
    assert.match(aboutPageSrc, /max-w-3xl/);
    assert.match(aboutPageSrc, /OmniSport AI/);
    assert.match(aboutPageSrc, /v1\.0\.0/);
  });

  await t.test("settingsNavigation resolves roles and back routes accurately", () => {
    assert.equal(resolveRolePrefix(["SPORTS_COORDINATOR"]), "coordinator");
    assert.equal(resolveRolePrefix(["DEPARTMENT_MANAGER"]), "department");
    assert.equal(resolveRolePrefix(["SPORTS_FACILITATOR"]), "sport-facilitator");
    assert.equal(resolveRolePrefix(["COACH"]), "coach");
    assert.equal(resolveRolePrefix(["VIEWER"], true), "viewer");

    assert.equal(resolveMySettingsPath(["SPORTS_COORDINATOR"]), "/coordinator/settings");
    assert.equal(resolveMySettingsPath(["COACH"]), "/coach/settings");

    assert.equal(resolveBackSettingsRoute("/coordinator/settings/notifications"), "/coordinator/settings");
    assert.equal(resolveBackSettingsRoute("/department/settings/appearance"), "/department/settings");
  });

  await t.test("App.jsx and AppTopHeader.jsx route correctly to Settings", () => {
    assert.match(appSrc, /path="\/settings"/);
    assert.match(appSrc, /path="settings"/);
    assert.match(appSrc, /path="settings\/notifications"/);
    assert.match(appSrc, /path="settings\/appearance"/);
    assert.match(appSrc, /path="settings\/about"/);

    assert.match(topHeaderSrc, /data-testid="user-menu-settings-link"/);
    assert.match(topHeaderSrc, /to=\{`\/\$\{roleKey\}\/settings`\}/);
  });
});
