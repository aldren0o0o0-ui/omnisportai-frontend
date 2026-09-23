import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRuleDraftValues,
  configurationOverrides,
  getRuleGovernanceActions,
  normalizeRuleFieldValue,
  ruleManagementThemeClasses,
} from "./src/utils/ruleGovernanceUi.js";

test("Coordinator receives lifecycle actions and Facilitator cannot approve", () => {
  assert.equal(
    getRuleGovernanceActions({
      status: "PENDING_APPROVAL",
      isCoordinator: true,
      isAssignedFacilitator: false,
    }).approve,
    true
  );
  assert.equal(
    getRuleGovernanceActions({
      status: "PENDING_APPROVAL",
      isCoordinator: false,
      isAssignedFacilitator: true,
    }).approve,
    false
  );
});

test("Read-only roles receive no mutation controls", () => {
  const actions = getRuleGovernanceActions({
    status: "DRAFT",
    isCoordinator: false,
    isAssignedFacilitator: false,
  });
  assert.equal(Object.values(actions).some(Boolean), false);
});

test("Dynamic values use standard defaults and only meaningful changes persist", () => {
  const standard = {
    default_rules: { period_duration_minutes: 10 },
    configurable_schema: {
      period_duration_minutes: { type: "integer" },
      timeout_limit: { type: "integer" },
    },
  };
  const values = buildRuleDraftValues(standard, {
    configuration: { timeout_limit: 2 },
  });
  assert.deepEqual(values, {
    period_duration_minutes: 10,
    timeout_limit: 2,
  });
  assert.deepEqual(configurationOverrides(standard, values), {
    timeout_limit: 2,
  });
});

test("Schema value normalization supports safe controls without raw JSON", () => {
  assert.equal(normalizeRuleFieldValue({ type: "integer" }, "21"), 21);
  assert.equal(normalizeRuleFieldValue({ type: "duration" }, "10"), 10);
  assert.equal(normalizeRuleFieldValue({ type: "decimal" }, "1.5"), 1.5);
  assert.equal(normalizeRuleFieldValue({ type: "boolean" }, true), true);
});

test("Theme contract includes both light and dark tokens", () => {
  assert.match(ruleManagementThemeClasses, /bg-white/);
  assert.match(ruleManagementThemeClasses, /dark:bg-slate-950/);
  assert.match(ruleManagementThemeClasses, /dark:text-white/);
});
