import assert from "node:assert/strict";
import test from "node:test";

test("access token survives a module reload in the current browser tab", async () => {
  const values = new Map();
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  };
  const first = await import(`./tokenStore.js?first=${Date.now()}`);
  first.setAccessToken("test-access-token");
  const reloaded = await import(`./tokenStore.js?reload=${Date.now()}`);
  assert.equal(reloaded.getAccessToken(), "test-access-token");
  reloaded.setAccessToken(null);
  assert.equal(values.size, 0);
  delete globalThis.window;
});

