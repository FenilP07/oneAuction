// services/itemService.js
import apiClient from "../utils/apiClient";

/**
 * Create a new item with images
 */
const createItem = async (itemData, images = []) => {
  try {
    const formData = new FormData();
    formData.append("name", itemData.name.trim());
    formData.append("description", itemData.description?.trim() || "");
    formData.append("starting_bid", itemData.starting_bid);
    formData.append("category_id", itemData.category_id);

    images.forEach((image) => {
      formData.append("images", image);
    });

    const response = await apiClient.post("/item/create", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message ||
      "Failed to create item. Please try again.";
    console.error("Create item error:", message);
    throw new Error(message);
  }
};

/**
 * Update an existing item
 */
const updateItem = async (itemId, updateData) => {
  try {
    const response = await apiClient.put(`/item/${itemId}`, updateData);
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message ||
      "Failed to update item. Please try again.";
    console.error("Update item error:", message);
    throw new Error(message);
  }
};

/**
 * Get item by ID
 */
const getItemById = async (itemId) => {
  try {
    const response = await apiClient.get(`/item/${itemId}`);
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to fetch item details.";
    console.error("Get item error:", message);
    throw new Error(message);
  }
};

/**
 * Approve an item (Admin only)
 */
const approveItem = async (itemId) => {
  try {
    const response = await apiClient.post(`/item/${itemId}/approve`);
    return response.data.data;
  } catch (error) {
    const message = error.response?.data?.message || "Failed to approve item.";
    console.error("Approve item error:", message);
    throw new Error(message);
  }
};

/**
 * Reject an item (Admin only)
 */
const rejectItem = async (itemId) => {
  try {
    const response = await apiClient.post(`/item/${itemId}/reject`);
    return response.data.data;
  } catch (error) {
    const message = error.response?.data?.message || "Failed to reject item.";
    console.error("Reject item error:", message);
    throw new Error(message);
  }
};

/**
 * Get all available items with filters
 */
const getAllItems = async (filters = {}) => {
  try {
    const response = await apiClient.get("/item/all", { params: filters });
    return response.data.data;
  } catch (error) {
    const message = error.response?.data?.message || "Failed to fetch items.";
    console.error("Get all items error:", message);
    throw new Error(message);
  }
};

/**
 * Get items created by the current user
 */
const getMyItems = async (params = {}) => {
  try {
    const response = await apiClient.get("/item/my-items", { params });
    console.log('getMyItems response:', response.data);
    return response.data?.data?.items
      ? response.data.data
      : { items: response.data.data || [], totalItems: 0, currentPage: 1, totalPages: 1 };
  } catch (error) {
    const message = error.response?.data?.message || "Failed to fetch your items.";
    console.error("Get my items error:", message, error.response?.status);
    throw new Error(message);
  }
};

/**
 * Get pending approval items (Admin only)
 */
const getPendingApprovalItems = async () => {
  try {
    const response = await apiClient.get("/admin/pending");
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message ||
      "Failed to fetch pending approval items.";
    console.error("Get pending items error:", message);
    throw new Error(message);
  }
};

/**
 * Handle item approval or rejection (Admin only)
 */
const handleItemApproval = async (itemId, action) => {
  try {
    const response = await apiClient.patch(`/admin/${itemId}`, { action });
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || `Failed to ${action} item.`;
    console.error("Handle item approval error:", message);
    throw new Error(message);
  }
};

/**
 * Get available items created by the current user
 */
const getMyAvailableItems = async (params = {}) => {
  try {
    const response = await apiClient.get("/item/my-available-items", { params });
    return response.data?.data || { items: [], totalItems: 0, currentPage: 1, totalPages: 1 };
  } catch (error) {
    const message = error.response?.data?.message || "Failed to fetch available items.";
    console.error("Get available items error:", message);
    throw new Error(message);
  }
};

export {
  createItem,
  updateItem,
  getItemById,
  approveItem,
  rejectItem,
  getAllItems,
  getMyItems,
  getPendingApprovalItems,
  handleItemApproval,
  getMyAvailableItems,
};