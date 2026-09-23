// src/services/adminServices.js
import api from "../api/axios";

export const createRoleAssignment = async (payload) => {
  const res = await api.post("/admin/role-assignments", payload);
  return res.data;
};

export const getRoleAssignments = async (params = {}) => {
  const res = await api.get("/admin/role-assignments", { params });
  return res.data;
};

export const deleteRoleAssignment = async (assignmentId) => {
  const res = await api.delete("/admin/role-assignments", {
    data: { assignment_id: assignmentId }
  });
  return res.data;
};

export const getInviteCodeStatus = async () => {
  const res = await api.get("/admin/invite-code");
  return res.data;
};

export const updateInviteCode = async (payload) => {
  const res = await api.post("/admin/invite-code", payload);
  return res.data;
};

export const assignSportFacilitator = async (payload) => {
  const res = await api.post("/admin/sport-facilitator", payload);
  return res.data;
};

export const assignCoach = async (payload) => {
  const res = await api.post("/admin/assign-coach", payload);
  return res.data;
};

export const getAdminUsers = async (params = {}) => {
  const res = await api.get("/admin/users", { params });
  return res.data;
};

export const updateAdminUserStatus = async (userId, payload) => {
  const res = await api.patch(`/admin/users/${userId}/status`, payload);
  return res.data;
};

export const getUserManagementAuditLogs = async (params = {}) => {
  const res = await api.get("/admin/user-management/audit-logs", { params });
  return res.data;
};
