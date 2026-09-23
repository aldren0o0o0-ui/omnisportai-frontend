const SESSION_DISMISS_PREFIX = "os:role_mission:dismissed:";
const PERMANENT_HIDE_PREFIX = "os:role_mission:hide_forever:";

const normalizeUserId = (userId) => {
  const parsed = Number(userId);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
};

const makeKey = (prefix, userId) => `${prefix}${normalizeUserId(userId)}`;

export const isRoleMissionCardSessionDismissed = (userId) => {
  if (typeof window === "undefined") return false;
  const normalized = normalizeUserId(userId);
  if (normalized <= 0) return false;
  return window.sessionStorage.getItem(makeKey(SESSION_DISMISS_PREFIX, normalized)) === "1";
};

export const setRoleMissionCardSessionDismissed = (userId, dismissed) => {
  if (typeof window === "undefined") return;
  const normalized = normalizeUserId(userId);
  if (normalized <= 0) return;
  const key = makeKey(SESSION_DISMISS_PREFIX, normalized);
  if (dismissed) {
    window.sessionStorage.setItem(key, "1");
    return;
  }
  window.sessionStorage.removeItem(key);
};

export const clearRoleMissionCardSessionDismissals = () => {
  if (typeof window === "undefined") return;
  const keysToRemove = [];
  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);
    if (typeof key === "string" && key.startsWith(SESSION_DISMISS_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
};

export const isRoleMissionCardPermanentlyHidden = (userId) => {
  if (typeof window === "undefined") return false;
  const normalized = normalizeUserId(userId);
  if (normalized <= 0) return false;
  return window.localStorage.getItem(makeKey(PERMANENT_HIDE_PREFIX, normalized)) === "1";
};

export const setRoleMissionCardPermanentlyHidden = (userId, hidden) => {
  if (typeof window === "undefined") return;
  const normalized = normalizeUserId(userId);
  if (normalized <= 0) return;
  const key = makeKey(PERMANENT_HIDE_PREFIX, normalized);
  if (hidden) {
    window.localStorage.setItem(key, "1");
    return;
  }
  window.localStorage.removeItem(key);
};
