import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("./RehearsalSetup.jsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../../App.jsx", import.meta.url), "utf8");
const rulePage = readFileSync(new URL("../shared/RuleGovernancePage.jsx", import.meta.url), "utf8");
const setupUtils = readFileSync(new URL("../../utils/rehearsalSetup.js", import.meta.url), "utf8");

test("rehearsal setup is coordinator-routed and exposes the five guided steps", () => {
  assert.match(app, /path="rehearsal-setup"/);
  for (const label of ["Rules", "Governance", "Previous Intramural", "Rehearsal Dates", "Review"]) {
    assert.match(`${page}\n${setupUtils}`, new RegExp(label));
  }
});

test("institutional controls use backend schemas and do not contain selected sport-rule defaults", () => {
  assert.match(page, /confirmation_schema/);
  assert.match(page, /<option value="">Select\.\.\.<\/option>/);
  assert.doesNotMatch(page, /useState\([^)]*WORLD_BOXING/);
  assert.doesNotMatch(page, /useState\([^)]*BEST_OF_3_SETS/);
});

test("governance, adoption, date shift, and activation use existing service owners", () => {
  assert.match(page, /saveInstitutionalConfirmation/);
  assert.match(page, /RuleGovernancePage/);
  assert.match(page, /previewRuleProfileAdoption/);
  assert.match(page, /adoptRuleProfile/);
  assert.match(page, /previewTournamentDateShift/);
  assert.match(page, /transitionIntramuralLifecycle/);
});

test("same-shape Competition events remain individually selectable in rule governance", () => {
  assert.match(rulePage, /event\.event_name/);
  assert.doesNotMatch(rulePage, /seen\.has\(type\)/);
  assert.match(rulePage, /initialEventId/);
});

test("destructive governance actions retain explicit review modals", () => {
  for (const title of ["Adopt Governed Match Rules", "Shift Tournament Schedule", "Activate"]) {
    assert.match(page, new RegExp(title));
  }
});

test("selected-Intramural changes cannot be overwritten by stale readiness responses", () => {
  assert.match(page, /loadRequestRef/);
  assert.match(page, /requestId !== loadRequestRef\.current/);
});
