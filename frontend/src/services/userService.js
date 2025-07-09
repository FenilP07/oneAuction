import apiClient from '../utils/apiClient.js';

/**
 * Registers a new user with the backend.
 */
export const registerUser = async (formData) => {
  try {
    const response = await apiClient.post('/user/register', formData);
    return response.data.data;
  } catch (error) {
    const message = error.message || 'Registration failed';
    console.error('Registration error:', message);
    throw new Error(message);
  }
};

/**
 * Logs in a user with the backend.
 */
export const loginUser = async (formData) => {
  try {
    const response = await apiClient.post('/user/login', formData);
    return response.data.data;
  } catch (error) {
    const message = error.message || 'Login failed. Please check your credentials.';
    console.error('Login error:', message);
    throw new Error(message);
  }
};

/**
 * Requests a password reset link for a user.
 */
export const requestPasswordReset = async (formData) => {
  try {
    const response = await apiClient.post('/user/request-password-reset', formData);
    return response.data;
  } catch (error) {
    const message = error.message || 'Failed to send reset email. Please try again.';
    console.error('Password reset request error:', message);
    throw new Error(message);
  }
};

/**
 * Resets a user’s password using a token.
 */
export const resetPassword = async (formData) => {
  try {
    const response = await apiClient.post('/user/reset-password', formData);
    return response.data;
  } catch (error) {
    const message = error.message || 'Failed to reset password. Please try again.';
    console.error('Password reset error:', message);
    throw new Error(message);
  }
};

/**
 * Logs out the current user.
 */
export const logoutUser = async () => {
  try {
    const response = await apiClient.post('/user/logout');
    localStorage.removeItem('accessToken');
    return response.data;
  } catch (error) {
    const message = error.message || 'Logout failed. Please try again.';
    console.error('Logout error:', message);
    localStorage.removeItem('accessToken');
    throw new Error(message);
  }
};

/**
 * Fetches user data by user ID.
 */
export const getUserById = async (userId) => {
  try {
    const response = await apiClient.get(`/user/${userId}`);
    return response.data.data.user; // { user, profile }
  } catch (error) {
    const message = error.message || 'Failed to fetch user data.';
    console.error('Get user error:', message);
    throw new Error(message);
  }
};

/**
 * Updates a user's profile with the backend.
 */
export const updateUserProfile = async (userId, formData) => {
  try {
    const response = await apiClient.patch(`/user/${userId}`, formData);
    return response.data.data;
  } catch (error) {
    const message = error.message || 'Failed to update user profile.';
    console.error('Update user profile error:', message);
    throw new Error(message);
  }
};