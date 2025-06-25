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
      !originalRequest.url.includes("/user/register") &&
      !originalRequest.url.includes("/user/logout");

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
    const message = error.response?.data?.message || "Login failed. Please check your credentials.";
    console.error("Login error:", message);
    throw new Error(message);
  }
};

/**
 * Requests a password reset link for a user.
 */
export const requestPasswordReset = async (formData) => {
  try {
    console.log("Requesting password reset for:", formData);
    const response = await apiClient.post(
      "/user/request-password-reset",
      formData
    );
    console.log("Password reset request successful:", response.data);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Failed to send reset email. Please try again.";
    console.error("Password reset request error:", message);
    throw new Error(message);
  }
};

/**
 * Resets a user’s password using a token.
 */
export const resetPassword = async (formData) => {
  try {
    console.log("Resetting password with:", formData);
    const response = await apiClient.post("/user/reset-password", formData);
    console.log("Password reset successful:", response.data);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Failed to reset password. Please try again.";
    console.error("Password reset error:", message);
    throw new Error(message);
  }
};

/**
 * Logs out the current user.
 */
export const logoutUser = async () => {
  try {
    console.log("Logging out user...");
    const response = await apiClient.post("/user/logout");
    console.log("Logout successful:", response.data);

    localStorage.removeItem("accessToken");
    setAuthToken(null);

    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Logout failed. Please try again.";
    console.error("Logout error:", message);

    localStorage.removeItem("accessToken");
    setAuthToken(null);
    throw new Error(message);
  }
};
/**
 * Fetches user data by user ID.
 * @param {string} userId - The user ID.
 */


export const getUserById = async (userId) => {
  try {
    const response = await apiClient.get(`/user/${userId}`);
    return response.data.data.user; // this is the actual user object, containing user and profile
  } catch (error) {
    const message = error.response?.data?.message || "Failed to fetch user data.";
    throw new Error(message);
  }
};
