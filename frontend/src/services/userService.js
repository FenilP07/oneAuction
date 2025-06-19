// src/services/userService.js
import axios from "axios";

/**
 * Registers a new user with the backend.
 * @param {Object} formData - User registration data.
 * @returns {Promise<Object>} - The response data from the server.
 */
export const registerUser = async (formData) => {
  const response = await axios.post(
    "http://localhost:3000/user/register",
    formData,
    {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    }
  );

  return response.data;
};


export const loginUser = async (formData) => {
  const response = await fetch('http://localhost:3000/api/user/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json();
};