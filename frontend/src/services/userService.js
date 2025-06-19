// src/services/userService.js
import axios from "axios";

const CLIENT_API = import.meta.env.CLIENT_API || "http://localhost:3000/api";

const apiClient = axios.create({
  baseURL: CLIENT_API,
  withCredentials: true,
});

/**
 * Sets the Authorization header for subsequent requests.
 * @param {string} token - The access token (or null to clear).
 */
export const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.Authorization = `Bearer ${token}`;
    console.log("Access token set in headers:", token);
  } else {
    delete apiClient.defaults.headers.Authorization;
    console.log("Access token removed from headers");
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthError =
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/user/login") &&
      !originalRequest.url.includes("/user/register");

    if (isAuthError) {
      originalRequest._retry = true;
      console.warn("401 detected. Trying to refresh token...");

      try {
        const refreshResponse = await axios.post(
          `${CLIENT_API}/user/refresh-token`,
          {},
          {
            withCredentials: true,
          }
        );
        const newAccessToken = refreshResponse.data.accessToken;
        console.log("Token refreshed:", newAccessToken);

        localStorage.setItem("accessToken", newAccessToken);
        setAuthToken(newAccessToken);

        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        console.log("Retrying original request...");

        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("Refresh token failed:", refreshError);
        localStorage.removeItem("accessToken");
        setAuthToken(null);
        throw refreshError;
      }
    }

    console.error("API error:", error);
    return Promise.reject(error);
  }
);

/**
 * Registers a new user with the backend.
 */
export const registerUser = async (formData) => {
  try {
    console.log("Registering user:", formData);
    const response = await apiClient.post("/user/register", formData);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Registration failed";
    console.error("Registration error:", message);
    throw new Error(message);
  }
};

/**
 * Logs in a user with the backend.
 */
export const loginUser = async (formData) => {
  try {
    console.log("Logging in user:", formData);
    const response = await apiClient.post("/user/login", formData);
    console.log("Login successful:", response.data);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.message ||
      "Login failed. Please check your credentials.";
    console.error("Login error:", message);
    throw new Error(message);
  }
};
