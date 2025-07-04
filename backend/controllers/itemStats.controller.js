// controllers/itemStats.controller.js

import Item from "../models/items.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { APIResponse } from "../utils/apiResponse.js";

export const getItemStats = asyncHandler(async (req, res) => {
  const total = await Item.countDocuments({});
  const approved = await Item.countDocuments({ status: "available" });
  const pending = await Item.countDocuments({ status: "pending_approval" });
  const rejected = await Item.countDocuments({ status: "rejected" });

  return res.status(200).json(
    new APIResponse(200, { total, approved, pending, rejected }, "Item stats fetched")
  );
});

