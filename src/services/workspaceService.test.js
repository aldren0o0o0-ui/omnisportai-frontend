import assert from "node:assert/strict";
import test from "node:test";

import {
  WORKSPACE_LIST_CHANGED_EVENT,
  dispatchWorkspaceListChanged,
} from "./workspaceEvents.js";

test("workspace list changes publish the exact created Workspace and Tournament", () => {
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;
  let received = null;

  globalThis.CustomEvent = class {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  globalThis.window = {
    dispatchEvent(event) {
      received = event;
    },
  };

  try {
    const workspace = { id: 12, name: "New Intramural", status: "DRAFT" };
    const tournament = { id: 44, workspace_id: 12 };
    dispatchWorkspaceListChanged(workspace, tournament);

    assert.equal(received?.type, WORKSPACE_LIST_CHANGED_EVENT);
    assert.deepEqual(received?.detail, { workspace, tournament });
  } finally {
    globalThis.window = previousWindow;
    globalThis.CustomEvent = previousCustomEvent;
  }
});
