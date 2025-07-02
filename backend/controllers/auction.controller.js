import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";

import { APIResponse } from "../utils/apiResponse.js";
import Auction from "../models/auction.models.js";

import AuctionTypes from "../models/auctionTypes.models.js";
const createAuction = asyncHandler(async (req, res) => {
  const {
    auctionType_id,
    auction_title,
    auction_description,
    auction_start_time,
    auction_end_time,
    settings,
  } = req.body;

  if (
    !auctionType_id ||
    !auction_title ||
    !auction_start_time ||
    !auction_end_time
  ) {
    throw new Error(apiError(400, "Missing required fields"));
  }
  const auctionType = await AuctionTypes.findOne({ auctionType_id }).lean();
  if (!auctionType) {
    throw new apiError(404, "Auction type not found");
  }
  // Validate dates
  const startTime = new Date(auction_start_time);
  const endTime = new Date(auction_end_time);
  if (isNaN(startTime) || isNaN(endTime)) {
    return res.status(400).json({
      error: { code: "INVALID_DATE", message: "Invalid date format" },
    });
  }
  if (startTime >= endTime) {
    return res.status(400).json({
      error: {
        code: "INVALID_DATE_RANGE",
        message: "Start time must be before end time",
      },
    });
  }

  const sanitizedSettings = {};
  if (auctionType.type_name === "live") {
    if (
      !settings?.item_ids ||
      !Array.isArray(settings.item_ids) ||
      settings.item_ids.length === 0
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_ITEMS",
          message: "At least one item ID is required for live auctions",
        },
      });
    }
    const items = await Item.find({
      item_id: { $in: settings.item_ids },
      item_status: "available",
    }).lean();
    if (items.length !== settings.item_ids.length) {
      return res.status(400).json({
        error: {
          code: "INVALID_ITEMS",
          message: "One or more item IDs are invalid or unavailable",
        },
      });
    }
    sanitizedSettings.item_ids = settings.item_ids;
    sanitizedSettings.current_item_id = settings.item_ids[0];
  } else if (
    ["sealed_bid", "single_timed_item"].includes(auctionType.type_name)
  ) {
    if (!settings?.item_id) {
      return res.status(400).json({
        error: {
          code: "INVALID_ITEM",
          message:
            "Item ID is required for sealed bid or single timed item auctions",
        },
      });
    }
    const item = await Item.findOne({
      item_id: settings.item_id,
      item_status: "available",
    }).lean();
    if (!item) {
      return res.status(400).json({
        error: {
          code: "INVALID_ITEM",
          message: "Invalid or unavailable item ID",
        },
      });
    }
    sanitizedSettings.item_id = settings.item_id;
  }

  const newAuction = new Auction({
    auctioneer_id: req.user._id,
    auctionType_id,
    auction_title,
    auction_description,
    auction_start_time: startTime,
    auction_end_time: endTime,
    settings: sanitizedSettings,
  });

  await newAuction.save();
  return res
    .status(201)
    .json(
      new APIResponse(
        201,
        { auction: newAuction },
        "Auction created successfully"
      )
    );
});

export { createAuction };
