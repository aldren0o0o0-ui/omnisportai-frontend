const FIREBASE_SDK_VERSION = String(import.meta.env.VITE_FIREBASE_SDK_VERSION || "10.13.2").trim();

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-omnisport-sdk="${src}"]`);
    if (existing) {
      if (existing.getAttribute("data-loaded") === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-omnisport-sdk", src);
    script.addEventListener("load", () => {
      script.setAttribute("data-loaded", "true");
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Failed to load script: ${src}`)));
    document.head.appendChild(script);
  });

const ensureFirebaseCompatLoaded = async () => {
  if (window.firebase?.messaging && window.firebase?.initializeApp) {
    return window.firebase;
  }
  const appUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app-compat.js`;
  const messagingUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-messaging-compat.js`;
  await loadScript(appUrl);
  await loadScript(messagingUrl);
  if (!window.firebase?.messaging || !window.firebase?.initializeApp) {
    throw new Error("Firebase SDK failed to initialize.");
  }
  return window.firebase;
};

export const isBrowserPushSupported = () =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

export const getBrowserNotificationPermission = () => {
  if (!isBrowserPushSupported()) return "unsupported";
  return Notification.permission || "default";
};

const getFirebaseWebConfig = () => ({
  apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY || "").trim(),
  authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "").trim(),
  projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID || "").trim(),
  messagingSenderId: String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "").trim(),
  appId: String(import.meta.env.VITE_FIREBASE_APP_ID || "").trim(),
});

const validateFirebaseConfig = (config) => {
  const required = ["apiKey", "authDomain", "projectId", "messagingSenderId", "appId"];
  const missing = required.filter((key) => !String(config[key] || "").trim());
  if (missing.length > 0) {
    throw new Error(`Missing Firebase web config: ${missing.join(", ")}`);
  }
};

const getVapidKey = () => String(import.meta.env.VITE_FIREBASE_VAPID_KEY || "").trim();

const ensureServiceWorkerRegistration = async () => {
  await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  return await navigator.serviceWorker.ready;
};

export const getStoredPushToken = () => {
  try {
    return String(window.localStorage.getItem("omnisport_push_token") || "").trim() || null;
  } catch {
    return null;
  }
};

const setStoredPushToken = (token) => {
  try {
    if (token) {
      window.localStorage.setItem("omnisport_push_token", String(token).trim());
      return;
    }
    window.localStorage.removeItem("omnisport_push_token");
  } catch {
    // Ignore storage failures.
  }
};

const getDeviceLabel = () => {
  const rawUa = String(navigator.userAgent || "").trim();
  if (!rawUa) return "Browser device";
  if (rawUa.includes("Edg/")) return "Edge browser";
  if (rawUa.includes("Chrome/")) return "Chrome browser";
  if (rawUa.includes("Firefox/")) return "Firefox browser";
  if (rawUa.includes("Safari/") && !rawUa.includes("Chrome/")) return "Safari browser";
  return "Browser device";
};

export const requestBrowserPushToken = async () => {
  if (!isBrowserPushSupported()) {
    return {
      ok: false,
      code: "unsupported",
      message: "This browser does not support push notifications.",
      permission: "unsupported",
      token: null,
      deviceLabel: null,
      browserName: null,
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      code: permission === "denied" ? "denied" : "not_granted",
      message:
        permission === "denied"
          ? "Browser notification permission was denied."
          : "Browser notification permission was not granted.",
      permission,
      token: null,
      deviceLabel: null,
      browserName: null,
    };
  }

  const vapidKey = getVapidKey();
  if (!vapidKey) {
    return {
      ok: false,
      code: "missing_vapid",
      message: "Missing VITE_FIREBASE_VAPID_KEY configuration.",
      permission,
      token: null,
      deviceLabel: null,
      browserName: null,
    };
  }

  try {
    const firebase = await ensureFirebaseCompatLoaded();
    const config = getFirebaseWebConfig();
    validateFirebaseConfig(config);
    if (!Array.isArray(firebase.apps) || firebase.apps.length === 0) {
      firebase.initializeApp(config);
    }
    const messaging = firebase.messaging();
    const serviceWorkerRegistration = await ensureServiceWorkerRegistration();
    const token = await messaging.getToken({
      vapidKey,
      serviceWorkerRegistration,
    });
    const normalizedToken = String(token || "").trim();
    if (!normalizedToken) {
      return {
        ok: false,
        code: "empty_token",
        message: "No push token was returned by Firebase Messaging.",
        permission,
        token: null,
        deviceLabel: null,
        browserName: null,
      };
    }
    console.log("========== AUDIT STAGE 1: TOKEN GENERATION ==========");
    console.log("Firebase getToken() returned:", normalizedToken.substring(0, 30) + "...");
    console.log("Stored localStorage token:", (getStoredPushToken() || "(none)").substring(0, 30) + "...");
    console.log("Browser:", getDeviceLabel());
    console.log("User Agent:", navigator.userAgent?.substring(0, 80) || "?");
    console.log("Permission:", permission);
    console.log("=====================================================");
    setStoredPushToken(normalizedToken);
    return {
      ok: true,
      code: "registered",
      message: "Browser push token acquired.",
      permission,
      token: normalizedToken,
      deviceLabel: getDeviceLabel(),
      browserName: navigator.userAgent || null,
    };
  } catch (error) {
    return {
      ok: false,
      code: "token_error",
      message: error?.message || "Failed to retrieve browser push token.",
      permission,
      token: null,
      deviceLabel: null,
      browserName: null,
    };
  }
};

