// controllers/category.controller.js
import Category from "../models/categories.models.js";
import { apiError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import logger from "../utils/logger.js";

// Create a new category
const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const image = req.file?.path;

  logger.info("Creating category");
  if (!name) {
    throw new apiError(400, "Category name is required");
  }

  const existingCategory = await Category.findOne({ name: name.trim() });
  if (existingCategory) {
    logger.warn(`Category already exists: ${name}`);
    throw new apiError(400, "Category with this name already exists");
  }

  const category = new Category({
    name: name.trim(),
    description: description?.trim(),
    image,
  });

  await category.save();

  logger.info(`Category created: ${name}`);
  return res.status(201).json(
    new APIResponse(201, { category }, "Category created successfully")
  );
});

// Get all categories
const getAllCategory = asyncHandler(async (req, res) => {
  logger.info("Fetching all categories");
  const categories = await Category.find({}).select(
    "name description image is_active createdAt updatedAt"
  );

  if (!categories || categories.length === 0) {
    logger.warn("No categories found");
    throw new apiError(404, "No categories found");
  }

  logger.info(`Retrieved ${categories.length} categories`);
  return res
    .status(200)
    .json(
      new APIResponse(200, { categories }, "Categories retrieved successfully")
    );
});

// Get category by ID
const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Fetching category with id: ${id}`);

  if (!id) {
    throw new apiError(400, "Category ID is required");
  }

  const category = await Category.findById(id).select(
    "name description image is_active createdAt updatedAt"
  );

  if (!category) {
    logger.warn(`Category not found: ${id}`);
    throw new apiError(404, "Category not found");
  }

  logger.info(`Category retrieved: ${category.name}`);
  return res.status(200).json(
    new APIResponse(200, { category }, "Category retrieved successfully")
  );
});

// Update category
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, is_active } = req.body;
  const image = req.file?.path;

  logger.info(`Updating category with ID: ${id}`);
  if (!id) {
    throw new apiError(400, "Category ID is required");
  }

  const category = await Category.findById(id);
  if (!category) {
    logger.warn(`Category not found: ${id}`);
    throw new apiError(404, "Category not found");
  }

  if (name && name.trim() !== category.name) {
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      logger.warn(`Category name already exists: ${name}`);
      throw new apiError(400, "Category with this name already exists");
    }
    category.name = name.trim();
  }

  category.description = description !== undefined ? description.trim() : category.description;
  category.image = image || category.image;
  category.is_active = is_active !== undefined ? is_active : category.is_active;

  await category.save();

  logger.info(`Category updated: ${category.name}`);
  return res.status(200).json(
    new APIResponse(200, { category }, "Category updated successfully")
  );
});

// Delete category
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  logger.info(`Deleting category with ID: ${id}`);
  if (!id) {
    throw new apiError(400, "Category ID is required");
  }

  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    logger.warn(`Category not found: ${id}`);
    throw new apiError(404, "Category not found");
  }

  logger.info(`Category deleted: ${category.name}`);
  return res
    .status(200)
    .json(new APIResponse(200, null, "Category deleted successfully"));
});

export {
  createCategory,
  getAllCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
