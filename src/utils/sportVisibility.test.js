import test from "node:test";
import assert from "node:assert/strict";
import { isHiddenSport, filterVisibleSports } from "./sportVisibility.js";

test("identifies hidden sports correctly", () => {
  // Football / Soccer
  assert.equal(isHiddenSport({ name: "Football" }), true);
  assert.equal(isHiddenSport({ name: "Football 11v11" }), true);
  assert.equal(isHiddenSport({ template_id: "football_11v11" }), true);
  assert.equal(isHiddenSport({ name: "Soccer" }), true);
  assert.equal(isHiddenSport("football"), true);

  // Handball
  assert.equal(isHiddenSport({ name: "Handball" }), true);
  assert.equal(isHiddenSport({ name: "Hand Ball" }), true);
  assert.equal(isHiddenSport({ template_id: "handball_7v7" }), true);
  assert.equal(isHiddenSport("handball"), true);

  // Baseball
  assert.equal(isHiddenSport({ name: "Baseball" }), true);
  assert.equal(isHiddenSport({ template_id: "baseball_9v9" }), true);
  assert.equal(isHiddenSport("baseball"), true);

  // Beach Volleyball
  assert.equal(isHiddenSport({ name: "Beach Volleyball" }), true);
  assert.equal(isHiddenSport({ name: "Beach Volleyball 2v2" }), true);
  assert.equal(isHiddenSport({ template_id: "beach_volleyball_2v2" }), true);
  assert.equal(isHiddenSport("beach_volleyball"), true);

  // Archery
  assert.equal(isHiddenSport({ name: "Archery" }), true);
  assert.equal(isHiddenSport({ name: "Archery Recurve Individual" }), true);
  assert.equal(isHiddenSport({ template_id: "archery_recurve_individual" }), true);
  assert.equal(isHiddenSport("archery"), true);
});

test("keeps other sports visible and unaffected", () => {
  // Indoor Volleyball must NOT be hidden
  assert.equal(isHiddenSport({ name: "Volleyball" }), false);
  assert.equal(isHiddenSport({ name: "Volleyball 6v6" }), false);
  assert.equal(isHiddenSport({ template_id: "volleyball_6v6" }), false);
  assert.equal(isHiddenSport("volleyball"), false);

  // Basketball
  assert.equal(isHiddenSport({ name: "Basketball" }), false);
  assert.equal(isHiddenSport({ template_id: "basketball_5v5" }), false);

  // Badminton
  assert.equal(isHiddenSport({ name: "Badminton" }), false);

  // Table Tennis
  assert.equal(isHiddenSport({ name: "Table Tennis" }), false);

  // Sepak Takraw
  assert.equal(isHiddenSport({ name: "Sepak Takraw" }), false);

  // Tennis
  assert.equal(isHiddenSport({ name: "Tennis" }), false);

  // Boxing
  assert.equal(isHiddenSport({ name: "Boxing" }), false);

  // Athletics / Running
  assert.equal(isHiddenSport({ name: "Athletics" }), false);
  assert.equal(isHiddenSport({ name: "Running" }), false);

  // Swimming
  assert.equal(isHiddenSport({ name: "Swimming" }), false);

  // Chess
  assert.equal(isHiddenSport({ name: "Chess" }), false);
});

test("filters arrays correctly", () => {
  const sports = [
    { id: 1, name: "Basketball" },
    { id: 2, name: "Football" },
    { id: 3, name: "Volleyball" },
    { id: 4, name: "Beach Volleyball" },
    { id: 5, name: "Handball" },
    { id: 6, name: "Baseball" },
    { id: 7, name: "Archery" },
    { id: 8, name: "Chess" },
  ];

  const visible = filterVisibleSports(sports);
  assert.deepEqual(
    visible.map((s) => s.name),
    ["Basketball", "Volleyball", "Chess"]
  );
});
