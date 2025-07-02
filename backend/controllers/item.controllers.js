import Item from "../models/items.models.js";
import Category from "../models/categories.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponse.js";
import logger from "../utils/logger.js";

/**
 * @desc Add a new item (only for logged-in auctioneers and active category)
 * @route POST /api/item/create
 */
const createItem = asyncHandler(async (req, res) => {
  logger.info("Add item request received", { body: req.body });

  const { name, description, starting_bid, category_id } = req.body;

  // Basic field validation
  if (!name || !starting_bid || !category_id) {
    logger.warn("Add item failed: Missing fields");
    throw new apiError(400, "Name, starting_bid and category_id are required.");
  }

  // Check category exists and is active
  const category = await Category.findById(category_id);
  if (!category) {
    logger.warn("Add item failed: Category not found", { category_id });
    throw new apiError(404, "Category not found.");
  }

  if (!category.is_active) {
    logger.warn("Add item failed: Category is not active", { category_id });
    throw new apiError(400, "Cannot add item to an inactive category.");
  }

  // Create new item
  const item = await Item.create({
    name,
    description,
    starting_bid,
    category_id,
    auctioneer_id: req.user._id,  // from authenticatedMiddleware
    status: "pending_approval",
    approval_reason: "create"
  });

  logger.info("Item created successfully", { itemId: item._id });

  return res
    .status(201)
    .json(new APIResponse(201, { item }, "Item added successfully"));
});

/**
 * @desc Update item by auctioneer — requires admin approval
 * @route PUT /api/item/:id
 */
const updateItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, starting_bid, category_id } = req.body;

  logger.info("Auctioneer update item request received", { itemId: id });

  const item = await Item.findById(id);
  if (!item) {
    logger.warn("Update failed: Item not found", { itemId: id });
    throw new apiError(404, "Item not found");
  }

  if (!item.auctioneer_id.equals(req.user._id)) {
    logger.warn("Update failed: Unauthorized auctioneer", { userId: req.user._id });
    throw new apiError(403, "You are not authorized to update this item");
  }

  if (category_id) {
    const category = await Category.findById(category_id);
    if (!category) {
      logger.warn("Update failed: Category not found", { category_id });
      throw new apiError(404, "Category not found");
    }
    if (!category.is_active) {
      logger.warn("Update failed: Inactive category", { category_id });
      throw new apiError(400, "Cannot assign to an inactive category");
    }
    item.category_id = category_id;
  }

  if (name) item.name = name;
  if (description) item.description = description;
  if (starting_bid !== undefined) {
    // If no one has bid yet (current_bid === old starting_bid)
    if (item.current_bid === item.starting_bid) {
      item.current_bid = starting_bid;
    }
    item.starting_bid = starting_bid;
  }

  // Mark status as pending_approval after any update
  item.status = "pending_approval";
  item.approval_reason = "update";

  await item.save();

  logger.info("Item updated and pending approval", { itemId: item._id });

  return res
    .status(200)
    .json(new APIResponse(200, { item }, "Item updated and pending approval"));
});

export { createItem, updateItem };
