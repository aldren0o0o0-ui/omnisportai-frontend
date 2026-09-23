import api from "../api/axios";

export const listAnnouncements = async ({
  includeArchived = false,
  includeDrafts = true,
  limit = 100,
} = {}) => {
  const res = await api.get("/announcements", {
    params: {
      include_archived: includeArchived,
      include_drafts: includeDrafts,
      limit,
    },
  });
  return res.data;
};

export const getAnnouncementDetail = async (announcementId) => {
  const res = await api.get(`/announcements/${announcementId}`);
  return res.data;
};

export const createAnnouncement = async (payload) => {
  const res = await api.post("/announcements", payload || {});
  return res.data;
};

export const updateAnnouncementDraft = async (announcementId, payload) => {
  const res = await api.patch(`/announcements/${announcementId}`, payload || {});
  return res.data;
};

export const publishAnnouncement = async (announcementId) => {
  const res = await api.post(`/announcements/${announcementId}/publish`, {});
  return res.data;
};

export const archiveAnnouncement = async (announcementId) => {
  const res = await api.post(`/announcements/${announcementId}/archive`, {});
  return res.data;
};

export const previewAnnouncementRecipients = async (payload) => {
  const res = await api.post("/announcements/preview-recipients", payload || {});
  return res.data;
};

export const listAnnouncementRecipients = async (announcementId) => {
  const res = await api.get(`/announcements/${announcementId}/recipients`);
  return res.data;
};
