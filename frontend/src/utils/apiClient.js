import axios from 'axios';

const CLIENT_API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: CLIENT_API,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Set the Authorization header
export const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.Authorization = `Bearer ${token}`;
    console.log('Access token set in headers:', token);
  } else {
    delete apiClient.defaults.headers.Authorization;
    console.log('Access token removed from headers');
  }
};

// Response interceptor for token refresh
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
      originalRequest._retry = true;
      console.warn('401 detected. Trying to refresh token...');

      try {
        const refreshResponse = await axios.post(
          `${CLIENT_API}/user/refresh-token`,
          {},
          { withCredentials: true }
        );
        const newAccessToken = refreshResponse.data.data.accessToken;
        console.log('Token refreshed:', newAccessToken);

        localStorage.setItem('accessToken', newAccessToken);
        setAuthToken(newAccessToken);

        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        console.log('Retrying original request...');

        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('Refresh token failed:', refreshError);
        localStorage.removeItem('accessToken');
        setAuthToken(null);
        throw refreshError;
      }
    }

    const message = error.response?.data?.message || 'An unexpected error occurred';
    console.error('API error:', message);
    return Promise.reject(new Error(message));
  }
);

export default apiClient;