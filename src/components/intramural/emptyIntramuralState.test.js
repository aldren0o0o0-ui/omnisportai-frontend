import test from "node:test";
import assert from "node:assert/strict";
import {
  getDisplayName,
  getEmptyIntramuralPresentation,
} from "./emptyIntramuralPresentation.js";

test("getDisplayName extracts first name, full name first part, or username", () => {
  assert.equal(getDisplayName({ first_name: "Sarah" }), "Sarah");
  assert.equal(getDisplayName({ name: "Michael Chang" }), "Michael");
  assert.equal(getDisplayName({ full_name: "Elena Rostova" }), "Elena");
  assert.equal(getDisplayName({ username: "alex99" }), "alex99");
  assert.equal(getDisplayName(null), "");
  assert.equal(getDisplayName({}), "");
});

test("sports coordinator with available intramurals shows create button and history", () => {
  const result = getEmptyIntramuralPresentation({
    isCoordinator: true,
    hasAvailableIntramurals: true,
  });

  assert.equal(result.mode, "coordinator");
  assert.equal(result.showCreateButton, true);
  assert.equal(result.showHistoryButton, true);
  assert.match(result.description, /No intramural is currently selected/);
});

test("sports coordinator with no intramurals shows create button but no history", () => {
  const result = getEmptyIntramuralPresentation({
    isCoordinator: true,
    hasAvailableIntramurals: false,
  });

  assert.equal(result.mode, "coordinator");
  assert.equal(result.showCreateButton, true);
  assert.equal(result.showHistoryButton, false);
  assert.match(result.description, /No intramural tournament has been set up yet/);
});

test("non-coordinator when intramurals exist shows only top bar select prompt", () => {
  const result = getEmptyIntramuralPresentation({
    isCoordinator: false,
    hasAvailableIntramurals: true,
  });

  assert.equal(result.mode, "select_topbar");
  assert.equal(result.showCreateButton, false);
  assert.match(result.description, /select an intramural from the app top bar/i);
});

test("non-coordinator when NO intramurals exist shows only no current intramural message", () => {
  const result = getEmptyIntramuralPresentation({
    isCoordinator: false,
    hasAvailableIntramurals: false,
  });

  assert.equal(result.mode, "no_intramural");
  assert.equal(result.showCreateButton, false);
  assert.match(result.description, /no intramural tournament active or scheduled/i);
});
