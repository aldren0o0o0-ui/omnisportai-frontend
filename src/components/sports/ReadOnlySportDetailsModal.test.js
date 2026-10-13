import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const modalSource = await readFile(new URL("./ReadOnlySportDetailsModal.jsx", import.meta.url), "utf8");
const sportsPageSource = await readFile(new URL("../../pages/coordinator/Sports.jsx", import.meta.url), "utf8");

test("ReadOnlySportDetailsModal provides read-only sports details and rules overview", () => {
  assert.match(modalSource, /ReadOnlySportDetailsContent/);
  assert.match(modalSource, /ReadOnlySportDetailsModal/);
  assert.match(modalSource, /Official Sport Governance & Principles/);
  assert.match(modalSource, /Standings & Points System/);
  assert.match(modalSource, /Roster & Team Composition/);
  assert.match(modalSource, /Timing & Match Limits/);
});

test("Sports page mounts ReadOnlySportDetailsContent instead of RuleGovernancePage for viewing sport rules", () => {
  assert.match(sportsPageSource, /ReadOnlySportDetailsContent/);
  assert.match(sportsPageSource, /ReadOnlySportDetailsModal/);
  assert.doesNotMatch(sportsPageSource, /<RuleGovernancePage/);
  assert.match(sportsPageSource, /Rules for future Intramurals/);
  assert.match(sportsPageSource, /View rules & details/);
});
