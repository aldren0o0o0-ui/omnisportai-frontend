import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRoleDashboardData } from "../services/dashboardService";
import { useWorkspace } from "../context/WorkspaceContext";
import { WORKSPACE_CHANGED_EVENT } from "../services/workspaceService";
import { cacheTimes, queryClient, queryKeys } from "../query/queryClient";

const parseRestMinutes = (value) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed < 0) return 30;
  return Math.min(parsed, 240);
};

const LIVE_DASHBOARD_REFRESH_MS = 2000;

export const useRoleDashboardData = ({
  autoLoad = true,
  autoRefreshOnTournamentChange = false,
  liveRefresh = true,
} = {}) => {
  const { selectedIntramural } = useWorkspace();
  const selectedWorkspaceId = selectedIntramural?.id ?? null;

  const [dashboard, setDashboard] = useState(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [minRestMinutes, setMinRestMinutes] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bootstrappedRef = useRef(false);
  const lastAutoRefreshTournamentRef = useRef(null);
  const prevWorkspaceIdRef = useRef(selectedWorkspaceId);

  const refresh = useCallback(
    async (nextTournamentId = selectedTournamentId, options = {}) => {
      const silent = Boolean(options?.silent);
      const cacheKey = queryKeys.dashboard(selectedWorkspaceId, nextTournamentId, parseRestMinutes(minRestMinutes));
      const cached = queryClient.getQueryData(cacheKey);
      if (cached) setDashboard(cached);
      if (!silent && !cached) {
        setLoading(true);
        setError("");
      }
      try {
        const payload = await queryClient.fetchQuery({
          queryKey: cacheKey,
          staleTime: options?.force || silent ? 0 : cacheTimes.dashboard,
          queryFn: () => getRoleDashboardData({
            tournamentId: nextTournamentId || null,
            workspaceId: selectedWorkspaceId || null,
            minRestMinutes: parseRestMinutes(minRestMinutes),
            background: silent,
          }),
        });
        setDashboard(payload);
        if (payload?.selected_tournament_id !== undefined && payload?.selected_tournament_id !== null) {
          const normalizedTournamentId = String(payload.selected_tournament_id);
          queryClient.setQueryData(
            queryKeys.dashboard(selectedWorkspaceId, normalizedTournamentId, parseRestMinutes(minRestMinutes)),
            payload
          );
          lastAutoRefreshTournamentRef.current = normalizedTournamentId;
          setSelectedTournamentId(normalizedTournamentId);
        }
      } catch (apiError) {
        console.error(apiError);
        if (!silent) {
          if (!cached) setDashboard(null);
          setError(
            apiError?.response?.data?.detail ||
              "Unable to load role dashboard analytics."
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [minRestMinutes, selectedTournamentId, selectedWorkspaceId]
  );

  useEffect(() => {
    if (!autoLoad || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    lastAutoRefreshTournamentRef.current = String(selectedTournamentId || "").trim();
    refresh(selectedTournamentId);
  }, [autoLoad, refresh, selectedTournamentId]);

  useEffect(() => {
    if (!autoLoad) return;
    if (!autoRefreshOnTournamentChange) return;
    if (lastAutoRefreshTournamentRef.current === selectedTournamentId) return;
    if (!selectedTournamentId) return;
    lastAutoRefreshTournamentRef.current = selectedTournamentId;
    refresh(selectedTournamentId);
  }, [autoLoad, autoRefreshOnTournamentChange, refresh, selectedTournamentId]);

  const tournaments = useMemo(
    () => (Array.isArray(dashboard?.tournaments) ? dashboard.tournaments : []),
    [dashboard?.tournaments]
  );

  const selectedTournamentName = useMemo(() => {
    const selectedId = String(selectedTournamentId || "").trim();
    if (!selectedId) return "All Intramural Events";
    return (
      tournaments.find((row) => String(row?.id) === selectedId)?.name ||
      "Selected Intramural Event"
    );
  }, [selectedTournamentId, tournaments]);

  // Re-fetch when the sidebar intramural selection changes
  useEffect(() => {
    if (prevWorkspaceIdRef.current === selectedWorkspaceId) return;
    prevWorkspaceIdRef.current = selectedWorkspaceId;
    bootstrappedRef.current = false;
    lastAutoRefreshTournamentRef.current = null;
    setSelectedTournamentId("");
    refresh("");
  }, [selectedWorkspaceId, refresh]);

  // Re-fetch when the active workspace changes (e.g. activation / completion)
  useEffect(() => {
    const handleWorkspaceChanged = () => {
      bootstrappedRef.current = false;
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboards });
      refresh(selectedTournamentId, { force: true });
    };
    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged);
    return () => window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged);
  }, [refresh, selectedTournamentId]);

  // Keep every role's read-only dashboard synchronized. Polling cannot depend on
  // the currently loaded snapshot already knowing that a Match is live: a page
  // opened while it is still SCHEDULED must discover the transition to ONGOING.
  // Background refreshes preserve the current screen and avoid loading flashes.
  useEffect(() => {
    if (
      !autoLoad ||
      !liveRefresh ||
      !selectedTournamentId
    ) {
      return undefined;
    }

    const refreshLiveScores = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void refresh(selectedTournamentId, { silent: true });
    };
    const intervalId = window.setInterval(
      refreshLiveScores,
      LIVE_DASHBOARD_REFRESH_MS
    );
    window.addEventListener("focus", refreshLiveScores);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", refreshLiveScores);
    }
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshLiveScores);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", refreshLiveScores);
      }
    };
  }, [autoLoad, liveRefresh, refresh, selectedTournamentId]);

  return {
    dashboard,
    tournaments,
    selectedTournamentId,
    selectedTournamentName,
    setSelectedTournamentId,
    minRestMinutes,
    setMinRestMinutes,
    loading,
    error,
    refresh,
  };
};

export default useRoleDashboardData;
