import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getActiveWorkspace, getWorkspace, getWorkspaces } from '../services/workspaceService';
import { WORKSPACE_CHANGED_EVENT } from '../services/workspaceService';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);
const SELECTED_INTRAMURAL_STORAGE_KEY = 'omnisport:selected-intramural-id';

const readStoredSelectedIntramuralId = () => {
  if (typeof window === 'undefined') return null;
  const value = Number(window.localStorage.getItem(SELECTED_INTRAMURAL_STORAGE_KEY) || 0);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const writeStoredSelectedIntramuralId = (workspaceId) => {
  if (typeof window === 'undefined') return;
  const value = Number(workspaceId || 0);
  if (Number.isFinite(value) && value > 0) {
    window.localStorage.setItem(SELECTED_INTRAMURAL_STORAGE_KEY, String(value));
  } else {
    window.localStorage.removeItem(SELECTED_INTRAMURAL_STORAGE_KEY);
  }
};

const chooseDefaultIntramural = (rows = []) => {
  const items = Array.isArray(rows) ? rows : [];
  return (
    items.find((row) => row?.is_active) ||
    items.find((row) => !['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(String(row?.status || '').toUpperCase())) ||
    items[0] ||
    null
  );
};

export const WorkspaceProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  // `workspace` = the ACTIVE intramural (backend-authoritative; only a
  // coordinator activating a season changes it, via WORKSPACE_CHANGED_EVENT).
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchingRef = useRef(false);

  // `selectedIntramural` = the SELECTED (viewing) intramural. Frontend-only;
  // any authenticated role may change it for browsing without touching the
  // backend active season. Defaults to the active intramural until the user
  // explicitly picks another. `userPickedRef` tracks whether the user has
  // overridden the default so a later active-workspace refresh does not clobber
  // their manual choice.
  const [selectedIntramural, setSelectedIntramural] = useState(null);
  const userPickedRef = useRef(false);
  const restoredSelectionRef = useRef(false);

  const refresh = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await getActiveWorkspace();
      setWorkspace(data || null);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 || status === 204) {
        setWorkspace(null);
      } else {
        setError(err?.response?.data?.detail || 'Failed to load workspace.');
        setWorkspace(null);
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Load on mount when authenticated
  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!isAuthenticated) {
      setWorkspace(null);
      setSelectedIntramural(null);
      userPickedRef.current = false;
      restoredSelectionRef.current = false;
      setLoading(false);
      setError(null);
      return;
    }
    refresh();
  }, [authLoading, isAuthenticated, refresh]);

  // Listen for workspace change events dispatched by workspaceService mutating
  // functions. This means the ACTIVE (backend) intramural changed — e.g. a
  // coordinator activated/completed a season. It does NOT represent a viewing
  // selection change.
  useEffect(() => {
    const handler = (event) => {
      const next = event?.detail?.workspace;
      if (next !== undefined) {
        setWorkspace(next);
        setLoading(false);
        setError(null);
      } else {
        refresh();
      }
    };
    window.addEventListener(WORKSPACE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(WORKSPACE_CHANGED_EVENT, handler);
  }, [refresh]);

  // Default the SELECTED (viewing) intramural to the ACTIVE one, unless the
  // user has explicitly picked another to browse. Keeps "selected" in sync with
  // a freshly-loaded active season on login without overriding a manual choice.
  useEffect(() => {
    if (!userPickedRef.current) {
      setSelectedIntramural(workspace);
    }
  }, [workspace]);

  // Restore the last selected (viewing) intramural after refresh/reload.  This
  // keeps the global dropdown, dashboard, teams, brackets, schedules, and
  // standings on the same selected Intramural until the user chooses another.
  useEffect(() => {
    if (authLoading || !isAuthenticated || loading || restoredSelectionRef.current) return undefined;
    restoredSelectionRef.current = true;
    const storedId = readStoredSelectedIntramuralId();
    if (!storedId) {
      if (workspace) {
        if (!userPickedRef.current) setSelectedIntramural(workspace);
        return undefined;
      }

      let alive = true;
      getWorkspaces({ includeArchived: true })
        .then((payload) => {
          if (!alive || userPickedRef.current) return;
          const fallback = chooseDefaultIntramural(payload?.workspaces || []);
          if (fallback) {
            setSelectedIntramural(fallback);
            writeStoredSelectedIntramuralId(fallback.id);
          } else {
            setSelectedIntramural(null);
          }
        })
        .catch(() => {
          if (!alive || userPickedRef.current) return;
          setSelectedIntramural(null);
        });
      return () => {
        alive = false;
      };
    }

    let alive = true;
    if (workspace && Number(workspace.id) === Number(storedId)) {
      userPickedRef.current = false;
      setSelectedIntramural(workspace);
      return undefined;
    }

    userPickedRef.current = true;
    getWorkspace(storedId)
      .then((storedWorkspace) => {
        if (!alive) return;
        setSelectedIntramural(storedWorkspace || workspace || null);
      })
      .catch((error) => {
        if (!alive) return;
        const status = error?.response?.status;
        if (status === 404) {
          writeStoredSelectedIntramuralId(workspace?.id || null);
          userPickedRef.current = false;
          setSelectedIntramural(workspace || null);
          return;
        }
        // Keep the stored selection for transient/auth timing failures and
        // fall back visually only for this render.
        setSelectedIntramural(workspace || null);
      });
    return () => {
      alive = false;
    };
  }, [authLoading, isAuthenticated, loading, workspace]);

  // Change the viewing context (any authenticated role). Frontend-only: does
  // NOT activate a workspace in the backend. Passing null (or the active
  // intramural) resets to following the active season again.
  const selectIntramural = useCallback((intramural) => {
    const isActiveOne = intramural && workspace && intramural.id === workspace.id;
    userPickedRef.current = Boolean(intramural) && !isActiveOne;
    const next = intramural || workspace || null;
    writeStoredSelectedIntramuralId(next?.id || null);
    setSelectedIntramural(next);
  }, [workspace]);

  const isActive = workspace?.is_active === true;
  const workspaceId = workspace?.id ?? null;
  const workspaceName = workspace?.name ?? null;
  const workspaceStatus = workspace?.status ?? null;
  const schoolYear = workspace?.school_year ?? null;
  const semester = workspace?.semester ?? null;

  // Selected (viewing) intramural — the single source every page should read.
  const selectedStatus = String(selectedIntramural?.status || '').toUpperCase();
  const isViewingHistorical = ['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(selectedStatus);
  const isViewingActive =
    Boolean(selectedIntramural) && Boolean(workspace) && selectedIntramural.id === workspace.id;

  return (
    <WorkspaceContext.Provider
      value={{
        // ACTIVE intramural (backend-authoritative) — unchanged API.
        workspace,
        workspaceId,
        workspaceName,
        workspaceStatus,
        schoolYear,
        semester,
        isActive,
        loading,
        error,
        refresh,

        // SELECTED (viewing) intramural — single source of truth for pages.
        selectedIntramural,
        selectIntramural,
        isViewingHistorical,
        isViewingActive,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

// Context files intentionally export both the Provider and its hook.
// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
};
