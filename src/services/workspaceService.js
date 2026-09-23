import api from "../api/axios";
import {
  dispatchWorkspaceChanged,
  dispatchWorkspaceListChanged,
} from "./workspaceEvents";
import { cacheTimes, queryClient, queryKeys } from "../query/queryClient";

export {
  WORKSPACE_CHANGED_EVENT,
  WORKSPACE_LIST_CHANGED_EVENT,
  dispatchWorkspaceChanged,
  dispatchWorkspaceListChanged,
} from "./workspaceEvents";

export const getWorkspaces = async ({ includeArchived = true } = {}) => {
  return queryClient.fetchQuery({
    queryKey: queryKeys.workspaces(includeArchived),
    staleTime: cacheTimes.operational,
    queryFn: async ({ signal }) => (await api.get("/workspaces", { params: { include_archived: includeArchived }, signal })).data,
  });
};

export const getActiveWorkspace = async () => {
  return queryClient.fetchQuery({
    queryKey: queryKeys.activeWorkspace,
    staleTime: cacheTimes.operational,
    queryFn: async ({ signal }) => (await api.get("/workspaces/active", { signal })).data,
  });
};

export const getWorkspace = async (workspaceId) => {
  return queryClient.fetchQuery({
    queryKey: queryKeys.workspace(workspaceId),
    staleTime: cacheTimes.operational,
    queryFn: async ({ signal }) => (await api.get(`/workspaces/${workspaceId}`, { signal })).data,
  });
};

const invalidateWorkspaceCache = () => queryClient.invalidateQueries({ queryKey: ["workspaces"] });

export const createWorkspace = async (data) => {
  const res = await api.post("/workspaces", data);
  await invalidateWorkspaceCache();
  dispatchWorkspaceListChanged(res.data);
  return res.data;
};

export const updateWorkspace = async (workspaceId, data) => {
  const res = await api.patch(`/workspaces/${workspaceId}`, data);
  await invalidateWorkspaceCache();
  dispatchWorkspaceListChanged(res.data);
  return res.data;
};

export const uploadWorkspaceImage = async (workspaceId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/workspaces/${workspaceId}/image`, formData);
  await invalidateWorkspaceCache();
  dispatchWorkspaceListChanged(res.data);
  return res.data;
};

export const removeWorkspaceImage = async (workspaceId) => {
  const res = await api.delete(`/workspaces/${workspaceId}/image`);
  await invalidateWorkspaceCache();
  dispatchWorkspaceListChanged(res.data);
  return res.data;
};

export const activateWorkspace = async (workspaceId) => {
  const res = await api.post(`/workspaces/${workspaceId}/activate`);
  await invalidateWorkspaceCache();
  dispatchWorkspaceChanged(res.data?.workspace ?? res.data);
  dispatchWorkspaceListChanged(res.data?.workspace ?? res.data);
  return res.data;
};

export const completeWorkspace = async (workspaceId) => {
  const res = await api.post(`/workspaces/${workspaceId}/complete`);
  await invalidateWorkspaceCache();
  dispatchWorkspaceChanged(null);
  dispatchWorkspaceListChanged(res.data);
  return res.data;
};

export const archiveWorkspace = async (workspaceId) => {
  const res = await api.post(`/workspaces/${workspaceId}/archive`);
  await invalidateWorkspaceCache();
  dispatchWorkspaceChanged(null);
  dispatchWorkspaceListChanged(res.data);
  return res.data;
};

export const restoreWorkspace = async (workspaceId) => {
  const res = await api.post(`/workspaces/${workspaceId}/restore`);
  await invalidateWorkspaceCache();
  dispatchWorkspaceListChanged(res.data);
  return res.data;
};

export const deleteWorkspace = async (workspaceId) => {
  await api.delete(`/workspaces/${workspaceId}`);
  await invalidateWorkspaceCache();
  dispatchWorkspaceListChanged(null);
};
