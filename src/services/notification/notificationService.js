import api from "../../api/axios";

export const getNotifications = async ({ unreadOnly = false, limit = 50 } = {}) => {
  const res = await api.get("/notifications", {
    params: {
      unread_only: Boolean(unreadOnly),
      limit
    }
  });
  return res.data;
};

export const getUnreadNotificationCount = async () => {
  const res = await api.get("/notifications/unread-count");
  return res.data;
};

export const markNotificationRead = async (notificationId) => {
  const res = await api.patch(`/notifications/${notificationId}/read`);
  return res.data;
};

export const markAllNotificationsRead = async () => {
  const res = await api.patch("/notifications/read-all");
  return res.data;
};

export const getMyNotifications = async ({ unreadOnly = false, limit = 50 } = {}) => {
  const res = await api.get("/notifications/me", {
    params: {
      unread_only: Boolean(unreadOnly),
      limit,
    },
  });
  return res.data;
};

export const getNotificationDeliveries = async (notificationId) => {
  const res = await api.get(`/notifications/${notificationId}/deliveries`);
  return res.data;
};

export const markAsRead = async (notificationId) => {
  const res = await api.patch(`/notifications/${notificationId}/read`);
  return res.data;
};

export const markAllAsRead = async () => {
  const res = await api.patch("/notifications/read-all");
  return res.data;
};

export const getUnreadCount = async () => {
  const res = await api.get("/notifications/unread-count");
  return res.data;
};
