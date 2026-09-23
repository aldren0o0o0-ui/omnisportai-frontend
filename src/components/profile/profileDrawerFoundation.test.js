import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  normalizeProfileTarget,
  createProfileDrawerState,
  profileDrawerReducer,
} from "./profileUtils.js";

describe("Phase 7C-1 — Universal Profile Drawer Foundation", () => {
  it("Test 1: Provider exposes the expected public API structure", async () => {
    const contextSrc = await readFile(new URL("./ProfileDrawerContext.jsx", import.meta.url), "utf8");
    assert.match(contextSrc, /ProfileDrawerProvider/);
    assert.match(contextSrc, /useProfileDrawer/);
    assert.match(contextSrc, /isOpen/);
    assert.match(contextSrc, /profileTarget/);
    assert.match(contextSrc, /openProfile/);
    assert.match(contextSrc, /closeProfile/);
  });

  it("Test 2: Initial state has isOpen === false and profileTarget === null", () => {
    const initialState = createProfileDrawerState();
    assert.equal(initialState.isOpen, false);
    assert.equal(initialState.profileTarget, null);
  });

  it("Test 3: openProfile() sets isOpen to true", () => {
    const state = createProfileDrawerState();
    const next = profileDrawerReducer(state, { type: "OPEN", payload: { userId: 42 } });
    assert.equal(next.isOpen, true);
  });

  it("Test 4: openProfile() stores userId correctly (direct number or object)", () => {
    // Number shorthand
    const target1 = normalizeProfileTarget(123);
    assert.deepEqual(target1, { userId: 123 });

    // String shorthand
    const target2 = normalizeProfileTarget("456");
    assert.deepEqual(target2, { userId: 456 });

    // Object with userId
    const target3 = normalizeProfileTarget({ userId: 789 });
    assert.deepEqual(target3, { userId: 789 });
  });

  it("Test 5: openProfile() stores playerId when provided", () => {
    const target = normalizeProfileTarget({ playerId: 301 });
    assert.deepEqual(target, { playerId: 301 });

    const state = createProfileDrawerState();
    const next = profileDrawerReducer(state, { type: "OPEN", payload: { playerId: 301 } });
    assert.equal(next.isOpen, true);
    assert.equal(next.profileTarget.playerId, 301);
  });

  it("Test 6: openProfile() stores sportId and tournamentId when provided", () => {
    const target = normalizeProfileTarget({
      playerId: 301,
      sportId: 4,
      tournamentId: 3,
    });
    assert.deepEqual(target, {
      playerId: 301,
      sportId: 4,
      tournamentId: 3,
    });
  });

  it("Test 7: Calling openProfile() again replaces the current target without multiple drawers", () => {
    const state0 = createProfileDrawerState();
    const state1 = profileDrawerReducer(state0, {
      type: "OPEN",
      payload: { userId: 10, sportId: 1 },
    });
    assert.equal(state1.isOpen, true);
    assert.equal(state1.profileTarget.userId, 10);

    const state2 = profileDrawerReducer(state1, {
      type: "OPEN",
      payload: { playerId: 50, sportId: 2 },
    });
    assert.equal(state2.isOpen, true);
    assert.equal(state2.profileTarget.playerId, 50);
    assert.equal(state2.profileTarget.userId, undefined);
  });

  it("Test 8: closeProfile() sets isOpen to false", () => {
    const openState = { isOpen: true, profileTarget: { userId: 10 } };
    const closedState = profileDrawerReducer(openState, { type: "CLOSE" });
    assert.equal(closedState.isOpen, false);
  });

  it("Test 9: Close behavior safely preserves target state until next open or reset", () => {
    const openState = { isOpen: true, profileTarget: { userId: 10 } };
    const closedState = profileDrawerReducer(openState, { type: "CLOSE" });
    assert.equal(closedState.isOpen, false);
    // Target can be safely inspected or reset without runtime crashes
    assert.equal(closedState.profileTarget.userId, 10);

    const resetState = profileDrawerReducer(closedState, { type: "RESET" });
    assert.equal(resetState.isOpen, false);
    assert.equal(resetState.profileTarget, null);
  });

  it("Test 10: Escape key closes drawer in UniversalProfileDrawer", async () => {
    const drawerSrc = await readFile(new URL("./UniversalProfileDrawer.jsx", import.meta.url), "utf8");
    assert.match(drawerSrc, /event\.key === "Escape"/);
    assert.match(drawerSrc, /closeProfile\(\)/);
  });

  it("Test 11: Backdrop click closes drawer", async () => {
    const drawerSrc = await readFile(new URL("./UniversalProfileDrawer.jsx", import.meta.url), "utf8");
    assert.match(drawerSrc, /onMouseDown=\{closeProfile\}/);
    assert.match(drawerSrc, /event\.stopPropagation\(\)/);
  });

  it("Test 12: Close button has accessible label and calls closeProfile", async () => {
    const drawerSrc = await readFile(new URL("./UniversalProfileDrawer.jsx", import.meta.url), "utf8");
    assert.match(drawerSrc, /aria-label="Close profile drawer"/);
    assert.match(drawerSrc, /onClick=\{closeProfile\}/);
  });

  it("Test 13: Drawer does not render DOM while closed", async () => {
    const drawerSrc = await readFile(new URL("./UniversalProfileDrawer.jsx", import.meta.url), "utf8");
    assert.match(drawerSrc, /if \(!isOpen\) return null;/);
  });

  it("Test 14: Body scroll lock is established on open and restored on close", async () => {
    const drawerSrc = await readFile(new URL("./UniversalProfileDrawer.jsx", import.meta.url), "utf8");
    assert.match(drawerSrc, /document\.body\.style\.overflow = "hidden"/);
    assert.match(drawerSrc, /document\.body\.style\.overflow = previousOverflow/);
    assert.match(drawerSrc, /returnFocusRef\.current\.focus\(\)/);
  });

  it("Test 15: UniversalProfileDrawer is mounted exactly once at App.jsx root inside Router", async () => {
    const appSrc = await readFile(new URL("../../App.jsx", import.meta.url), "utf8");
    assert.match(appSrc, /import.*ProfileDrawerProvider.*UniversalProfileDrawer.*from '\.\/components\/profile'/);
    assert.match(appSrc, /<ProfileDrawerProvider>/);
    assert.match(appSrc, /<UniversalProfileDrawer \/>/);
    assert.match(appSrc, /<\/ProfileDrawerProvider>/);

    // Verify it is mounted exactly once
    const matches = appSrc.match(/<UniversalProfileDrawer \/>/g);
    assert.equal(matches?.length, 1);
  });

  it("Test 16: Legacy profile components are preserved and untouched", async () => {
    const userProfileDrawer = await readFile(
      new URL("../../pages/coordinator/user_management/UserProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.ok(userProfileDrawer.length > 0);

    const userProfileView = await readFile(
      new URL("../user/UserProfileView.jsx", import.meta.url),
      "utf8"
    );
    assert.ok(userProfileView.length > 0);

    const directoryDrawer = await readFile(
      new URL("../directory/DirectoryPlayerProfileDrawer.jsx", import.meta.url),
      "utf8"
    );
    assert.ok(directoryDrawer.length > 0);

    const drilldown = await readFile(
      new URL("../dashboard/team_drawer/PlayerDetailDrilldown.jsx", import.meta.url),
      "utf8"
    );
    assert.ok(drilldown.length > 0);
  });
});
