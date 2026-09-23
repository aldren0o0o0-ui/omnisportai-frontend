import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  buildFallbackNotificationPath,
  getRelatedNotificationPath,
  resolveRoleKeyFromRoles,
} from "../../utils/notificationRouting";

const toNullableInt = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
};

const NotificationRedirector = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, loading, roleNames, isViewerOnly } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      const nextPath = `${location.pathname}${location.search || ""}`;
      window.sessionStorage.setItem("omnisport_post_login_redirect", nextPath);
      navigate("/login", { replace: true });
      return;
    }

    const params = new URLSearchParams(location.search || "");
    const notification = {
      notification_id: toNullableInt(params.get("notification_id")),
      event_type: String(params.get("event_type") || "").trim() || null,
      tournament_id: toNullableInt(params.get("tournament_id")),
      match_id: toNullableInt(params.get("match_id")),
      team_id: toNullableInt(params.get("team_id")),
      venue_id: toNullableInt(params.get("venue_id")),
      schedule_id: toNullableInt(params.get("schedule_id")),
      announcement_id: toNullableInt(params.get("announcement_id")),
    };

    const roleKey = resolveRoleKeyFromRoles({ roleNames, isViewerOnly });
    const targetPath =
      getRelatedNotificationPath({ roleKey, notification }) ||
      buildFallbackNotificationPath(roleKey);

    navigate(targetPath, { replace: true });
  }, [isAuthenticated, isViewerOnly, loading, location.pathname, location.search, navigate, roleNames]);

  return (
    <div className="mx-4 my-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-[var(--surface)] dark:text-slate-400">
      Redirecting notification...
    </div>
  );
};

export default NotificationRedirector;
