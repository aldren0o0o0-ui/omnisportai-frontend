import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useTournamentAccess from "../hooks/useTournamentAccess";
import PageLoadingIndicator from "../components/common/PageLoadingIndicator";

const buildRoleFallbackPath = ({ roleNames = [], isViewerOnly = false } = {}) => {
  if (roleNames.includes("DEPARTMENT_MANAGER")) return "/department/dashboard";
  if (roleNames.includes("SPORTS_FACILITATOR")) return "/sport-facilitator/dashboard";
  if (roleNames.includes("COACH")) return "/coach/dashboard";
  return isViewerOnly ? "/viewer/dashboard" : "/coordinator/dashboard";
};

const buildModeFallbackPath = (mode, fallback) => {
  if (mode === "sports_coordinator") return "/coordinator/dashboard";
  if (mode === "department_manager") return "/department/dashboard";
  if (mode === "sports_facilitator") return "/sport-facilitator/dashboard";
  if (mode === "coach" || mode === "assistant_coach") return "/coach/dashboard";
  if (mode === "viewer" || mode === "player") return "/viewer/dashboard";
  return fallback;
};

const TournamentAccessRoute = ({
  globalAllowedRoles = [],
  tournamentAllowedModes = [],
  allowWithoutTournamentSelection = false,
  allowViewerSafeFallback = false,
  fallbackPath = "",
}) => {
  const {
    isAuthenticated,
    isViewerOnly,
    loading: authLoading,
    roleNames = [],
  } = useAuth();
  const tournamentAccess = useTournamentAccess();
  const location = useLocation();

  if (authLoading) {
    return <PageLoadingIndicator label="Checking access" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const normalizedMode = String(tournamentAccess.effectiveMode || "")
    .trim()
    .toLowerCase();
  const hasGlobalRole =
    globalAllowedRoles.length > 0 &&
    roleNames.some((role) => globalAllowedRoles.includes(role));
  const hasAllowedTournamentMode = tournamentAllowedModes.some(
    (mode) => String(mode || "").trim().toLowerCase() === normalizedMode
  );
  const canUseViewerSafeFallback =
    allowViewerSafeFallback &&
    (!tournamentAccess.hasSelectedTournament ||
      Boolean(tournamentAccess.error) ||
      normalizedMode === "viewer" ||
      normalizedMode === "player");

  if (hasGlobalRole && !tournamentAccess.hasSelectedTournament) {
    return <Outlet />;
  }

  if (
    tournamentAccess.hasSelectedTournament &&
    tournamentAccess.loading &&
    !tournamentAccess.error
  ) {
    return <PageLoadingIndicator label="Checking Intramural access" />;
  }

  if (
    hasAllowedTournamentMode ||
    (allowWithoutTournamentSelection && !tournamentAccess.hasSelectedTournament) ||
    canUseViewerSafeFallback
  ) {
    return <Outlet />;
  }

  const targetPath = buildModeFallbackPath(
    normalizedMode,
    fallbackPath || buildRoleFallbackPath({ roleNames, isViewerOnly })
  );

  if (
    !targetPath ||
    location.pathname === targetPath ||
    location.pathname === `${targetPath}/`
  ) {
    return <Outlet />;
  }

  return (
    <Navigate
      to={targetPath}
      state={{ accessRedirect: true }}
      replace
    />
  );
};

export default TournamentAccessRoute;
