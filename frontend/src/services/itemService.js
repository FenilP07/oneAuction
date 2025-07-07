import apiClient from "../utils/apiClient";

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

    const response = await apiClient.post("item/create", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data.data;
  } catch (error) {
    const message = error.message || "Failed to create item. Please try again.";
    console.error("Create item error:", message);
    throw new Error(message);
  }
};
const updateItem = () => {};
const getItemById = () => {};
const getAllItems = () => {};
const getMyItems = () => {};
const approveItem = () => {};
const rejectItem = () => {};
const searchItems = () => {};
const getItemsByCategory = () => {};
const getItemsByPriceRange = () => {};
const getUserItemStats = () => {};

export  {
  createItem,
  updateItem,
  getItemById,
  getAllItems,
  getMyItems,
  approveItem,
  rejectItem,
  searchItems,
  getItemsByCategory,
  getItemsByPriceRange,
  getUserItemStats,
};
