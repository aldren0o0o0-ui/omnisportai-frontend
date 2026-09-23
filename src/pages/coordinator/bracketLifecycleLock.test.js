import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./Brackets.jsx", import.meta.url), "utf8");

test("generated drafts are not included in the frontend regeneration lock statuses", () => {
  assert.match(
    source,
    /\["ACTIVE", "FINALIZED", "COMPLETED"\]\.includes\(String\(entry\?\.status/,
  );
  assert.doesNotMatch(
    source,
    /\["ACTIVE", "FINALIZED", "COMPLETED", "GENERATED"\]/,
  );
});

test("activation lock copy describes the lifecycle boundary accurately", () => {
  assert.match(
    source,
    /Bracket locked after activation\. Regeneration and format changes are disabled to protect official match progression\./,
  );
  assert.doesNotMatch(
    source,
    /Format locked because official Match activity has been recorded/,
  );
});

test("format-change confirmation explicitly describes an unactivated draft", () => {
  assert.match(
    source,
    /Changing the format will regenerate this unactivated draft bracket\. Continue\?/,
  );
});
