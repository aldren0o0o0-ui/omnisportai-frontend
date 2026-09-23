import test from "node:test";
import assert from "node:assert/strict";

import { deriveSessionAuthority } from "../sessionSelectors.js";

test("authentication expiry fails scoring authority closed", () => {
  assert.deepEqual(deriveSessionAuthority({ socketStatus: "auth_required" }), {
    isAuthenticatedForScoring: false,
    canSubmitSessionActions: false,
  });
});

test("pending event and undo operations serialize session commands", () => {
  assert.equal(deriveSessionAuthority({ socketStatus: "live", isSubmitting: true }).canSubmitSessionActions, false);
  assert.equal(deriveSessionAuthority({ socketStatus: "live", isUndoing: true }).canSubmitSessionActions, false);
  assert.equal(deriveSessionAuthority({ socketStatus: "live" }).canSubmitSessionActions, true);
});
