// src/router/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageLoadingIndicator from '../components/common/PageLoadingIndicator';

const ProtectedRoute = ({ requireViewer, requireNonViewer, allowRoles }) => {
  const { isAuthenticated, loading, sessionRecovery, isViewerOnly, roleNames } = useAuth();

  if (loading || sessionRecovery) {
    return <PageLoadingIndicator label={sessionRecovery ? "Reconnecting session" : "Checking access"} />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (allowRoles && allowRoles.length > 0) {
    const hasRole = roleNames?.some((role) => allowRoles.includes(role));
    if (!hasRole) {
    const fallback = roleNames?.includes("DEPARTMENT_MANAGER")
      ? "/department/dashboard"
      : roleNames?.includes("SPORTS_FACILITATOR")
      ? "/sport-facilitator/dashboard"
      : roleNames?.includes("COACH")
      ? "/coach/dashboard"
      : (isViewerOnly ? "/viewer/dashboard" : "/coordinator/dashboard");
      return <Navigate to={fallback} />;
    }
  }

  if (requireViewer && !isViewerOnly) {
    let fallback = "/coordinator/dashboard";
    if (roleNames.includes("DEPARTMENT_MANAGER")) fallback = "/department/dashboard";
    if (roleNames.includes("SPORTS_FACILITATOR")) fallback = "/sport-facilitator/dashboard";
    if (roleNames.includes("COACH")) fallback = "/coach/dashboard";
    return <Navigate to={fallback} />;
  }
  
  if (requireNonViewer && isViewerOnly) {
    return <Navigate to="/viewer/dashboard" />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
