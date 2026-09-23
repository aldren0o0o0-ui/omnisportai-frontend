import assert from "node:assert/strict";
import test from "node:test";

import { getIssueQuickActions } from "./scheduleHelpers.js";

test("venue issue actions open the selected Intramural venue settings", () => {
  const actions = getIssueQuickActions(
    {
      fix_targets: [{ type: "venues" }],
    },
    36
  );

  assert.equal(actions[0]?.label, "Open Venues");
  assert.equal(
    actions[0]?.route,
    "/coordinator/intramurals/36/settings/venues"
  );
});
