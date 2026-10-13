import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { resolveMySettingsPath } from "../../utils/settingsNavigation";

export const SettingsRouteRedirect = () => {
  const { roleNames, isViewerOnly } = useAuth();
  const targetPath = resolveMySettingsPath(roleNames || [], Boolean(isViewerOnly));
  return <Navigate to={targetPath} replace />;
};

export default SettingsRouteRedirect;
