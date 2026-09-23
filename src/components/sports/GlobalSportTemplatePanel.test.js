import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const panelSource = await readFile(new URL("./GlobalSportTemplatePanel.jsx", import.meta.url), "utf8");
const sportsPageSource = await readFile(new URL("../../pages/coordinator/Sports.jsx", import.meta.url), "utf8");
const serviceSource = await readFile(new URL("../../services/sportService.js", import.meta.url), "utf8");

test("Coordinator Sports page exposes one reusable global defaults panel", () => {
  assert.match(sportsPageSource, /GlobalSportTemplatePanel/);
  assert.match(sportsPageSource, /Configure Sport/);
  assert.match(sportsPageSource, /Existing competitions are not changed/);
});

test("global defaults UI uses operational language and fixed participant sizes", () => {
  assert.match(panelSource, /Competition type/);
  assert.match(panelSource, /Players per entry/);
  assert.match(panelSource, /1 athlete/);
  assert.match(panelSource, /2 athletes/);
  assert.match(panelSource, /Minimum approved entries required/);
  assert.match(panelSource, /Optional competition defaults/);
  assert.match(panelSource, /Suggested competition format/);
  assert.match(panelSource, /Suggested participant ordering/);
  assert.doesNotMatch(panelSource, />participant_shape</);
  assert.doesNotMatch(panelSource, />capability_variant/);
});

test("Sports cleanup keeps advanced operations secondary and removes unsupported creation claims", () => {
  assert.match(sportsPageSource, /Rules for future Intramurals/);
  assert.match(sportsPageSource, /Add Supported Sport/);
  assert.doesNotMatch(sportsPageSource, /Advanced manual sport setup/);
  assert.doesNotMatch(sportsPageSource, /Set Sport Rules/);
  assert.doesNotMatch(sportsPageSource, />Teams<\/th>/);
  assert.match(sportsPageSource, /Match Timing Defaults/);
  assert.match(sportsPageSource, /Existing scheduled matches are not automatically moved/);
});

test("global configuration uses coherent read, atomic save, and reset operations", () => {
  assert.match(serviceSource, /\/configuration`/);
  assert.match(serviceSource, /\/configuration\/reset`/);
  assert.match(panelSource, /Save Changes/);
  assert.match(panelSource, /Reset to System Defaults/);
});
