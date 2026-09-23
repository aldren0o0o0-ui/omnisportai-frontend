import api from "../api/axios";
import { cacheTimes, queryClient, queryKeys } from "../query/queryClient";

export const getSports = async (departmentId = null, options = {}) => {
  const params = {};
  if (departmentId) params.department_id = departmentId;
  if (options.includeArchived) params.include_archived = true;
  return queryClient.fetchQuery({
    queryKey: queryKeys.sports(departmentId, options.includeArchived),
    staleTime: cacheTimes.reference,
    queryFn: async ({ signal }) => (await api.get("/sports", { params, signal })).data,
  });
};

export const getSportTemplates = async () => {
  const res = await api.get("/sports/templates");
  return res.data;
};

export const getSportById = async (sportId) => {
  const res = await api.get(`/sports/${sportId}`);
  return res.data;
};

export const getGlobalSportConfiguration = async (sportId) =>
  (await api.get(`/sports/${sportId}/configuration`)).data;

export const updateGlobalSportConfiguration = async (sportId, payload) => {
  const result = (await api.put(`/sports/${sportId}/configuration`, payload)).data;
  await queryClient.invalidateQueries({ queryKey: ["sports"] });
  return result;
};

export const resetGlobalSportConfiguration = async (sportId, expectedVersion) => {
  const result = (await api.post(`/sports/${sportId}/configuration/reset`, null, { params: { expected_version: expectedVersion } })).data;
  await queryClient.invalidateQueries({ queryKey: ["sports"] });
  return result;
};

export const createSport = async (payload) => {
  const res = await api.post("/sports", payload);
  await queryClient.invalidateQueries({ queryKey: ["sports"] });
  return res.data;
};

export const updateSport = async (sportId, payload) => {
  const res = await api.put(`/sports/${sportId}`, payload);
  await queryClient.invalidateQueries({ queryKey: ["sports"] });
  return res.data;
};

export const deleteSport = async (sportId) => {
  const res = await api.delete(`/sports/${sportId}`);
  await queryClient.invalidateQueries({ queryKey: ["sports"] });
  return res.data;
};

export const restoreSport = async (sportId) => {
  const res = await api.patch(`/sports/${sportId}/restore`);
  await queryClient.invalidateQueries({ queryKey: ["sports"] });
  return res.data;
};

export const uploadSportImage = async (sportId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/sports/${sportId}/image`, formData);
  await queryClient.invalidateQueries({ queryKey: ["sports"] });
  return res.data;
};

export const removeSportImage = async (sportId) => {
  const res = await api.delete(`/sports/${sportId}/image`);
  await queryClient.invalidateQueries({ queryKey: ["sports"] });
  return res.data;
};
