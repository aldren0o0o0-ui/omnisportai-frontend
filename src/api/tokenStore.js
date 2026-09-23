const SESSION_TOKEN_KEY = 'omnisport:access-token';

const readSessionToken = () => {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage.getItem(SESSION_TOKEN_KEY) || null; } catch { return null; }
};

let accessToken = readSessionToken();

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token || null;
  if (typeof window === 'undefined') return;
  try {
    if (accessToken) window.sessionStorage.setItem(SESSION_TOKEN_KEY, accessToken);
    else window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // Memory-only auth remains available when browser storage is unavailable.
  }
};
