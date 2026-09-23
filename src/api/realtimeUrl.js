export const resolveMatchWebSocketBaseUrl = ({
  explicitWebSocketUrl = "",
  apiUrl = "http://localhost:8000",
  browserOrigin = "http://localhost",
} = {}) => {
  const explicit = String(explicitWebSocketUrl || "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const normalizedApiUrl = String(apiUrl || "http://localhost:8000").trim();
  const parsed = new URL(normalizedApiUrl, browserOrigin);
  parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  return parsed.toString().replace(/\/+$/, "");
};

export const resolveEffectiveApiUrl = ({
  explicitApiUrl = "",
  browserOrigin = "http://localhost",
} = {}) => {
  const rawApiUrl = String(explicitApiUrl || "http://localhost:8000").trim();
  try {
    const parsedApi = new URL(rawApiUrl, browserOrigin);
    const parsedBrowser = new URL(browserOrigin);
    const isLoopback = (host) =>
      host === "localhost" || host === "127.0.0.1" || host === "[::1]";

    // If the configured API URL targets loopback (common in dev .env), but the client
    // is accessing the app from an external LAN host/IP (e.g. 10.89.99.88),
    // align the API host with the browser's hostname so requests reach the server.
    if (isLoopback(parsedApi.hostname) && !isLoopback(parsedBrowser.hostname) && parsedBrowser.hostname) {
      parsedApi.hostname = parsedBrowser.hostname;
      parsedApi.protocol = parsedBrowser.protocol;
    }
    return parsedApi.toString().replace(/\/+$/, "");
  } catch {
    return rawApiUrl.replace(/\/+$/, "");
  }
};

export const resolveBackendRuntimeUrls = ({
  explicitApiUrl = "",
  explicitWebSocketUrl = "",
  browserOrigin = "http://localhost",
} = {}) => {
  const apiBaseUrl = resolveEffectiveApiUrl({
    explicitApiUrl,
    browserOrigin,
  });
  return {
    apiBaseUrl,
    webSocketBaseUrl: resolveMatchWebSocketBaseUrl({
      explicitWebSocketUrl,
      apiUrl: apiBaseUrl,
      browserOrigin,
    }),
  };
};

const runtimeEnvironment = import.meta.env || {};

export const BACKEND_RUNTIME_URLS = resolveBackendRuntimeUrls({
  explicitApiUrl: runtimeEnvironment.VITE_API_BASE_URL || runtimeEnvironment.VITE_API_URL,
  explicitWebSocketUrl: runtimeEnvironment.VITE_WS_BASE_URL,
  browserOrigin: typeof window !== "undefined" ? window.location.origin : "http://localhost",
});
