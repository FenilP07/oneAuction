import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponse.js";
import Auction from "../models/auction.models.js";
import AuctionTypes from "../models/auctionTypes.models.js";
import Item from "../models/items.models.js";
import ItemImages from "../models/itemImages.models.js";
import Bid from "../models/bid.models.js";
import User from "../models/users.models.js";
import mongoose from "mongoose";
import upload from "../utils/cloudinary.js";
import { redisClient } from "../app.js";
import crypto from "crypto";
import AuctionType from "../models/auctionTypes.models.js";

// const createAuction = asyncHandler(async (req, res) => {
//   const {
//     auctionType_id,
//     auction_title,
//     auction_description,
//     auction_start_time,
//     auction_end_time,
//     is_invite_only,
//     settings,
//   } = req.body;

//   if (!auctionType_id || !auction_title || !auction_start_time || !auction_end_time) {
//     throw new apiError(400, "Missing required fields");
//   }

//   const auctionType = await AuctionTypes.findById(auctionType_id).lean();
//   if (!auctionType) throw new apiError(404, "Auction type not found");

//   const startTime = new Date(auction_start_time);
//   const endTime = new Date(auction_end_time);
//   if (isNaN(startTime) || isNaN(endTime)) {
//     throw new apiError(400, "Invalid date format");
//   }
//   if (startTime >= endTime) {
//     throw new apiError(400, "Start time must be before end time");
//   }

//   const sanitizedSettings = {
//     reserve_price: settings?.reserve_price || 0,
//     min_bid_increment: settings?.min_bid_increment || 1,
//   };

//   if (auctionType.type_name === "live") {
//     if (!settings?.item_ids?.length || settings.item_ids.length < 3) {
//       throw new apiError(400, "Live auctions require at least three items");
//     }
//     const items = await Item.find({
//       _id: { $in: settings.item_ids.map(id => new mongoose.Types.ObjectId(id)) },
//       status: "available",
//     }).lean();
//     if (items.length !== settings.item_ids.length) {
//       throw new apiError(400, "Invalid or unavailable items");
//     }
//     sanitizedSettings.item_ids = settings.item_ids;
//     sanitizedSettings.current_item_id = settings.item_ids[0];
//   } else if (auctionType.type_name === "sealed_bid") {
//     if (!settings?.item_id || settings.item_ids?.length > 1) {
//       throw new apiError(400, "Sealed bid auctions require exactly one item");
//     }
//     const item = await Item.findOne({
//       _id: new mongoose.Types.ObjectId(settings.item_id),
//       status: "available",
//     }).lean();
//     if (!item) {
//       throw new apiError(400, "Invalid or unavailable item");
//     }
//     sanitizedSettings.item_ids = [settings.item_id];
//     sanitizedSettings.sealed_bid_deadline = settings.sealed_bid_deadline || endTime;
//   } else if (auctionType.type_name === "single_timed_item") {
//     if (!settings?.item_id || settings.item_ids?.length > 1) {
//       throw new apiError(400, "Single timed item auctions require exactly one item");
//     }
//     const item = await Item.findOne({
//       _id: new mongoose.Types.ObjectId(settings.item_id),
//       status: "available",
//     }).lean();
//     if (!item) {
//       throw new apiError(400, "Invalid or unavailable item");
//     }
//     sanitizedSettings.item_ids = [settings.item_id];
//     sanitizedSettings.auto_extend_duration = settings.auto_extend_duration || 0;
//   }

//   const newAuction = new Auction({
//     auctioneer_id: req.user._id,
//     auctionType_id,
//     auction_title,
//     auction_description,
//     auction_start_time: startTime,
//     auction_end_time: endTime,
//     is_invite_only,
//     banner_image: req.file?.path,
//     settings: sanitizedSettings,
//   });

