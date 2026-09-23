import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("route content is not coupled to global request activity or a settle timer", async () => {
  const source = await readFile(new URL("./RouteDataBoundary.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /subscribeToRequestActivity|useSyncExternalStore/);
  assert.doesNotMatch(source, /SETTLE_DELAY|setTimeout|getActiveRequestCount/);
  assert.match(source, /\{children\}/);
});
