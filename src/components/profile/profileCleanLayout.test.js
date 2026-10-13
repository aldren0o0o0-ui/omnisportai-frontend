import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Profile Clean Layout Implementation Verification", async (t) => {
  const profileViewSrc = await readFile(
    new URL("./ProfileView.jsx", import.meta.url),
    "utf8"
  );
  const profileHeaderSrc = await readFile(
    new URL("./ProfileHeader.jsx", import.meta.url),
    "utf8"
  );
  const myProfileSrc = await readFile(
    new URL("../../pages/profile/MyProfile.jsx", import.meta.url),
    "utf8"
  );

  await t.test("ProfileView enforces approved hierarchy sections", () => {
    // 1. Identity
    assert.match(profileViewSrc, /<ProfileHeader/);

    // 2. Current workspace
    assert.match(profileViewSrc, /Current workspace/);
    assert.match(profileViewSrc, /selectedTournamentId/);

    // 3. Profile information
    assert.match(profileViewSrc, /Profile information/);
    assert.match(profileViewSrc, /Email/);
    assert.match(profileViewSrc, /Department/);
    assert.match(profileViewSrc, /Role/);
    assert.match(profileViewSrc, /Account status/);

    // 4. Intramural activity
    assert.match(profileViewSrc, /Intramural activity/);
    assert.match(profileViewSrc, /Selected intramural/);
    assert.match(profileViewSrc, /Sports participation/);
    assert.match(profileViewSrc, /Teams & entries/);

    // 5. Account actions
    assert.match(profileViewSrc, /Account/);
    assert.match(profileViewSrc, /Edit profile/);
    assert.match(profileViewSrc, /Account & security/);
  });

  await t.test("ProfileView uses dividers and chevrons instead of card containers", () => {
    // Dividers
    assert.match(profileViewSrc, /divide-y/);
    assert.match(profileViewSrc, /border-y/);

    // Right-facing chevrons
    assert.match(profileViewSrc, /ChevronRight/);
  });

  await t.test("ProfileHeader does not use bulky card borders or backgrounds", () => {
    // No large card wrapper in header
    assert.doesNotMatch(profileHeaderSrc, /rounded-2xl border border-\[var\(--border-soft\)\] bg-\[var\(--surface-soft\)\] p-4 sm:p-5/);
    assert.match(profileHeaderSrc, /data-testid="profile-header"/);
    assert.match(profileHeaderSrc, /data-testid="edit-profile-button"/);
  });

  await t.test("MyProfile uses comfortable readable width container", () => {
    assert.match(myProfileSrc, /max-w-3xl/);
    assert.match(myProfileSrc, /<ProfileView\s+mode="self"\s*\/>/);
  });
});