//   await newAuction.save();
//   const session = await mongoose.model("AuctionSession").findOne({ auction_id: newAuction._id }).lean();
//   await redisClient.del("auctions:all"); // Invalidate cache
//   return res.status(201).json(new APIResponse(201, { auction: newAuction, session }, "Auction and session created successfully"));
// });
const createAuction = asyncHandler(async (req, res) => {
  console.log("createAuction: Request body:", req.body);
  console.log("createAuction: Request file:", req.file);

  if (!req.body) {
    throw new apiError(400, "Request body is missing or invalid");
  }

  let {
    auctionType_id,
    auction_title,
    auction_description,
    auction_start_time,
    auction_end_time,
    is_invite_only,
    settings,
  } = req.body;

  if (typeof settings === "string") {
    try {
      settings = JSON.parse(settings);
    } catch (error) {
      throw new apiError(400, "Invalid settings format");
    }
  }

  is_invite_only = is_invite_only === "true" || is_invite_only === true;

  if (
    !auctionType_id ||
    !auction_title ||
    !auction_start_time ||
    !auction_end_time
  ) {
    throw new apiError(400, "Missing required fields");
  }

  const auctionType = await AuctionTypes.findById(auctionType_id).lean();
  if (!auctionType) {
    throw new apiError(404, "Auction type not found");
  }

  const startTime = new Date(auction_start_time);
  const endTime = new Date(auction_end_time);
  if (isNaN(startTime) || isNaN(endTime)) {
    throw new apiError(400, "Invalid date format");
  }
  if (startTime >= endTime) {
    throw new apiError(400, "Start time must be before end time");
  }

  const sanitizedSettings = {
    reserve_price: Number(settings?.reserve_price) || 0,
    min_bid_increment: Number(settings?.min_bid_increment) || 1,
  };

  if (auctionType.type_name === "live") {
    if (!settings?.item_ids?.length || settings.item_ids.length < 3) {
      throw new apiError(400, "Live auctions require at least three items");
    }
    const items = await Item.find({
      _id: {
        $in: settings.item_ids.map((id) => new mongoose.Types.ObjectId(id)),
      },
      status: "available",
    }).lean();
    if (items.length !== settings.item_ids.length) {
      throw new apiError(400, "Invalid or unavailable items");
    }
    sanitizedSettings.item_ids = settings.item_ids;
    sanitizedSettings.current_item_id = settings.item_ids[0];
    sanitizedSettings.reserve_price = Number(settings?.reserve_price) || minStartingBid || 0;
  } else if (auctionType.type_name === "sealed_bid") {
    if (!settings?.item_id || settings.item_ids?.length > 1) {
      throw new apiError(400, "Sealed bid auctions require exactly one item");
    }
    const item = await Item.findOne({
      _id: new mongoose.Types.ObjectId(settings.item_id),
      status: "available",
    }).lean();
    if (!item) {
      throw new apiError(400, "Invalid or unavailable item");
    }
    sanitizedSettings.item_ids = [settings.item_id];
    sanitizedSettings.sealed_bid_deadline =
      settings.sealed_bid_deadline || endTime;
      sanitizedSettings.reserve_price = Number(settings?.reserve_price) || item.starting_bid || 0;
  } else if (auctionType.type_name === "single_timed_item") {
    if (!settings?.item_id || settings.item_ids?.length > 1) {
      throw new apiError(
        400,
        "Single timed item auctions require exactly one item"
      );
    }
    const item = await Item.findOne({
      _id: new mongoose.Types.ObjectId(settings.item_id),
      status: "available",
    }).lean();
    if (!item) {
      throw new apiError(400, "Invalid or unavailable item");
    }
    sanitizedSettings.item_ids = [settings.item_id];
    sanitizedSettings.auto_extend_duration =
      Number(settings.auto_extend_duration) || 0;
      sanitizedSettings.reserve_price = Number(settings?.reserve_price) || item.starting_bid || 0;
  } else {
    throw new apiError(400, "Unsupported auction type");
  }

  try {
  const newAuction = new Auction({
    auctioneer_id: req.user._id,
    auctionType_id,
    auction_title,
    auction_description: auction_description || "",
    auction_start_time: startTime,
    auction_end_time: endTime,
    is_invite_only: !!is_invite_only,
    banner_image: req.file?.path,
    settings: sanitizedSettings,
  });

  console.log(
    "createAuction: Generated invite_code:",
    newAuction.invite_code
  );

  await newAuction.save();

  // ✅ Update item(s) status to "in_auction"
  if (sanitizedSettings.item_ids?.length) {
    await Item.updateMany(
      { _id: { $in: sanitizedSettings.item_ids } },
      { $set: { status: "in_auction" } }
    );
  }

  // Optionally: log item status change
  console.log(
    `Items moved to 'in_auction':`,
    sanitizedSettings.item_ids
  );

  const session = await mongoose
    .model("AuctionSession")
    .findOne({ auction_id: newAuction._id })
    .lean();

  await redisClient.del("auctions:all");

  const responseData = {
    auction: newAuction.toObject(),
    session: session || null,
  };

  console.log("createAuction: Response data:", responseData);

  return res
    .status(201)
    .json(
      new APIResponse(
        201,
        responseData,
        "Auction and session created successfully"
      )
    );
} catch (error) {
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors)
      .map((err) => err.message)
      .join(", ");
    throw new apiError(400, `Auction validation failed: ${messages}`);
  }
  console.error("createAuction: Unexpected error:", error);
  throw new apiError(500, `Failed to create auction: ${error.message}`);
}
});
const getAllAuctions = asyncHandler(async (req, res) => {
  const {
    search,
    type,
    status,
    sort = "starting-soon", // Default from frontend
    page: pageStr = "1",
    limit: limitStr = "10", // Default limit
  } = req.query;

  const page = parseInt(pageStr, 10) || 1;
  const limit = parseInt(limitStr, 10) || 10;
  const skip = (page - 1) * limit;

  // Build query object
  const query = { deletedAt: null };

  // Search filter (title or description)
  if (search) {
    query.$or = [
      { auction_title: { $regex: search, $options: "i" } },
      { auction_description: { $regex: search, $options: "i" } },
    ];
  }

  // Type filter (find AuctionType _id by type_name)
  if (type && type !== "all") {
    const auctionType = await AuctionType.findOne({ type_name: type }).lean();
    if (auctionType) {
      query.auctionType_id = auctionType._id;
    } else {
      // If invalid type, return empty
      return res.status(200).json(new APIResponse(200, { auctions: [], totalPages: 0, totalItems: 0, currentPage: page }, "No auctions found"));
    }
  }

  // Status filter
  if (status && status !== "all") {
    if (status === "ended") {
      query.auction_status = { $in: ["completed", "cancelled"] }; // Map 'ended' to completed/cancelled
    } else {
      query.auction_status = status;
    }
  }

  // Sort mapping
  let sortObj = {};
  switch (sort) {
    case "starting-soon":
      sortObj = { auction_start_time: 1 };
      break;
    case "ending-soon":
      sortObj = { auction_end_time: 1 };
      break;
    case "newest":
      sortObj = { createdAt: -1 };
      break;
    case "oldest":
      sortObj = { createdAt: 1 };
      break;
    case "most-bidders":
      sortObj = { "settings.unique_bidders": -1 };
      break;
    case "highest-bid":
      // This requires aggregation for max bid across items; simplify or implement as needed
      // For now, sort by reserve_price as fallback
      sortObj = { "settings.reserve_price": -1 };
      break;
    default:
      sortObj = { auction_start_time: 1 };
  }

  // Get total count for pagination
  const totalItems = await Auction.countDocuments(query);

  // Fetch auctions with filters, sort, pagination
  const auctions = await Auction.find(query)
    .sort(sortObj)
    .skip(skip)
    .limit(limit)
    .populate("auctionType_id")
    .populate("auctioneer_id", "username")
    .lean();

  const totalPages = Math.ceil(totalItems / limit);

  // Cache with query params
  const cacheKey = `auctions:all:${JSON.stringify(req.query)}`;
  const response = new APIResponse(200, { auctions, totalPages, totalItems, currentPage: page }, "Auctions retrieved successfully");
  
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return res.status(200).json(JSON.parse(cached));
  }
  await redisClient.setEx(cacheKey, 3600, JSON.stringify(response));

  return res.status(200).json(response);
});

