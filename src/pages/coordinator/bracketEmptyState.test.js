import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("all role bracket pages reuse the shared empty-state composition", () => {
  for (const path of [
    "../viewer/Brackets.jsx",
    "../sports_facilitator/Brackets.jsx",
    "../department/Brackets.jsx",
    "../coach/Brackets.jsx",
  ]) {
    assert.match(read(path), /CoordinatorBrackets/);
  }
});

test("brackets stay empty without an Intramural or generated bracket", () => {
  const source = read("./Brackets.jsx");
  assert.match(source, /if \(!selectedWorkspaceId\)/);
  assert.match(source, /"No Intramural selected"/);
  assert.match(source, /"No brackets yet"/);
  assert.match(source, /Generated brackets will appear here once they are created by the coordinator/);
  assert.match(source, /canManageBrackets && hasTournament/);
  assert.match(source, /setShowBracketSetup\(true\)/);
});
