import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  getMyNotifications,
  getNotificationDeliveries,
  markAllAsRead,
  markAsRead,
} from "../../services/notification/notificationService";
import MetricCard from "../../components/common/MetricCard";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { DashboardSection, IntramuralPage } from "../../components/intramural";
import { Bell, CheckCircle } from "lucide-react";
import { getRelatedNotificationPath } from "../../utils/notificationRouting";

const TYPE_STYLES = {
  MATCH_RESULT_FINALIZED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MATCH_REMINDER: "bg-amber-50 text-amber-700 border-amber-200",
  SCHEDULE_GENERATED: "bg-blue-50 text-blue-700 border-blue-200",
  VENUE_CHANGED: "bg-purple-50 text-purple-700 border-purple-200",
  TOURNAMENT_STATUS_UPDATED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  TEAM_APPLICATION_SUBMITTED: "bg-sky-50 text-sky-700 border-sky-200",
  TEAM_APPLICATION_FOR_TRYOUT: "bg-cyan-50 text-cyan-700 border-cyan-200",
  TEAM_APPLICATION_REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  TEAM_APPLICATION_ACCEPTED_AS_PLAYER: "bg-emerald-50 text-emerald-700 border-emerald-200",
  TEAM_APPLICATION_ELIMINATED_AFTER_TRYOUT: "bg-orange-50 text-orange-700 border-orange-200",
  TEAM_APPLICATION_CANCELLED: "bg-slate-100 text-slate-700 border-slate-200",
  TRYOUT_SCHEDULE_PUBLISHED: "bg-cyan-50 text-cyan-700 border-cyan-200",
  TRYOUT_SCHEDULE_UPDATED: "bg-cyan-50 text-cyan-700 border-cyan-200",
  TRYOUT_REMINDER: "bg-amber-50 text-amber-700 border-amber-200",
  MEDICAL_CERTIFICATE_ACCEPTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MEDICAL_CERTIFICATE_REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  COMPETITION_ENTRY_SUBMITTED: "bg-sky-50 text-sky-700 border-sky-200",
  COMPETITION_ENTRY_APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PLAYER_APPLICATION_SUBMITTED: "bg-sky-50 text-sky-700 border-sky-200",
  PLAYER_APPLICATION_REVIEWED: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

const CHANNEL_ORDER = ["IN_APP", "EMAIL", "PUSH"];

const toDisplayType = (value) =>
  String(value || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Notification";

const isMatchReminder = (item) =>
  ["MATCH_REMINDER", "TRYOUT_REMINDER"].includes(String(item?.event_type || "").trim().toUpperCase());

const reminderLeadText = (item) => {
  const eventType = String(item?.event_type || "").trim().toUpperCase();
  const minutes = Number(item?.metadata?.reminder_minutes_before);
  if (!Number.isFinite(minutes) || minutes <= 0) return eventType === "TRYOUT_REMINDER" ? "Tryout starts now" : "Match reminder";
  if (minutes === 60) return "1 hour before";
  if (minutes === 120) return "2 hours before";
  return `${minutes} minutes before`;
};

const formatDateTime = (value) => {
  if (!value) return "Unknown time";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
};

const NotificationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const roleKey = useMemo(
    () => String(location.pathname || "").split("/").filter(Boolean)[0] || "viewer",
    [location.pathname]
  );

  const [items, setItems] = useState([]);
  const [deliveryByNotificationId, setDeliveryByNotificationId] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [loadingDeliveryForId, setLoadingDeliveryForId] = useState(null);

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const payload = await getMyNotifications({ limit: 100 });
      const nextItems = Array.isArray(payload?.items) ? payload.items : [];
      setItems(nextItems);
      setDeliveryByNotificationId({});
    } catch (apiError) {
      setItems([]);
      setDeliveryByNotificationId({});
      setError(apiError?.response?.data?.detail || "Failed to load notifications.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const ensureDeliveryLoaded = async (notificationId) => {
    if (deliveryByNotificationId[notificationId]) return;
    setLoadingDeliveryForId(notificationId);
    try {
      const payload = await getNotificationDeliveries(notificationId);
      setDeliveryByNotificationId((current) => ({
        ...current,
        [notificationId]: Array.isArray(payload?.items) ? payload.items : [],
      }));
    } catch {
      setDeliveryByNotificationId((current) => ({
        ...current,
        [notificationId]: [],
      }));
    } finally {
      setLoadingDeliveryForId(null);
    }
  };

  const handleMarkRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      setItems((current) =>
        current.map((item) =>
          Number(item.id) === Number(notificationId)
            ? { ...item, is_read: true }
            : item
        )
      );
    } catch {
      // keep local state unchanged
    }
  };

  const handleMarkAll = async () => {
    setIsMarkingAll(true);
    try {
      await markAllAsRead();
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    } finally {
      setIsMarkingAll(false);
    }
  };

  const notificationLink = (item) => getRelatedNotificationPath({ roleKey, notification: item });

  const totalUnread = items.filter((i) => !i.is_read).length;

  return (
    <IntramuralPage
      role={roleKey === "sport-facilitator" ? "sport-facilitator" : roleKey}
      title="Notifications"
      breadcrumbs={[{ label: "Notifications" }]}
      subtitle="Across your Intramurals · Open an alert to see its delivery status."
      requireActive={false}
      error={error}
      onRetry={load}
      headerAction={
        <div className="flex items-center gap-3">
          <Link
            to={`/${roleKey}/notification-settings`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={isMarkingAll || isLoading || items.length === 0}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isMarkingAll ? "Updating..." : "Mark all as read"}
          </button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Notifications"
          value={items.length}
          icon={Bell}
          color="blue"
        />
        <MetricCard
          title="Unread"
          value={totalUnread}
          icon={CheckCircle}
          color={totalUnread > 0 ? "orange" : "green"}
        />
      </div>

      <DashboardSection title="Recent Notifications" bodyClassName="mt-4">
        {isLoading ? (
          <LoadingState message="Loading notifications..." />
        ) : items.length === 0 ? (
          <EmptyState message="No notifications yet." />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const deliveryRows = deliveryByNotificationId[item.id];
              return (
                <div
                  key={item.id}
                  onClick={async (event) => {
                    const target = event.target;
                    if (
                      target instanceof Element &&
                      target.closest("a,button,input,textarea,select,label")
                    ) {
                      return;
                    }
                    const targetPath = notificationLink(item);
                    if (targetPath) {
                      if (!item.is_read) {
                        await handleMarkRead(item.id);
                      }
                      navigate(targetPath);
                    }
                  }}
	                  className={`rounded-xl border p-4 transition ${
	                    item.is_read
	                      ? "border-slate-200 bg-slate-50 dark:border-slate-700/50 dark:bg-[var(--surface-soft)]/30"
	                      : isMatchReminder(item)
	                      ? "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10"
	                      : "border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-[var(--surface)]"
	                  } ${notificationLink(item) ? "cursor-pointer hover:border-blue-300 dark:hover:border-blue-800/60" : ""}`}
	                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                            TYPE_STYLES[item.event_type] || "bg-slate-100 text-slate-700 border-slate-200 dark:bg-[var(--surface-soft)] dark:text-slate-300 dark:border-slate-700"
                          }`}
	                        >
	                          {toDisplayType(item.event_type)}
	                        </span>
	                        {isMatchReminder(item) ? (
	                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
	                            {reminderLeadText(item)}
	                          </span>
	                        ) : null}
	                        {!item.is_read ? (
	                          <span className="inline-flex items-center rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
	                            Unread
                          </span>
                        ) : null}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(item.created_at)}
                        </span>
	                      </div>
	                      <p className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
	                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.message}</p>
	                      {isMatchReminder(item) && item?.metadata?.start_at ? (
	                        <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
	                          Starts at: {formatDateTime(item.metadata.start_at)}
	                        </p>
	                      ) : null}
	                      
	                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        {notificationLink(item) ? (
                          <Link
                            to={notificationLink(item)}
                            onClick={() => {
                              if (!item.is_read) {
                                void handleMarkRead(item.id);
                              }
                            }}
                            className="inline-flex text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Open related page
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => ensureDeliveryLoaded(item.id)}
                          disabled={loadingDeliveryForId === item.id}
                          className="inline-flex text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-60 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          {loadingDeliveryForId === item.id ? "Loading delivery..." : "View delivery status"}
                        </button>
                      </div>

                      {Array.isArray(deliveryRows) && deliveryRows.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {deliveryRows.map((delivery) => {
                            const isFail = String(delivery.status).toUpperCase() === "FAILED";
                            return (
                              <span
                                key={delivery.id}
                                className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                                  isFail 
                                  ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300"
                                  : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-300"
                                }`}
                                title={delivery.failed_reason || ""}
                              >
                                {delivery.channel}: {delivery.status}
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    {!item.is_read ? (
                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMarkRead(item.id)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-[var(--surface-soft)] dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          Mark as read
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashboardSection>
    </IntramuralPage>
  );
};

export default NotificationPage;
