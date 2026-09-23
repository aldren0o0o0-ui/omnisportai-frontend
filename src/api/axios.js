// src/api/axios.js
import axios from 'axios';
import { getAccessToken, setAccessToken } from './tokenStore';
import {
  beginTrackedRequest,
  completeTrackedRequest,
  prepareTrackedRetry,
} from './requestActivity';
import { BACKEND_RUNTIME_URLS } from './realtimeUrl';
import { isDefinitiveAuthFailure } from './authFailurePolicy';
import { invalidateAfterMutation } from '../query/mutationInvalidation';

export const API_BASE_URL = BACKEND_RUNTIME_URLS.apiBaseUrl;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const SESSION_EXPIRED_EVENT = 'omnisport:session-expired';
let refreshPromise = null;

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = refreshClient.post('/auth/refresh')
      .then((response) => {
        const accessToken = response?.data?.access_token;
        if (!accessToken) throw new Error('Refresh response did not include an access token.');
        setAccessToken(accessToken);
        return accessToken;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

// Request interceptor (add token to every call)
axiosInstance.interceptors.request.use((config) => {
  beginTrackedRequest(config);
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}); 

// Response Interceptor (Handle 401 UnAuthorized errors automatically)
axiosInstance.interceptors.response.use(
  (response) => {
    completeTrackedRequest(response?.config);
    invalidateAfterMutation(response?.config);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';

    // Don't attempt refresh on auth endpoints (prevents loops)
    const isAuthEndpoint =
      url.includes('/auth/refresh') || url.includes('auth/refresh') ||
      url.includes('/auth/login') || url.includes('auth/login') ||
      url.includes('/auth/register') || url.includes('auth/register') ||
      url.includes('/auth/logout') || url.includes('auth/logout');

    // if the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const access_token = await refreshAccessToken();

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        prepareTrackedRetry(originalRequest);
        return axiosInstance(originalRequest);
      }
      catch (refreshError) {
        completeTrackedRequest(originalRequest);
        // Only an explicit authentication rejection ends the session. Network
        // and server failures must not turn a temporary outage into a logout.
        if (isDefinitiveAuthFailure(refreshError)) {
          setAccessToken(null);
          window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
        }
        return Promise.reject(refreshError);
      }
    }
    completeTrackedRequest(originalRequest);
    return Promise.reject(error);
  }
);

export default axiosInstance;
