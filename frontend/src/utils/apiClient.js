// utils/apiClient.js
import axios from 'axios';
import useAuthStore from '../store/authStore.js';

const CLIENT_API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: CLIENT_API,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.Authorization = `Bearer ${token}`;
    console.log('Access token set in headers:', token.substring(0, 10) + '...');
  } else {
    delete apiClient.defaults.headers.Authorization;
    console.log('Access token removed from headers');
  }
};

// Log requests for debugging
apiClient.interceptors.request.use((config) => {
  console.log('Request:', config.method.toUpperCase(), config.url, 'Headers:', {
    Authorization: config.headers.Authorization,
    params: config.params,
  });
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthError =
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/user/login') &&
      !originalRequest.url.includes('/user/register') &&
      !originalRequest.url.includes('/user/logout');

    if (isAuthError) {
      originalRequest._retryCount = originalRequest._retryCount || 0;
      if (originalRequest._retryCount >= 1) {
        console.error('Max retry attempts reached for:', originalRequest.url);
        useAuthStore.getState().clearAuth();
        setAuthToken(null);
        throw new Error('Failed to refresh token after max retries');
      }
      originalRequest._retryCount++;
      originalRequest._retry = true;
      console.warn('401 detected. Trying to refresh token...');

      try {
        const refreshResponse = await axios.post(
          `${CLIENT_API}/user/refresh-token`,
          {},
          { withCredentials: true }
        );
        const newAccessToken = refreshResponse.data.data.accessToken;
        console.log('Token refreshed:', newAccessToken.substring(0, 10) + '...');

        const { setAuth, user } = useAuthStore.getState();
        setAuth(user, newAccessToken);

        setAuthToken(newAccessToken);
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        console.log('Retrying original request:', originalRequest.url);

        return apiClient(originalRequest);
      } catch (refreshError) {
        const message =
          refreshError.response?.data?.message || 'Refresh token failed';
        console.error('Refresh token error:', message, refreshError.response?.status);
        useAuthStore.getState().clearAuth();
        setAuthToken(null);
        throw new Error(message);
      }
    }

    const message = error.response?.data?.message || 'An unexpected error occurred';
    console.error('API error:', message, error.response?.status);
    return Promise.reject(new Error(message));
  }
);

export default apiClient;