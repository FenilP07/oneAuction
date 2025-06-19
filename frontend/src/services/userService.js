// src/services/userService.js
// import axios from "axios";

/**
 * Registers a new user with the backend.
 * @param {Object} formData - User registration data.
 * @returns {Promise<Object>} - The response data from the server.
 */
// export const registerUser = async (formData) => {
//   const response = await axios.post(
//     "http://localhost:3000/user/register",
//     formData,
//     {
//       headers: {
//         "Content-Type": "application/json",
//       },
//       withCredentials: true,
//     }
//   );

//   return response.data;
// };


// export const loginUser = async (formData) => {
//   const response = await fetch('http://localhost:3000/api/user/login', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(formData),
//   });

//   if (!response.ok) {
//     throw new Error('Login failed');
//   }

//   return response.json();
// };

import axios from "axios";

const API_BASE_URL = "http://localhost:3000/api/user";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

/**
 * Registers a new user with the backend.
 * @param {Object} formData - User registration data (firstName, lastName, email, username, password, confirmPassword).
 * @returns {Promise<Object>} - The response data from the server.
 */
export const registerUser = async (formData) => {
  try {
    const response = await axiosInstance.post("/register", formData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Registration failed. Please try again."
    );
  }
};

/**
 * Logs in a user and returns access and refresh tokens.
 * @param {Object} formData - User login data (identifier, password).
 * @returns {Promise<Object>} - The response data from the server.
 */
export const loginUser = async (formData) => {
  try {
    const response = await axiosInstance.post("/login", formData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Login failed. Please try again."
    );
  }
};

/**
 * Requests a password reset link for a user.
 * @param {Object} formData - User data (identifier).
 * @returns {Promise<Object>} - The response data from the server.
 */
export const requestPasswordReset = async (formData) => {
  try {
    const response = await axiosInstance.post("/forgot-password", formData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to send reset email. Please try again."
    );
  }
};

/**
 * Resets a user's password using a token.
 * @param {Object} formData - User data (password, confirmPassword, token).
 * @returns {Promise<Object>} - The response data from the server.
 */
export const resetPassword = async (formData) => {
  try {
    const response = await axiosInstance.post("/reset-password", formData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to reset password. Please try again."
    );
  }
};