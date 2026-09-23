import test from "node:test";
import assert from "node:assert/strict";

import { validateEventConfig } from "./sportTemplateValidator.js";

test("governed template validation reports schema errors without throwing", () => {
  const result = validateEventConfig({
    sport_id: "basketball",
    template_version: "g1.1",
    ui_schema_version: "1.0.0",
    sport_profile: "POINT_GAME",
    match_type: "SCORE",
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes("ui_schema_version")));
  assert.ok(result.errors.some((message) => message.includes("render_schema.version")));
});
