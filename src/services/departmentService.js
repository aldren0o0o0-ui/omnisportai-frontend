import api from "../api/axios";
import { cacheTimes, queryClient, queryKeys } from "../query/queryClient";

export const getDepartments = async ({ publicOnly = false } = {}) => {
  const params = {};
  if (publicOnly) params.public_only = true;
  return queryClient.fetchQuery({
    queryKey: queryKeys.departments(publicOnly),
    staleTime: cacheTimes.reference,
    queryFn: async ({ signal }) => (await api.get("/departments", { params, signal })).data,
  });
};

export const createDepartment = async (payload) => {
  const res = await api.post("/departments", payload);
  await queryClient.invalidateQueries({ queryKey: ["departments"] });
  return res.data;
};

export const updateDepartment = async (departmentId, payload) => {
  const res = await api.put(`/departments/${departmentId}`, payload);
  await queryClient.invalidateQueries({ queryKey: ["departments"] });
  return res.data;
};

export const deleteDepartment = async (departmentId) => {
  const res = await api.delete(`/departments/${departmentId}`);
  await queryClient.invalidateQueries({ queryKey: ["departments"] });
  return res.data;
};

export const uploadDepartmentImage = async (departmentId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/departments/${departmentId}/image`, formData);
  await queryClient.invalidateQueries({ queryKey: ["departments"] });
  return res.data;
};

export const removeDepartmentImage = async (departmentId) => {
  const res = await api.delete(`/departments/${departmentId}/image`);
  await queryClient.invalidateQueries({ queryKey: ["departments"] });
  return res.data;
};
