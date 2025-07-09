import Item from "../models/items.models.js";
import Category from "../models/categories.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponse.js";
import logger from "../utils/logger.js";
import mongoose from "mongoose";
import ItemImages from "../models/itemImages.models.js";



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



//get item by id
// export const getItemById = asyncHandler(async (req, res) => {
//   const item = await Item.findById(req.params.id).populate("category_id auctioneer_id");
//   if (!item) throw new apiError(404, "Item not found");
//   return res.status(200).json(new APIResponse(200, { item }));
// });

export const getItemById = asyncHandler(async (req, res) => {
  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    logger.warn("Invalid item ID", { itemId: req.params.id });
    throw new apiError(400, "Invalid item ID");
  }

  // Fetch item with populated category and auctioneer

  const item = await Item.findById(req.params.id)
  .populate("category_id", "name")              // Only fetch `name` from Category
  .populate("auctioneer_id", "username")       // Only fetch `full_name` from User
  .populate("approver_id", "username");        

  if (!item) {
    logger.warn("Item not found", { itemId: req.params.id });
    throw new apiError(404, "Item not found");
  }

  // Fetch associated images, sorted by order
  const images = await ItemImages.find({ item_id: item._id })
    .select("image_url is_primary order createdAt updatedAt")
    .sort({ order: 1 });

  logger.info("Retrieved item with images", {
    itemId: item._id,
    imageCount: images.length,
  });

  return res.status(200).json(
    new APIResponse(200, { item, images }, "Item and images fetched successfully")
  );
});

export const approveItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) throw new apiError(404, "Item not found");
  item.status = "available";
  await item.save();
  return res.status(200).json(new APIResponse(200, { item }, "Item approved"));
});

export const rejectItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) throw new apiError(404, "Item not found");
  item.status = "rejected";
  await item.save();
  return res.status(200).json(new APIResponse(200, { item }, "Item rejected"));
});


export { createItem, updateItem };

/**
 * @desc Get all available items for users with filters and pagination
 * @route GET /api/item/all
 */
const getAllItems = asyncHandler(async (req, res) => {
  logger.info("User request to fetch items with filters", { query: req.query });

  const { category_id, name, minBid, maxBid, page = 1, limit = 10 } = req.query;

  const filters = { status: "available" };

  if (category_id) filters.category_id = category_id;

  if (name) {
    filters.name = { $regex: name, $options: "i" };  // case-insensitive partial match
  }

  if (minBid) filters.starting_bid = { ...filters.starting_bid, $gte: parseFloat(minBid) };
  if (maxBid) filters.starting_bid = { ...filters.starting_bid, $lte: parseFloat(maxBid) };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const totalItems = await Item.countDocuments(filters);
  const items = await Item.find(filters)
    .populate("category_id", "name")
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  logger.info(`Retrieved ${items.length} items with filters`);

  return res.status(200).json(
    new APIResponse(200, {
      totalItems,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalItems / limit),
      items,
    },
    "Items fetched successfully")
  );
});

/**
 * @desc Get all items created by the logged-in user (auctioneer)
 * @route GET /api/item/my-items
 */
const getMyItems = asyncHandler(async (req, res) => {
  logger.info("Fetching items for logged-in user", { userId: req.user._id });

  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const totalItems = await Item.countDocuments({ auctioneer_id: req.user._id });

  const items = await Item.find({ auctioneer_id: req.user._id })
    .populate("category_id", "name")
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  logger.info(`Retrieved ${items.length} items for user`, { userId: req.user._id });

  return res.status(200).json(
    new APIResponse(200, {
      totalItems,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalItems / limit),
      items,
    }, "User's items fetched successfully")
  );
});


export {  getAllItems, getMyItems };

