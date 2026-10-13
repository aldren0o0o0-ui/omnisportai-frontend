import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// eslint-disable-next-line react-refresh/only-export-components
export const resolveMyProfilePath = (roleNames = [], isViewerOnly = false) => {
  if (roleNames.includes("SPORTS_COORDINATOR")) return "/coordinator/profile";
  if (roleNames.includes("DEPARTMENT_MANAGER")) return "/department/profile";
  if (roleNames.includes("SPORTS_FACILITATOR")) return "/sport-facilitator/profile";
  if (roleNames.includes("COACH")) return "/coach/profile";
  if (isViewerOnly || roleNames.includes("VIEWER")) return "/viewer/profile";
  return "/viewer/profile";
};

export const ProfileEditRouteRedirect = () => {
  const { roleNames, isViewerOnly } = useAuth();
  const basePath = resolveMyProfilePath(roleNames || [], Boolean(isViewerOnly));
  return <Navigate to={`${basePath}/edit`} replace />;
};

export const ProfileSecurityRouteRedirect = () => {
  const { roleNames, isViewerOnly } = useAuth();
  const basePath = resolveMyProfilePath(roleNames || [], Boolean(isViewerOnly));
  return <Navigate to={`${basePath}/security`} replace />;
};

const ProfileRouteRedirect = () => {
  const { roleNames, isViewerOnly } = useAuth();
  const targetPath = resolveMyProfilePath(roleNames || [], Boolean(isViewerOnly));
  return <Navigate to={targetPath} replace />;
};

export default ProfileRouteRedirect;

