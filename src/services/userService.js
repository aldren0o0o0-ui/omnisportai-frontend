import api from "../api/axios";

export const getMe = async () => {
  const res = await api.get("/users/me");
  return res.data;
};

export const getMyPlayerProfile = async () => {
  const res = await api.get("/users/me/player-profile");
  return res.data;
};

export const getMyRoleProfile = async ({ roleContext = null } = {}) => {
  const params = {};
  if (roleContext) {
    params.role_context = roleContext;
  }
  const res = await api.get("/users/me/profile", { params });
  return res.data;
};

export const getMyProfile = async () => {
  const res = await api.get("/users/me/profile", {
    params: { profile_mode: "user" },
  });
  return res.data;
};

export const updateMyProfile = async (payload) => {
  const res = await api.patch("/users/me/profile", payload || {});
  return res.data;
};

export const getUserProfile = async (userId, options = {}) => {
  const params = {};
  if (options?.tournamentId) {
    params.tournament_id = options.tournamentId;
  }
  const res = await api.get(`/users/${userId}/profile`, { params });
  return res.data;
};

export const likeUserProfile = async (userId) => {
  const res = await api.post(`/users/${userId}/profile/like`);
  return res.data;
};

export const unlikeUserProfile = async (userId) => {
  const res = await api.delete(`/users/${userId}/profile/like`);
  return res.data;
};

export const uploadUserProfileImage = async (userId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/users/${userId}/profile-image`, formData);
  return res.data;
};

export const removeUserProfileImage = async (userId) => {
  const res = await api.delete(`/users/${userId}/profile-image`);
  return res.data;
};
