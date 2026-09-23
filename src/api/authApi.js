import axiosInstance from './axios';

export const authApi = {
  register: async (userData) => {
    const response = await axiosInstance.post('/auth/register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await axiosInstance.post('/auth/login', credentials);
    // data contains access_token, token_type
    return response.data;
  },

  refresh: async () => {
    const response = await axiosInstance.post('/auth/refresh');
    return response.data;
  },

  logout: async () => {
    const response = await axiosInstance.post('/auth/logout');
    return response.data;
  }
};
