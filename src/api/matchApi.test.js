import assert from "node:assert/strict";
import test from "node:test";

import { resolveBackendRuntimeUrls, resolveMatchWebSocketBaseUrl } from "./realtimeUrl.js";

test("live scoring WebSocket follows the configured API host and port", () => {
  assert.equal(
    resolveMatchWebSocketBaseUrl({
      explicitWebSocketUrl: "",
      apiUrl: "http://localhost:8001",
    }),
    "ws://localhost:8001"
  );
  assert.equal(
    resolveMatchWebSocketBaseUrl({
      explicitWebSocketUrl: "",
      apiUrl: "https://sports.example.test/api",
    }),
    "wss://sports.example.test/api"
  );
});

test("an explicit WebSocket URL remains supported", () => {
  assert.equal(
    resolveMatchWebSocketBaseUrl({
      explicitWebSocketUrl: "wss://live.example.test/",
      apiUrl: "https://sports.example.test",
    }),
    "wss://live.example.test"
  );
});

test("REST and WebSocket origins resolve through one runtime configuration", () => {
  assert.deepEqual(
    resolveBackendRuntimeUrls({
      explicitApiUrl: "http://127.0.0.1:8011/",
      explicitWebSocketUrl: "",
    }),
    {
      apiBaseUrl: "http://127.0.0.1:8011",
      webSocketBaseUrl: "ws://127.0.0.1:8011",
    }
  );
});

test("REST and WebSocket origins dynamically align to browser LAN host", () => {
  assert.deepEqual(
    resolveBackendRuntimeUrls({
      explicitApiUrl: "http://localhost:8001",
      explicitWebSocketUrl: "",
      browserOrigin: "http://10.89.99.88:5173",
    }),
    {
      apiBaseUrl: "http://10.89.99.88:8001",
      webSocketBaseUrl: "ws://10.89.99.88:8001",
    }
  );
});