const getAuctionById = asyncHandler(async (req, res) => {
  const { auction_id } = req.params;

  if (!auction_id) {
    throw new apiError(400, "Auction ID is required");
  }

  const cacheKey = `auction:${auction_id}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return res.status(200).json(JSON.parse(cached));
  }

  const auction = await Auction.findOne({
    _id: auction_id,
    deletedAt: null,
  })
    .populate("auctionType_id")
    .populate("auctioneer_id", "username email")
    .lean();

  if (!auction) {
    throw new apiError(404, "Auction not found");
  }

  // Get items for this auction
  const items = await Item.find({
    _id: { $in: auction.settings.item_ids },
  }).lean();

  // Get current bids for each item (only for non-sealed auctions)
  let itemsWithBids = items;
  if (auction.auctionType_id.type_name !== "sealed_bid") {
    itemsWithBids = await Promise.all(
      items.map(async (item) => {
        const highestBid = await Bid.findOne({
          auction_id,
          item_id: item._id,
        })
          .sort({ amount: -1 })
          .populate("bidder_id", "username")
          .lean();

        return {
          ...item,
          current_bid: highestBid?.amount || item.starting_bid,
          highest_bidder: highestBid?.bidder_id?.username || null,
          bid_count: await Bid.countDocuments({
            auction_id,
            item_id: item._id,
          }),
        };
      })
    );
  }

  const response = new APIResponse(
    200,
    {
      auction: {
        ...auction,
        items: itemsWithBids,
      },
    },
    "Auction retrieved successfully"
  );

  await redisClient.setEx(cacheKey, 1800, JSON.stringify(response)); // Cache for 30 minutes
  return res.status(200).json(response);
});

const getAuctionSummary = asyncHandler(async (req, res) => {
  const { auction_id } = req.params;

  if (!auction_id) {
    throw new apiError(400, "Auction ID is required");
  }

  const cacheKey = `auction:summary:${auction_id}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return res.status(200).json(JSON.parse(cached));
  }

  const auction = await Auction.findOne({
    _id: auction_id,
    deletedAt: null,
  })
    .populate("auctionType_id", "type_name")
    .populate("auctioneer_id", "username")
    .lean();

  if (!auction) {
    throw new apiError(404, "Auction not found");
  }

  // Get basic statistics
  const totalBids = await Bid.countDocuments({ auction_id });
  const uniqueBidders = await Bid.distinct("bidder_id", { auction_id });
  const totalItems = auction.settings.item_ids?.length || 0;

  // Calculate total value and sold items
  const items = await Item.find({
    _id: { $in: auction.settings.item_ids },
  }).lean();

  const soldItems = items.filter((item) => item.status === "sold");
  const totalValue = soldItems.reduce(
    (sum, item) => sum + (item.final_price || 0),
    0
  );

  // Get recent activity (last 10 bids)
  const recentBids = await Bid.find({ auction_id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("bidder_id", "username")
    .populate("item_id", "item_name")
    .lean();

  const summary = {
    auction_id: auction._id,
    auction_title: auction.auction_title,
    auction_type: auction.auctionType_id.type_name,
    auctioneer: auction.auctioneer_id.username,
    status: auction.auction_status,
    start_time: auction.auction_start_time,
    end_time: auction.auction_end_time,
    statistics: {
      total_items: totalItems,
      sold_items: soldItems.length,
      total_bids: totalBids,
      unique_bidders: uniqueBidders.length,
      total_value: totalValue,
    },
    recent_activity: recentBids.map((bid) => ({
      bidder: bid.bidder_id?.username || "Anonymous",
      item: bid.item_id?.item_name || "Unknown",
      amount: bid.amount,
      timestamp: bid.createdAt,
    })),
  };

  const response = new APIResponse(
    200,
    { summary },
    "Auction summary retrieved successfully"
  );
  await redisClient.setEx(cacheKey, 900, JSON.stringify(response)); // Cache for 15 minutes
  return res.status(200).json(response);
});

const getAuctionPreview = asyncHandler(async (req, res) => {
  const { auction_id } = req.params;

  if (!auction_id) {
    throw new apiError(400, "Auction ID is required");
  }

  const cacheKey = `auction:preview:${auction_id}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return res.status(200).json(JSON.parse(cached));
  }

  const auction = await Auction.findOne({
    _id: auction_id,
    deletedAt: null,
  })
    .populate("auctionType_id", "type_name")
    .populate("auctioneer_id", "username")
    .select(
      "auction_title auction_description banner_image auction_start_time auction_end_time auction_status is_invite_only settings"
    )
    .lean();

  if (!auction) {
    throw new apiError(404, "Auction not found");
  }

  // Get a preview of items (first 3 items with basic info)
  const previewItems = await Item.find({
    _id: { $in: auction.settings?.item_ids?.slice(0, 3) || [] },
  })
    .select("name description starting_bid current_bid")
    .lean();

  // Fetch images for each preview item
  const previewItemsWithImages = await Promise.all(
    previewItems.map(async (item) => {
      const images = await ItemImages.find({ item_id: item._id })
        .sort({ is_primary: -1, order: 1 }) // Primary first
        .select("image_url is_primary")
        .lean();
      return { ...item, images };
    })
  );

  // Get basic stats
  const totalItems = auction.settings?.item_ids?.length || 0;
  const totalBids = await Bid.countDocuments({ auction_id });

  const preview = {
    auction_id: auction._id,
    auction_title: auction.auction_title,
    auction_description: auction.auction_description,
    banner_image: auction.banner_image,
    auction_type: auction.auctionType_id.type_name,
    auctioneer: auction.auctioneer_id.username,
    status: auction.auction_status,
    start_time: auction.auction_start_time,
    end_time: auction.auction_end_time,
    is_invite_only: auction.is_invite_only,
    stats: {
      total_items: totalItems,
      total_bids: totalBids,
      unique_bidders: auction.settings?.unique_bidders || 0,
    },
    preview_items: previewItemsWithImages,
    has_more_items: totalItems > 3,
  };

  const response = new APIResponse(
    200,
    { preview },
    "Auction preview retrieved successfully"
  );
  await redisClient.setEx(cacheKey, 1800, JSON.stringify(response)); // Cache for 30 minutes
  return res.status(200).json(response);
});

const getAuctionLeaderboard = asyncHandler(async (req, res) => {
  const { auction_id } = req.params;
  const cacheKey = `leaderboard:${auction_id}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return res.status(200).json(JSON.parse(cached));
  }

  const auction = await Auction.findOne({
    _id: auction_id,
    auction_status: "completed",
  }).lean();

  if (!auction) {
    throw new apiError(404, "Auction not found or not completed");
  }

  const items = await Item.find({
    _id: { $in: auction.settings.item_ids },
  }).lean();

  const leaderboard = await Promise.all(
    items.map(async (item) => {
      const highestBid = await Bid.findOne({
        auction_id,
        item_id: item._id,
        is_winner: true,
      }).lean();

      const winner = highestBid
        ? await User.findById(highestBid.bidder_id).select("username").lean()
        : null;

      return {
        item_id: item._id,
        item_name: item.item_name,
        status: item.status,
        final_bid: highestBid ? highestBid.amount : null,
        winner: winner ? winner.username : "No winner",
      };
    })
  );

  const response = new APIResponse(
    200,
    { leaderboard },
    "Leaderboard retrieved successfully"
  );
  await redisClient.setEx(cacheKey, 3600, JSON.stringify(response));
  return res.status(200).json(response);
});

