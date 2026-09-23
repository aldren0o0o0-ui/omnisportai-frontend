// src/context/AuthContext.jsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '../api/authApi';
import { getMe } from '../services/userService';
import { getAccessToken, setAccessToken } from '../api/tokenStore';
import { clearRoleMissionCardSessionDismissals } from '../utils/roleMissionCardPreferences';
import { getStoredPushToken, clearStoredPushToken, syncCurrentBrowserPushToken } from '../services/notification/browserPushService';
import { unregisterPushToken } from '../services/notification/notificationPreferenceService';
import { SESSION_EXPIRED_EVENT } from '../api/axios';
import { isDefinitiveAuthFailure } from '../api/authFailurePolicy';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAccessToken());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [sessionRecovery, setSessionRecovery] = useState(false);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  const bootstrapPromiseRef = useRef(null);
  const mountedRef = useRef(true);

  const roleNames = useMemo(() => {
    if (!user?.roles) return [];
    return user.roles.map((r) => r.role_name);
  }, [user]);

  const computeViewerOnly = (profile) => {
    if (!profile?.roles || profile.roles.length === 0) return false;
    return profile.roles.every((r) => r.role_name === "VIEWER");
  };

  const isViewerOnly = useMemo(() => computeViewerOnly(user), [user]);
  const isSportsCoordinator = useMemo(
    () => roleNames.includes("SPORTS_COORDINATOR"),
    [roleNames]
  );
  const isDepartmentManager = useMemo(
    () => roleNames.includes("DEPARTMENT_MANAGER"),
    [roleNames]
  );

  const isSportsFacilitator = useMemo(
    () => roleNames.includes("SPORTS_FACILITATOR"),
    [roleNames]
  );

  const bootstrap = useCallback(async () => {
    if (bootstrapPromiseRef.current) return bootstrapPromiseRef.current;
    const operation = (async () => {
      setLoading(true);
      try {
        if (!getAccessToken()) {
          const { access_token } = await authApi.refresh();
          setAccessToken(access_token);
        }
        const profile = await getMe();
        if (!mountedRef.current) return;
        setUser(profile);
        setIsAuthenticated(true);
        setSessionRecovery(false);
        setRecoveryAttempt(0);
        syncCurrentBrowserPushToken();
      } catch (error) {
        if (!mountedRef.current) return;
        if (isDefinitiveAuthFailure(error)) {
          setAccessToken(null);
          setIsAuthenticated(false);
          setUser(null);
          setSessionRecovery(false);
        } else {
          // Keep the route protected and retry restoration. A network outage or
          // backend restart is not proof that the user's session expired.
          setSessionRecovery(true);
          setRecoveryAttempt((current) => current + 1);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })().finally(() => { bootstrapPromiseRef.current = null; });
    bootstrapPromiseRef.current = operation;
    return operation;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void bootstrap();
    return () => { mountedRef.current = false; };
  }, [bootstrap]);

  useEffect(() => {
    if (!sessionRecovery) return undefined;
    const retryId = window.setTimeout(() => { void bootstrap(); }, 2500);
    return () => window.clearTimeout(retryId);
  }, [bootstrap, recoveryAttempt, sessionRecovery]);

  useEffect(() => {
    const handleExpiredSession = () => {
      setAccessToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setSessionRecovery(false);
      setLoading(false);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpiredSession);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpiredSession);
  }, []);

  const login = async (credentials) => {
    const { access_token } = await authApi.login(credentials);
    setAccessToken(access_token);
    clearRoleMissionCardSessionDismissals();
    const profile = await getMe();
    setUser(profile);
    setIsAuthenticated(true);
    setSessionRecovery(false);
    setRecoveryAttempt(0);
    syncCurrentBrowserPushToken();
    return {
      ...profile,
      isViewerOnly: computeViewerOnly(profile),
      roleNames: profile.roles?.map((r) => r.role_name) || []
    };
  };

  const logout = async () => {
    try {
      const pushToken = getStoredPushToken();
      if (pushToken) {
        try {
          await unregisterPushToken(pushToken);
        } catch {
          // Keep logout resilient if push cleanup fails.
        } finally {
          clearStoredPushToken();
        }
      }
      await authApi.logout();
    } finally {
      clearRoleMissionCardSessionDismissals();
      setAccessToken(null);
      setIsAuthenticated(false);
      setUser(null);
      setSessionRecovery(false);
      setRecoveryAttempt(0);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        login,
        logout,
        user,
        isViewerOnly,
        roleNames,
        isSportsCoordinator,
        isDepartmentManager,
        isSportsFacilitator,
        sessionRecovery,
        retrySession: bootstrap,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
