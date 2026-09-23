import { Navigate, useLocation } from "react-router-dom";
import { resolveLegacyManagementTarget } from "./legacyManagementRouting";

const LegacyManagementRedirect = ({ kind = "users" }) => {
  const location = useLocation();
  return <Navigate to={resolveLegacyManagementTarget({ kind, search: location.search })} replace />;
};

export default LegacyManagementRedirect;
