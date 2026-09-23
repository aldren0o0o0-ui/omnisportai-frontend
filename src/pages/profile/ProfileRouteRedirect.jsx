import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const resolveMyProfilePath = (roleNames = [], isViewerOnly = false) => {
  if (roleNames.includes("SPORTS_COORDINATOR")) return "/coordinator/profile";
  if (roleNames.includes("DEPARTMENT_MANAGER")) return "/department/profile";
  if (roleNames.includes("SPORTS_FACILITATOR")) return "/sport-facilitator/profile";
  if (roleNames.includes("COACH")) return "/coach/profile";
  if (isViewerOnly || roleNames.includes("VIEWER")) return "/viewer/profile";
  return "/viewer/profile";
};

const ProfileRouteRedirect = () => {
  const { roleNames, isViewerOnly } = useAuth();
  const targetPath = resolveMyProfilePath(roleNames || [], Boolean(isViewerOnly));
  return <Navigate to={targetPath} replace />;
};

export default ProfileRouteRedirect;
