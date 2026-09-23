import api from "../api/axios";

export const submitStaffApplication = async (payload) => {
  const res = await api.post("/sport-staff-applications", payload);
  return res.data;
};

export const getMyStaffApplications = async () => {
  const res = await api.get("/sport-staff-applications/me");
  return res.data;
};

export const getSportStaffApplications = async (sportId, status = null) => {
  const params = {};
  if (status) params.status = status;
  const res = await api.get(`/sports/${sportId}/staff-applications`, { params });
  return res.data;
};

export const updateStaffApplicationStatus = async (applicationId, payload) => {
  const res = await api.patch(`/sport-staff-applications/${applicationId}/status`, payload);
  return res.data;
};

export const cancelStaffApplication = async (applicationId) => {
  const res = await api.post(`/sport-staff-applications/${applicationId}/cancel`);
  return res.data;
};

export const getSportStaff = async (sportId) => {
  const res = await api.get(`/sports/${sportId}/staff`);
  return res.data;
};

export const addSportStaff = async (sportId, userId, payload = null) => {
  const res = await api.post(`/sports/${sportId}/staff/${userId}`, payload);
  return res.data;
};

export const removeSportStaff = async (sportId, userId) => {
  const res = await api.delete(`/sports/${sportId}/staff/${userId}`);
  return res.data;
};

export const getFacilitatorAssignedStaff = async () => {
  const res = await api.get("/sports-facilitator/assigned-staff");
  return res.data;
};

export const searchSportStaffCandidates = async (
  sportId,
  { q = "", assignedRole = "", limit = 20 } = {}
) => {
  const params = { limit };
  if (String(q || "").trim()) params.q = String(q).trim();
  if (String(assignedRole || "").trim()) params.assigned_role = String(assignedRole).trim();
  const res = await api.get(`/sports/${sportId}/staff-candidates`, { params });
  return res.data;
};