const placeSealedBid = asyncHandler(async (req, res) => {
  const { auction_id, item_id, amount, invite_code } = req.body;

  if (!auction_id || !item_id || !amount) {
    throw new apiError(400, "Auction ID, item ID, and amount are required");
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const auction = await Auction.findOne({
      _id: auction_id,
      auction_status: "active",
      "settings.item_ids": item_id,
    }).session(dbSession);

    if (!auction) {
      throw new apiError(404, "Auction or item not found");
    }

    if (auction.is_invite_only && invite_code !== auction.invite_code) {
      throw new apiError(403, "Invalid invite code");
    }

    if (new Date() > auction.settings.sealed_bid_deadline) {
      throw new apiError(400, "Sealed bid deadline has passed");
    }

    const bid = await Bid.create(
      [
        {
          auction_id,
          item_id,
          bidder_id: req.user._id,
          amount,
        },
      ],
      { session: dbSession }
    );

    await Auction.findByIdAndUpdate(
      auction_id,
      { $inc: { "settings.bid_count": 1, "settings.unique_bidders": 1 } },
      { session: dbSession }
    );

    await dbSession.commitTransaction();
    return res
      .status(201)
      .json(
        new APIResponse(201, { bid: bid[0] }, "Sealed bid placed successfully")
      );
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }
});

