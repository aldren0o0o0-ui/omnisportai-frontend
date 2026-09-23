import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getMyTournamentAccess } from "../services/tournamentService";
import { cacheTimes, queryClient, queryKeys } from "../query/queryClient";
import {
  broadcastDashboardTournamentSelection,
  DASHBOARD_TOURNAMENT_SELECTION_EVENT,
  readStoredDashboardTournamentSelection,
  writeStoredDashboardTournamentSelection,
} from "../utils/dashboardTournamentSelection";
import {
  canManageCoachPages,
  createTournamentAccessFallback,
  isReadOnlyAssistantMode,
  normalizeTournamentAccessPayload,
  normalizeTournamentId,
  TOURNAMENT_ACCESS_REFRESH_EVENT,
} from "../utils/tournamentAccess";

const useTournamentAccess = (tournamentIdOverride = undefined) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const hasExplicitTournamentId =
    tournamentIdOverride !== undefined && tournamentIdOverride !== null;
  const [storedSelection, setStoredSelection] = useState(() =>
    readStoredDashboardTournamentSelection()
  );

  useEffect(() => {
    const handleTournamentSelectionUpdate = (event) => {
      setStoredSelection({
        id: normalizeTournamentId(event?.detail?.id),
        name: String(event?.detail?.name || "").trim(),
      });
    };
    window.addEventListener(
      DASHBOARD_TOURNAMENT_SELECTION_EVENT,
      handleTournamentSelectionUpdate
    );
    return () => {
      window.removeEventListener(
        DASHBOARD_TOURNAMENT_SELECTION_EVENT,
        handleTournamentSelectionUpdate
      );
    };
  }, []);

  const selectedTournamentId = hasExplicitTournamentId
    ? normalizeTournamentId(tournamentIdOverride)
    : normalizeTournamentId(storedSelection?.id);

  const selectedTournamentName = hasExplicitTournamentId
    ? String(storedSelection?.name || "").trim()
    : String(storedSelection?.name || "").trim();

  useEffect(() => {
    const refresh = (event) => {
      const eventTournamentId = normalizeTournamentId(event?.detail?.tournament_id);
      if (!eventTournamentId || eventTournamentId === selectedTournamentId) {
        const queryKey = eventTournamentId
          ? queryKeys.tournamentAccess(user?.id, eventTournamentId)
          : queryKeys.tournamentAccesses;
        void queryClient.invalidateQueries({ queryKey });
      }
    };
    window.addEventListener(TOURNAMENT_ACCESS_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(TOURNAMENT_ACCESS_REFRESH_EVENT, refresh);
  }, [selectedTournamentId, user?.id]);

  const setSelectedTournamentSelection = useCallback(({ id = "", name = "" } = {}) => {
    const normalizedId = normalizeTournamentId(id);
    const normalizedName = String(name || "").trim();
    setStoredSelection({ id: normalizedId, name: normalizedName });
    writeStoredDashboardTournamentSelection({ id: normalizedId, name: normalizedName });
    broadcastDashboardTournamentSelection({
      id: normalizedId,
      name: normalizedName,
      source: "tournament-access",
    });
  }, []);

  const accessEnabled = Boolean(
    !authLoading && isAuthenticated && user?.id && selectedTournamentId
  );
  const accessQuery = useQuery({
    queryKey: queryKeys.tournamentAccess(user?.id, selectedTournamentId),
    queryFn: () => getMyTournamentAccess(Number(selectedTournamentId)),
    enabled: accessEnabled,
    staleTime: cacheTimes.tournamentAccess,
    gcTime: 15 * 60_000,
  });

  useEffect(() => {
    if (
      accessEnabled &&
      !hasExplicitTournamentId &&
      accessQuery.error?.response?.status === 404
    ) {
      const timer = window.setTimeout(() => setSelectedTournamentSelection(), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [
    accessEnabled,
    accessQuery.error,
    hasExplicitTournamentId,
    setSelectedTournamentSelection,
  ]);

  const tournamentAccess = accessEnabled
    ? accessQuery.data || createTournamentAccessFallback()
    : createTournamentAccessFallback();
  const loading = accessEnabled && accessQuery.isPending;
  const error = accessEnabled && accessQuery.isError && accessQuery.error?.response?.status !== 404
    ? accessQuery.error?.response?.data?.detail ||
      "Unable to load tournament access. Viewer fallback is active."
    : "";

  const normalizedAccess = useMemo(
    () => normalizeTournamentAccessPayload(tournamentAccess, selectedTournamentId),
    [selectedTournamentId, tournamentAccess]
  );

  const hasSelectedTournament = Boolean(selectedTournamentId);
  const effectiveMode = hasSelectedTournament
    ? String(normalizedAccess?.effective_mode || "").trim().toLowerCase()
    : "";
  const roleContexts = useMemo(
    () => Array.isArray(normalizedAccess?.role_contexts) ? normalizedAccess.role_contexts : [],
    [normalizedAccess]
  );
  const permissions = useMemo(
    () => Array.isArray(normalizedAccess?.permissions) ? normalizedAccess.permissions : [],
    [normalizedAccess]
  );
  const viewerPermissions = useMemo(
    () => Array.isArray(normalizedAccess?.viewer_permissions) ? normalizedAccess.viewer_permissions : [],
    [normalizedAccess]
  );

  const hasPermission = useCallback(
    (permission) => permissions.includes(permission),
    [permissions]
  );
  const hasRoleContext = useCallback(
    (role) =>
      roleContexts.some(
        (context) =>
          String(context?.role || "").trim().toLowerCase() ===
          String(role || "").trim().toLowerCase()
      ),
    [roleContexts]
  );

  return {
    selectedTournamentId,
    selectedTournamentName,
    setSelectedTournamentSelection,
    tournamentAccess: normalizedAccess,
    effectiveMode,
    roleContexts,
    permissions,
    viewerPermissions,
    loading,
    error,
    hasSelectedTournament,
    isViewerMode: hasSelectedTournament && effectiveMode === "viewer",
    isCoachMode: hasSelectedTournament && effectiveMode === "coach",
    isAssistantCoachMode:
      hasSelectedTournament && effectiveMode === "assistant_coach",
    isPlayerMode: hasSelectedTournament && effectiveMode === "player",
    isDepartmentManagerMode:
      hasSelectedTournament && effectiveMode === "department_manager",
    isFacilitatorMode:
      hasSelectedTournament && effectiveMode === "sports_facilitator",
    isCoordinatorMode:
      hasSelectedTournament && effectiveMode === "sports_coordinator",
    hasPermission,
    hasRoleContext,
    canManageCoachPages:
      hasSelectedTournament && canManageCoachPages(effectiveMode),
    isReadOnlyAssistantMode:
      hasSelectedTournament && isReadOnlyAssistantMode(effectiveMode),
  };
};

export default useTournamentAccess;
