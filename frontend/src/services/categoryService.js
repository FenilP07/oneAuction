import apiClient from "../utils/apiClient";

const getAllCategories = async (options = {}) => {
  try {
    const response = await apiClient.get("/category");
    let categories = response.data.data.categories || [];

    if (options.activeOnly) {
      categories = categories.filter((category) => category.is_active);
    }

    return categories;
  } catch (error) {
    const message = error.message || "Failed to fetch categories.";
    console.error("Get all categories error:", message);
    throw new Error(message);
  }
};

export { getAllCategories };
