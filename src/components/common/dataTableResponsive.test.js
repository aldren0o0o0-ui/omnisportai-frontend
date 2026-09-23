import assert from "node:assert/strict";
import test from "node:test";
import { responsiveColumnClass } from "./dataTableResponsive.js";

test("table priority maps to mobile-first visibility", () => {
  assert.equal(responsiveColumnClass({ priority: 1 }), "");
  assert.equal(responsiveColumnClass({ priority: 2 }), "hidden sm:table-cell");
  assert.equal(responsiveColumnClass({ priority: 3 }), "hidden lg:table-cell");
});

test("explicit visibility breakpoint is supported", () => {
  assert.equal(responsiveColumnClass({ hideBelow: "md" }), "hidden md:table-cell");
  assert.equal(responsiveColumnClass({ hideBelow: "xl" }), "hidden xl:table-cell");
});

