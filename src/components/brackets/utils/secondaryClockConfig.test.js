import test from "node:test";
import assert from "node:assert/strict";

import { getSecondaryClockConfig, getSecondaryClockSuggestion } from "./secondaryClockConfig.js";

test("Basketball made shots automatically reset the shot clock to 24 seconds", () => {
  const profile = getSecondaryClockConfig({ sportKey: "basketball", validatedConfig: { controls: [] } });

  assert.equal(profile.enabled, true);
  for (const eventType of ["FREE_THROW", "TWO_PT_MADE", "THREE_PT_MADE"]) {
    assert.deepEqual(getSecondaryClockSuggestion({ profile, eventType }), {
      mode: "auto",
      seconds: 24,
      reason: "Automatic reset",
    });
  }
});

test("Basketball violations retain the governed 14-second review suggestion", () => {
  const profile = getSecondaryClockConfig({ sportKey: "basketball", validatedConfig: { controls: [] } });

  assert.deepEqual(getSecondaryClockSuggestion({ profile, eventType: "FOUL" }), {
    mode: "suggest",
    seconds: 14,
    reason: "Suggested reset",
  });
});

test("non-Basketball sports do not receive a fallback shot clock", () => {
  const profile = getSecondaryClockConfig({ sportKey: "football", validatedConfig: { controls: [] } });

  assert.equal(profile.enabled, false);
});