const revealSealedBids = asyncHandler(async (req, res) => {
  const { auction_id } = req.params;

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const auction = await Auction.findOne({
      _id: auction_id,
      auction_status: "active",
    }).session(dbSession);

    if (!auction) {
      throw new apiError(404, "Sealed bid auction not found");
    }

    const auctionType = await AuctionTypes.findOne({
      type_name: "sealed_bid",
    }).session(dbSession);
    if (!auctionType || !auction.auctionType_id.equals(auctionType._id)) {
      throw new apiError(400, "This is not a sealed bid auction");
    }

    if (new Date() < auction.settings.sealed_bid_deadline) {
      throw new apiError(400, "Cannot reveal bids before deadline");
    }

    const bids = await Bid.find({
      auction_id,
      item_id: auction.settings.item_ids[0],
    })
      .select("encrypted_amount bidder_id")
      .session(dbSession);

    const decryptedBids = bids.map((bid) => ({
      ...bid.toObject(),
      amount:
        parseInt(
          crypto
            .createHash("sha256")
            .update(bid.encrypted_amount)
            .digest("hex"),
          16
        ) % 1000000,
    }));

    const highestBid = decryptedBids.reduce(
      (max, bid) => (bid.amount > max.amount ? bid : max),
      { amount: 0 }
    );
    if (highestBid.amount >= auction.settings.reserve_price) {
      await Bid.updateOne(
        { _id: highestBid._id },
        { is_winner: true, amount: highestBid.amount },
        { session: dbSession }
      );
      await Item.findByIdAndUpdate(
        auction.settings.item_ids[0],
        { status: "sold", winner_id: highestBid.bidder_id },
        { session: dbSession }
      );
    } else {
      await Item.findByIdAndUpdate(
        auction.settings.item_ids[0],
        { status: "unsold" },
        { session: dbSession }
      );
    }

    auction.auction_status = "completed";
    await auction.save({ session: dbSession });

    await dbSession.commitTransaction();
    return res
      .status(200)
      .json(
        new APIResponse(200, { bids: decryptedBids }, "Sealed bids revealed")
      );
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }
});

