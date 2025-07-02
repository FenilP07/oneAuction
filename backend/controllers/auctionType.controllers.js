import AuctionTypes from "../models/auctionTypes.models.js";
import { APIResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Create Auction Type
const createAuctionType = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const type = await AuctionTypes.create({
    name,
    description,
  });

  return res
    .status(201)
    .json(new APIResponse(201, { type }, "Auction Type added successfully"));
});

// Get All Auction Types
const getAllAuctionTypes = asyncHandler(async (req, res) => {
  const types = await AuctionTypes.find({});

  return res
    .status(200)
    .json(new APIResponse(200, { types }, "Auction Types fetched successfully"));
});

// Update Auction Type
const updateAuctionType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, is_active } = req.body;

  const updatedType = await AuctionTypes.findByIdAndUpdate(
    id,
    { name, description, is_active },
    { new: true, runValidators: true }
  );

  if (!updatedType) {
    return res
      .status(404)
      .json(new APIResponse(404, null, "Auction Type not found"));
  }

  return res
    .status(200)
    .json(new APIResponse(200, { updatedType }, "Auction Type updated successfully"));
});

export { createAuctionType, getAllAuctionTypes, updateAuctionType };
