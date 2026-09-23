import assert from "node:assert/strict";
import test from "node:test";

import {
  beginTrackedRequest,
  completeTrackedRequest,
  getActiveRequestCount,
  prepareTrackedRetry,
  subscribeToRequestActivity,
} from "./requestActivity.js";

test("request activity tracks each request exactly once", () => {
  const config = {};
  const snapshots = [];
  const unsubscribe = subscribeToRequestActivity(() => {
    snapshots.push(getActiveRequestCount());
  });

  beginTrackedRequest(config);
  beginTrackedRequest(config);
  assert.equal(getActiveRequestCount(), 1);

  completeTrackedRequest(config);
  completeTrackedRequest(config);
  assert.equal(getActiveRequestCount(), 0);
  assert.deepEqual(snapshots, [1, 0]);

  unsubscribe();
});

test("a retried request remains balanced", () => {
  const config = {};
  beginTrackedRequest(config);
  prepareTrackedRetry(config);
  beginTrackedRequest(config);
  assert.equal(getActiveRequestCount(), 1);
  completeTrackedRequest(config);
  assert.equal(getActiveRequestCount(), 0);
});

test("background refreshes do not block route rendering", () => {
  const config = { omnisportBackground: true };
  beginTrackedRequest(config);
  assert.equal(getActiveRequestCount(), 0);
  completeTrackedRequest(config);
  assert.equal(getActiveRequestCount(), 0);
});