export const clearStoredPushToken = () => {
  setStoredPushToken(null);
};

export const syncCurrentBrowserPushToken = async () => {
  if (!isBrowserPushSupported()) {
    console.log("[PushSync] Browser push not supported");
    return { ok: false, reason: "unsupported" };
  }
  const permission = Notification.permission;
  if (permission !== "granted") {
    console.log("[PushSync] Permission not granted:", permission);
    return { ok: false, reason: `permission_${permission}` };
  }
  const vapidKey = getVapidKey();
  if (!vapidKey) {
    console.log("[PushSync] Missing VAPID key");
    return { ok: false, reason: "missing_vapid" };
  }
  try {
    const firebase = await ensureFirebaseCompatLoaded();
    const config = getFirebaseWebConfig();
    validateFirebaseConfig(config);
    if (!Array.isArray(firebase.apps) || firebase.apps.length === 0) {
      firebase.initializeApp(config);
    }
    const messaging = firebase.messaging();
    const serviceWorkerRegistration = await ensureServiceWorkerRegistration();
    const currentToken = await messaging.getToken({ vapidKey, serviceWorkerRegistration });
    const normalizedCurrent = String(currentToken || "").trim();
    if (!normalizedCurrent) {
      console.log("[PushSync] No current token from Firebase");
      return { ok: false, reason: "empty_token" };
    }
    const storedToken = getStoredPushToken();
    console.log("SYNC START");
    console.log("Stored:", storedToken);
    console.log("Firebase:", currentToken);
    if (normalizedCurrent === storedToken) {
      console.log("[PushSync] Token unchanged, no sync needed");
      return { ok: true, reason: "unchanged" };
    }
    console.log("[PushSync] Token changed, registering new token");
    const { registerPushToken } = await import("./notificationPreferenceService");
    await registerPushToken({
      token: normalizedCurrent,
      browser_name: navigator.userAgent || null,
      device_label: getDeviceLabel(),
    });
    setStoredPushToken(normalizedCurrent);
    console.log("[PushSync] New token registered successfully");
    return { ok: true, reason: "registered" };
  } catch (error) {
    console.error("[PushSync] Sync failed:", error);
    return { ok: false, reason: "error", message: error?.message };
  }
};

export const setupForegroundPushListener = async (onMessageCallback) => {
  if (!isBrowserPushSupported()) return null;
  try {
    const firebase = await ensureFirebaseCompatLoaded();
    const config = getFirebaseWebConfig();
    validateFirebaseConfig(config);
    if (!Array.isArray(firebase.apps) || firebase.apps.length === 0) {
      firebase.initializeApp(config);
    }
    const messaging = firebase.messaging();
    return messaging.onMessage((payload) => {
      console.log("========== FCM FOREGROUND ==========");
    console.log(payload);
    console.log("====================================");
      if (typeof onMessageCallback === "function") {
        onMessageCallback(payload);
      }
    });
  } catch (error) {
    console.error("Failed to setup foreground push listener:", error);
    return null;
  }
};