const placeTimedBid = asyncHandler(async (req, res) => {
  const { auction_id, item_id, amount, invite_code } = req.body;

  if (!auction_id || !item_id || !amount) {
    throw new apiError(400, "Auction ID, item ID, and amount are required");
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const auction = await Auction.findOne({
      _id: auction_id,
      auction_status: "active",
      "settings.item_ids": item_id,
    }).session(dbSession);

    if (!auction) {
      throw new apiError(404, "Auction or item not found");
    }

    if (auction.is_invite_only && invite_code !== auction.invite_code) {
      throw new apiError(403, "Invalid invite code");
    }

    const now = new Date();
    const endTime =
      auction.settings.extended_end_time || auction.auction_end_time;
    if (now > endTime) {
      throw new apiError(400, "Auction has ended");
    }

    const item = await Item.findById(item_id).session(dbSession);
    if (!item) throw new apiError(404, "Item not found");

    const minValidBid =
      (await Bid.findOne({ item_id }).sort({ amount: -1 }).session(dbSession))
        ?.amount + auction.settings.min_bid_increment || item.starting_bid;
    if (amount < minValidBid) {
      throw new apiError(400, `Bid must be at least ${minValidBid}`);
    }

    if (
      now >= new Date(endTime - auction.settings.auto_extend_duration * 1000)
    ) {
      auction.settings.extended_end_time = new Date(
        endTime.getTime() + auction.settings.auto_extend_duration * 1000
      );
      await auction.save({ session: dbSession });
    }

    const bid = await Bid.create(
      [
        {
          auction_id,
          item_id,
          bidder_id: req.user._id,
          amount,
        },
      ],
      { session: dbSession }
    );

    await Item.findByIdAndUpdate(
      item_id,
      { current_bid: amount },
      { session: dbSession }
    );

    await Auction.findByIdAndUpdate(
      auction_id,
      { $inc: { "settings.bid_count": 1, "settings.unique_bidders": 1 } },
      { session: dbSession }
    );

    await dbSession.commitTransaction();
    return res
      .status(201)
      .json(
        new APIResponse(201, { bid: bid[0] }, "Timed bid placed successfully")
      );
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }
});
const getMyAuctions = asyncHandler(async (req, res) => {
  console.log("getMyAuctions: Fetching auctions for user:", req.user._id);

  try {
    const auctions = await Auction.find({ auctioneer_id: req.user._id })
      .populate("auctionType_id", "type_name")
      .lean();
    console.log("getMyAuctions: Found auctions:", auctions);

    return res
      .status(200)
      .json(new APIResponse(200, auctions, "Auctions fetched successfully"));
  } catch (error) {
    console.error("getMyAuctions: Unexpected error:", error);
    throw new apiError(500, `Failed to fetch auctions: ${error.message}`);
  }
});

export {
  createAuction,
  getAuctionById,
  getAuctionSummary,
  getAllAuctions,
  getAuctionPreview,
  placeSealedBid,
  revealSealedBids,
  placeTimedBid,
  getAuctionLeaderboard,
  getMyAuctions,
};
