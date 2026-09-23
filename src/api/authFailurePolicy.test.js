import assert from "node:assert/strict";
import test from "node:test";

import { isDefinitiveAuthFailure } from "./authFailurePolicy.js";

test("only explicit authentication rejection expires a session", () => {
  assert.equal(isDefinitiveAuthFailure({ response: { status: 401 } }), true);
  assert.equal(isDefinitiveAuthFailure({ response: { status: 403 } }), true);
});

test("network and server failures preserve the session for recovery", () => {
  assert.equal(isDefinitiveAuthFailure({ request: {} }), false);
  assert.equal(isDefinitiveAuthFailure({ response: { status: 500 } }), false);
  assert.equal(isDefinitiveAuthFailure({ response: { status: 503 } }), false);
});

