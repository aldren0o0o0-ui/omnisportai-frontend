// import api from "../api/axios";
import api from "../../api/axios";

const normalizeText = (value, maxLength) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
};

const buildPushRegisterPayload = (payload) => {
  const token = normalizeText(payload?.token, 4096);
  if (!token) {
    throw new Error("Missing browser push token.");
  }
  return {
    token,
    provider: normalizeText(payload?.provider, 32) || "FCM",
    platform: normalizeText(payload?.platform, 32) || "web",
    browser_name: normalizeText(payload?.browser_name, 64),
    device_label: normalizeText(payload?.device_label, 128),
  };
};

export const getMyPreferences = async () => {
  const res = await api.get("/notification-preferences/me");
  return res.data;
};

export const updateMyPreferences = async (payload) => {
  const res = await api.patch("/notification-preferences/me", payload);
  return res.data;
};

export const saveFirebaseToken = async (firebaseToken) => {
  const res = await api.post("/notification-preferences/firebase-token", {
    firebase_token: firebaseToken,
  });
  console.log("FCM token: ", res);
  return res.data;
};



export const deleteFirebaseToken = async () => {
  const res = await api.delete("/notification-preferences/firebase-token");
  return res.data;
};

export const registerPushToken = async (payload) => {
  const requestPayload = buildPushRegisterPayload(payload || {});
  console.log("========== AUDIT STAGE 2: REGISTRATION REQUEST ==========");
  console.log("Token preview:", (requestPayload.token || "").substring(0, 30) + "...");
  console.log("Token length:", (requestPayload.token || "").length);
  console.log("Browser name:", requestPayload.browser_name);
  console.log("Device label:", requestPayload.device_label);
  console.log("Provider:", requestPayload.provider);
  console.log("Platform:", requestPayload.platform);
  console.log("======================================================");
  const res = await api.post("/notifications/push/register", requestPayload);
  console.log("Registration response:", JSON.stringify(res.data));
  console.log("REGISTERING TOKEN");
  console.log("Current token:", requestPayload.token);
  return res.data;
};

export const unregisterPushToken = async (token) => {
  const res = await api.delete("/notifications/push/unregister", {
    data: { token },
  });
  return res.data;
};

export const getPushStatus = async () => {
  const res = await api.get("/notifications/push/status");
  return res.data;
};

export const sendTestPush = async () => {
  const res = await api.post("/notifications/push/test");
  return res.data;
};
