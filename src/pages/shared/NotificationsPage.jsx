import { Navigate, useLocation } from "react-router-dom";

const NotificationPage = () => {
  const location = useLocation();
  const roleKey = String(location.pathname || "").split("/").filter(Boolean)[0] || "viewer";
  return <Navigate to={`/${roleKey}/dashboard`} replace />;
};

export default NotificationPage;
