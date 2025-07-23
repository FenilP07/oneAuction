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
import { auctionNamespace, redisClient } from "../app.js";
import crypto from "crypto";
import AuctionType from "../models/auctionTypes.models.js";
import { encryptAmount, decryptAmount } from "../utils/encryption.js";
import {emitAuctionStatusUpdate} from "../utils/socketUtils.js"
import logger from "../utils/logger.js";

const formatTimeLeft = (ms) => {
  if (ms <= 0) return "Ended";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
};
const createAuction = asyncHandler(async (req, res) => {
  const {
    auctionType_id,
    auction_title,
    auction_description,
    auction_start_time,
    auction_end_time,
    is_invite_only: rawIsInviteOnly,
    settings,
    hint,
  } = req.body;

  if (!req.body) {
    throw new apiError(400, "Request body is missing or invalid");
  }

  let parsedSettings;
  if (typeof settings === "string") {
    try {
      parsedSettings = JSON.parse(settings);
    } catch (error) {
      throw new apiError(400, "Invalid settings format");
    }
  } else {
    parsedSettings = settings;
  }

  const is_invite_only = rawIsInviteOnly === "true" || rawIsInviteOnly === true;

  if (
    !auctionType_id ||
    !auction_title ||
    !auction_start_time ||
    !auction_end_time
  ) {
    throw new apiError(400, "Missing required fields");
  }

  if (!mongoose.Types.ObjectId.isValid(auctionType_id)) {
    throw new apiError(400, "Invalid auction type ID");
  }

  const auctionType = await AuctionType.findById(auctionType_id).lean();
  if (auctionType.type_name === "sealed_bid") {
    if (!hint || typeof hint !== "string" || hint.trim().length === 0) {
      throw new apiError(400, "Hint is required for sealed bid auctions");
    }
    if (hint.trim().length > 200) {
      throw new apiError(400, "Hint must be 200 characters or less");
    }
  }

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
    reserve_price: Number(parsedSettings?.reserve_price) || 0,
    min_bid_increment: Number(parsedSettings?.min_bid_increment) || 1,
  };

  if (auctionType.type_name === "live") {
    if (
      !parsedSettings?.item_ids?.length ||
      parsedSettings.item_ids.length < 3
    ) {
      throw new apiError(400, "Live auctions require at least three items");
    }
    const itemIds = parsedSettings.item_ids.map((id) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new apiError(400, `Invalid item ID: ${id}`);
      }
      return new mongoose.Types.ObjectId(id);
    });
    const items = await Item.find({
      _id: { $in: itemIds },
      status: "available",
    }).lean();
    if (items.length !== itemIds.length) {
      throw new apiError(400, "Invalid or unavailable items");
    }
    sanitizedSettings.item_ids = itemIds;
    sanitizedSettings.current_item_id = itemIds[0];
    sanitizedSettings.reserve_price =
      Number(parsedSettings?.reserve_price) || items[0]?.starting_bid || 0;
  } else if (auctionType.type_name === "sealed_bid") {
    if (!parsedSettings?.item_id || parsedSettings.item_ids?.length > 1) {
      throw new apiError(400, "Sealed bid auctions require exactly one item");
    }
    if (!mongoose.Types.ObjectId.isValid(parsedSettings.item_id)) {
      throw new apiError(400, `Invalid item ID: ${parsedSettings.item_id}`);
    }
    const item = await Item.findOne({
      _id: new mongoose.Types.ObjectId(parsedSettings.item_id),
      status: "available",
    }).lean();
    if (!item) {
      throw new apiError(400, "Invalid or unavailable item");
    }
    sanitizedSettings.item_ids = [parsedSettings.item_id];
    sanitizedSettings.sealed_bid_deadline =
      new Date(parsedSettings.sealed_bid_deadline) || endTime;
    if (sanitizedSettings.sealed_bid_deadline > endTime) {
      throw new apiError(
        400,
        "Sealed bid deadline cannot be after auction end time"
      );
    }
    sanitizedSettings.reserve_price =
      Number(parsedSettings?.reserve_price) || item.starting_bid || 0;
  } else if (auctionType.type_name === "single_timed_item") {
    if (!parsedSettings?.item_id || parsedSettings.item_ids?.length > 1) {
      throw new apiError(
        400,
        "Single timed item auctions require exactly one item"
      );
    }
    if (!mongoose.Types.ObjectId.isValid(parsedSettings.item_id)) {
      throw new apiError(400, `Invalid item ID: ${parsedSettings.item_id}`);
    }
    const item = await Item.findOne({
      _id: new mongoose.Types.ObjectId(parsedSettings.item_id),
      status: "available",
    }).lean();
    if (!item) {
      throw new apiError(400, "Invalid or unavailable item");
    }
    sanitizedSettings.item_ids = [parsedSettings.item_id];
    sanitizedSettings.auto_extend_duration =
      Number(parsedSettings.auto_extend_duration) || 0;
    sanitizedSettings.reserve_price =
      Number(parsedSettings?.reserve_price) || item.starting_bid || 0;
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
      hint: hint || "",
      is_invite_only: !!is_invite_only,
      banner_image: req.file?.path,
      settings: sanitizedSettings,
    });

    await newAuction.save();

    // Update item(s) status to "in_auction"
    if (sanitizedSettings.item_ids?.length) {
      await Item.updateMany(
        { _id: { $in: sanitizedSettings.item_ids } },
        { $set: { status: "in_auction" } }
      );
    }

    // Emit WebSocket event for auction creation
    emitAuctionStatusUpdate(newAuction);

    // Invalidate relevant caches
    await redisClient.del(`auctions:all:*`);
    await redisClient.del("auctions:all");

    const responseData = {
      auction: newAuction.toObject(),
      session: null,
    };

    return res
      .status(201)
      .json(new APIResponse(201, responseData, "Auction created successfully"));
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      throw new apiError(400, `Auction validation failed: ${messages}`);
    }
    throw new apiError(500, `Failed to create auction: ${error.message}`);
  }
});
const getAllAuctions = asyncHandler(async (req, res) => {
  const {
    search,
    type,
    status,
    sort = "newest",
    page: pageStr = "1",
    limit: limitStr = "10",
  } = req.query;

  const page = parseInt(pageStr, 10) || 1;
  const limit = parseInt(limitStr, 10) || 10;
  const skip = (page - 1) * limit;

  // Create a sorted query string for cache key
  const sortedQuery = Object.keys(req.query)
    .sort()
    .reduce((obj, key) => {
      obj[key] = req.query[key];
      return obj;
    }, {});
  const cacheKey = `auctions:all:${JSON.stringify(sortedQuery)}`;

  // Check cache first
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return res.status(200).json(JSON.parse(cached));
  }

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
    const cacheTypeKey = `auctionType:${type}`;
    let auctionType = await redisClient.get(cacheTypeKey);
    if (!auctionType) {
      auctionType = await AuctionType.findOne({ type_name: type }).lean();
      if (auctionType) {
        await redisClient.setEx(
          cacheTypeKey,
          86400,
          JSON.stringify(auctionType)
        ); // Cache for 24 hours
      }
    } else {
      auctionType = JSON.parse(auctionType);
    }

    if (auctionType) {
      query.auctionType_id = auctionType._id;
    } else {
      return res
        .status(200)
        .json(
          new APIResponse(
            200,
            { auctions: [], totalPages: 0, totalItems: 0, currentPage: page },
            "No auctions found"
          )
        );
    }
  }

  // Status filter
  if (status && status !== "all") {
    if (status === "ended") {
      query.auction_status = { $in: ["completed", "cancelled"] };
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
      // Use aggregation for highest bid
      break;
    default:
      sortObj = { auction_start_time: 1 };
  }

  // Use aggregation for highest-bid sort or standard query for others
  let auctions = [];
  let totalItems = 0;

  if (sort === "highest-bid") {
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "items",
          localField: "settings.item_ids",
          foreignField: "_id",
          as: "items",
        },
      },
      {
        $lookup: {
          from: "bids",
          localField: "settings.item_ids",
          foreignField: "item_id",
          as: "bids",
        },
      },
      {
        $addFields: {
          maxBid: {
            $max: [
              { $ifNull: ["$bids.amount", 0] },
              { $ifNull: ["$settings.reserve_price", 0] },
            ],
          },
        },
      },
      { $sort: { maxBid: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "auctiontypes",
          localField: "auctionType_id",
          foreignField: "_id",
          as: "auctionType_id",
        },
      },
      { $unwind: "$auctionType_id" },
      {
        $lookup: {
          from: "users",
          localField: "auctioneer_id",
          foreignField: "_id",
          as: "auctioneer_id",
        },
      },
      { $unwind: "$auctioneer_id" },
      {
        $project: {
          auction_title: 1,
          auction_description: 1,
          auctionType_id: { type_name: 1, description: 1, is_active: 1 },
          auctioneer_id: { username: 1, email: 1 },
          auction_status: 1,
          auction_start_time: 1,
          auction_end_time: 1,
          hint: 1,
          banner_image: 1,
          is_invite_only: 1,
          settings: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];

    const result = await Auction.aggregate([
      ...pipeline,
      {
        $facet: {
          auctions: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    auctions = result[0].auctions;
    totalItems = result[0].totalCount[0]?.count || 0;
  } else {
    auctions = await Auction.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .populate("auctionType_id", "type_name description is_active")
      .populate("auctioneer_id", "username")
      .lean();

    totalItems = await Auction.countDocuments(query);
  }

  const totalPages = Math.ceil(totalItems / limit);

  const response = new APIResponse(
    200,
    { auctions, totalPages, totalItems, currentPage: page },
    "Auctions retrieved successfully"
  );

  await redisClient.setEx(cacheKey, 3600, JSON.stringify(response)); // Cache for 1 hour

  return res.status(200).json(response);
});

const getAuctionById = asyncHandler(async (req, res) => {
  const { auction_id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(auction_id)) {
    throw new apiError(400, "Invalid auction ID");
  }

  const cacheKey = `auction:${auction_id}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return res.status(200).json(JSON.parse(cached));
  }

  // Get the auction
  const auction = await Auction.findOne({
    _id: auction_id,
    deletedAt: null,
  })
    .populate("auctionType_id", "type_name description is_active")
    .populate("auctioneer_id", "username email")
    .populate({
      path: "bid_history",
      select: "bidder_id item_id amount encrypted_amount timestamp",
      populate: { path: "bidder_id", select: "username" },
      options: { sort: { createdAt: -1 }, limit: 50 },
    })
    .lean();

  if (!auction) {
    throw new apiError(404, "Auction not found");
  }

  // Get the item documents
  const itemIds = auction.settings?.item_ids || [];
  const items = await Item.find({ _id: { $in: itemIds } }).lean();

  // Get related images from ItemImages
  const images = await ItemImages.find({ item_id: { $in: itemIds } })
    .sort({ is_primary: -1, order: 1 })
    .lean();

  // Group images by item_id
  const imageMap = images.reduce((acc, img) => {
    const key = img.item_id.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(img);
    return acc;
  }, {});

  // Add images to each item
  let itemsWithExtras = items.map((item) => ({
    ...item,
    images: imageMap[item._id.toString()] || [],
  }));

  // For non-sealed auctions: calculate live bid stats
  if (auction.auctionType_id.type_name !== "sealed_bid") {
    itemsWithExtras = await Promise.all(
      itemsWithExtras.map(async (item) => {
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
  } else {
    // Hide amounts in sealed bids if auction is still running
    auction.bid_history = auction.bid_history.map((bid) => ({
      ...bid,
      amount: auction.auction_status === "completed" ? bid.amount : undefined,
      encrypted_amount: undefined,
      bidder_username: bid.bidder_id?.username || "Anonymous",
      bidder_id: bid.bidder_id?._id,
    }));
  }

  // Standardize bid_history for frontend
  auction.bid_history = auction.bid_history.map((bid) => ({
    bidder_id: bid.bidder_id,
    bidder_username: bid.bidder_username,
    amount: bid.amount,
    item_id: bid.item_id,
    timestamp: bid.timestamp,
  }));

  const response = new APIResponse(
    200,
    {
      auction: {
        ...auction,
        items: itemsWithExtras,
      },
    },
    "Auction retrieved successfully"
  );

  await redisClient.setEx(cacheKey, 1800, JSON.stringify(response)); // Cache for 30 minutes
  return res.status(200).json(response);
});

const getAuctionSummary = asyncHandler(async (req, res) => {
  const { auction_id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(auction_id)) {
    throw new apiError(400, "Invalid auction ID");
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
      unique_bidders: auction.settings.unique_bidders || 0, // Use stored value
      total_value: totalValue,
    },
    recent_activity: recentBids.map((bid) => ({
      bidder: bid.bidder_id?.username || "Anonymous",
      item: bid.item_id?.item_name || "Unknown",
      amount:
        auction.auctionType_id.type_name === "sealed_bid" &&
        auction.auction_status !== "completed"
          ? undefined
          : bid.amount,
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

  if (!mongoose.Types.ObjectId.isValid(auction_id)) {
    throw new apiError(400, "Invalid auction ID");
  }

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

  console.log("Items found:", items); // DEBUG: Check number of items

  // For single-item auctions
  if (items.length === 1) {
    const item_id = items[0]._id;

    // Aggregate to get the highest bid per bidder
    const bids = await Bid.aggregate([
      {
        $match: {
          item_id: new mongoose.Types.ObjectId(item_id),
          auction_id: new mongoose.Types.ObjectId(auction_id),
        },
      },
      {
        $group: {
          _id: "$bidder_id",
          bid_amount: { $max: "$amount" }, // or "$encrypted_amount" if applicable
          bid_time: { $max: "$createdAt" }, // Take the latest bid time for the max bid
          is_winner: { $max: "$is_winner" }, // Preserve winner status
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "bidder",
        },
      },
      {
        $unwind: "$bidder",
      },
      {
        $sort: { bid_amount: -1, bid_time: 1 }, // Highest bid first, earliest time for ties
      },
      {
        $project: {
          bidder_id: "$_id",
          username: "$bidder.username",
          bid_amount: 1,
          bid_time: 1,
          is_winner: 1,
        },
      },
    ]);

    console.log("Aggregated bids:", bids); // DEBUG: Check aggregated bids

    if (bids.length === 0) {
      const response = new APIResponse(
        200,
        {
          item_id: item_id,
          item_name: items[0].name,
          item_description: items[0].description,
          starting_bid: items[0].starting_bid,
          current_bid: items[0].current_bid,
          status: items[0].status,
          total_bids: 0,
          unique_bidders: 0,
          leaderboard: [],
          winner: null,
          auction_title: auction.auction_title,
          auction_status: auction.auction_status,
          auction_start_time: auction.auction_start_time,
          auction_end_time: auction.auction_end_time,
        },
        "No bids found for this item"
      );
      await redisClient.setEx(cacheKey, 1800, JSON.stringify(response));
      return res.status(200).json(response);
    }

    // Create leaderboard with rankings
    const leaderboard = bids.map((bid, index) => ({
      rank: index + 1,
      bidder_id: bid.bidder_id,
      username: bid.username || "Anonymous",
      bid_amount: bid.bid_amount,
      bid_time: bid.bid_time,
      is_winner: bid.is_winner || false,
      is_current_highest: index === 0,
    }));

    const response = new APIResponse(
      200,
      {
        item_id: item_id,
        item_name: items[0].name,
        item_description: items[0].description,
        starting_bid: items[0].starting_bid,
        current_bid: items[0].current_bid,
        status: items[0].status,
        total_bids: bids.length, // Total bids is now unique per bidder
        unique_bidders: bids.length,
        leaderboard,
        winner:
          leaderboard.length > 0
            ? {
                rank: 1,
                username: leaderboard[0].username,
                winning_bid: leaderboard[0].bid_amount,
                bid_time: leaderboard[0].bid_time,
              }
            : null,
        auction_title: auction.auction_title,
        auction_status: auction.auction_status,
        auction_start_time: auction.auction_start_time,
        auction_end_time: auction.auction_end_time,
      },
      "Item leaderboard retrieved successfully"
    );

    await redisClient.setEx(cacheKey, 1800, JSON.stringify(response));
    return res.status(200).json(response);
  }

  // For multi-item auctions (unchanged)
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
        item_name: item.name,
        item_description: item.description,
        status: item.status,
        starting_bid: item.starting_bid,
        current_bid: item.current_bid,
        final_bid: highestBid
          ? highestBid.amount || highestBid.encrypted_amount
          : null,
        winner: winner ? winner.username : "No winner",
        winner_id: winner ? winner._id : null,
        total_bids: await Bid.countDocuments({ auction_id, item_id: item._id }),
      };
    })
  );

  const response = new APIResponse(
    200,
    {
      leaderboard,
      auction_title: auction.auction_title,
      auction_status: auction.auction_status,
      total_items: items.length,
      auction_start_time: auction.auction_start_time,
      auction_end_time: auction.auction_end_time,
    },
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

  if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
    throw new apiError(401, "Invalid user ID");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log(
      "placeSealedBid: Starting transaction for auction:",
      auction_id
    );

    const auction = await Auction.findOne({
      _id: auction_id,
      auction_status: "active",
      "settings.item_ids": { $in: [item_id] }, // ✅ Fixed: handles array correctly
    }).session(session);

    if (!auction) {
      throw new apiError(404, "Auction or item not found");
    }

    if (auction.is_invite_only && invite_code !== auction.invite_code) {
      throw new apiError(403, "Invalid invite code");
    }

    const now = Date.now();
    const deadline = new Date(auction.settings.sealed_bid_deadline).getTime();

    if (now > deadline) {
      await Auction.findByIdAndUpdate(
        auction_id,
        { auction_status: "completed" },
        { session }
      );
      throw new apiError(400, "Sealed bid deadline has passed");
    }

    const item = await Item.findById(item_id).session(session).lean();
    if (!item) throw new apiError(404, "Item not found");

    const hasBidBefore = await Bid.exists({
      auction_id,
      bidder_id: req.user._id,
    }).session(session);

    if (hasBidBefore) {
      throw new apiError(400, "You have already placed a sealed bid");
    }

    const encryptedAmount = encryptAmount(amount);

    const bid = await Bid.create(
      [
        {
          auction_id,
          item_id,
          bidder_id: req.user._id,
          encrypted_amount: encryptedAmount,
          timestamp: new Date(),
        },
      ],
      { session }
    );

    console.log(
      `placeSealedBid: hasBidBefore=${hasBidBefore}, bidder_id=${req.user._id}, auction_id=${auction_id}, new_bid_id=${bid[0]._id}`
    );

    const update = {
      $inc: {
        "settings.bid_count": 1,
        "settings.unique_bidders": 1,
      },
      $push: {
        bid_history: bid[0]._id,
      },
    };

    await Auction.findByIdAndUpdate(auction_id, update, { session });

    await session.commitTransaction();
    console.log(
      "placeSealedBid: Transaction committed for auction:",
      auction_id
    );

    return res
      .status(201)
      .json(
        new APIResponse(201, { bid: bid[0] }, "Sealed bid placed successfully")
      );
  } catch (error) {
    await session.abortTransaction();
    console.error(
      "placeSealedBid: Transaction aborted for auction:",
      auction_id,
      error
    );
    throw error;
  } finally {
    session.endSession();
  }
});

const revealSealedBids = asyncHandler(async (req, res) => {
  const { auction_id } = req.params;

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const auction = await Auction.findOne({
      _id: new mongoose.Types.ObjectId(auction_id),
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

    const decryptedBids = bids.map((bid) => {
      let amount;
      try {
        amount = decryptAmount(bid.encrypted_amount);
      } catch {
        amount = null;
      }
      return {
        ...bid.toObject(),
        amount,
      };
    });

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

    await redisClient.del(`auction:${auction_id}`);
    await redisClient.del(`auction:summary:${auction_id}`);
    await redisClient.del(`auction:preview:${auction_id}`);
    await redisClient.del(`leaderboard:${auction_id}`);

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

  if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
    throw new apiError(401, "Invalid user ID");
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    // Fetch auction with validation
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
      await Auction.findByIdAndUpdate(
        auction_id,
        { auction_status: "completed" },
        { session: dbSession }
      );
      throw new apiError(400, "Auction has ended");
    }

    // Fetch item
    const item = await Item.findById(item_id).session(dbSession);
    if (!item) throw new apiError(404, "Item not found");

    // Validate bid amount
    const highestBid = await Bid.findOne({ item_id })
      .sort({ amount: -1 })
      .session(dbSession);
    const minValidBid =
      (highestBid?.amount || item.starting_bid) +
      (auction.settings.min_bid_increment || 1);
    if (amount < minValidBid) {
      throw new apiError(400, `Bid must be at least ${minValidBid}`);
    }

    // Create new bid
    const bid = await Bid.create(
      [
        {
          auction_id,
          item_id,
          bidder_id: req.user._id,
          amount,
          timestamp: new Date(),
        },
      ],
      { session: dbSession }
    );

    // Update item with current bid and highest bidder
    await Item.findByIdAndUpdate(
      item_id,
      {
        current_bid: amount,
        highest_bidder: req.user._id,
        bid_count: (item.bid_count || 0) + 1,
      },
      { session: dbSession }
    );

    // Check for existing bids by this user, excluding the current bid
    const hasBidBefore = await Bid.exists({
      auction_id,
      bidder_id: req.user._id,
      _id: { $ne: bid[0]._id },
    }).session(dbSession);

    console.log(
      `placeTimedBid: hasBidBefore=${hasBidBefore}, bidder_id=${req.user._id}, auction_id=${auction_id}, new_bid_id=${bid[0]._id}`
    );

    // Update auction with bid count, unique bidders, and bid history
    const update = {
      $inc: {
        "settings.bid_count": 1,
        "settings.unique_bidders": hasBidBefore ? 0 : 1,
      },
      $push: {
        bid_history: bid[0]._id, // Store Bid ObjectId
      },
    };

    await Auction.findByIdAndUpdate(auction_id, update, { session: dbSession });

    await dbSession.commitTransaction();

    // Fetch user for bidder_username
    const user = await User.findById(req.user._id).select("username").lean();
    const bidder_username = user?.username || "Anonymous";

    // Fetch the full bid with populated bidder_id for socket event
    const fullBid = await Bid.findById(bid[0]._id)
      .populate("bidder_id", "username")
      .lean();
    const bidData = {
      ...fullBid,
      bidder_username: fullBid.bidder_id?.username || "Anonymous",
    };

    // Emit socket event
    auctionNamespace.to(auction_id.toString()).emit("timeBidPlaced", bidData);

    // Invalidate cache
    await redisClient.del(`auction:${auction_id}`);

    return res
      .status(201)
      .json(
        new APIResponse(201, { bid: bid[0] }, "Timed bid placed successfully")
      );
  } catch (error) {
    await dbSession.abortTransaction();
    console.error("placeTimedBid: Transaction aborted", error);
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

const getSealedBidLeaderboard = asyncHandler(async (req, res) => {
  const { auction_id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(auction_id)) {
    throw new apiError(400, "Invalid auction ID");
  }

  const cacheKey = `sealed_leaderboard:${auction_id}`;
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

  const itemId = auction.settings.item_ids[0]; // sealed bid is for 1 item
  const bids = await Bid.find({ auction_id, item_id: itemId }).lean();

  const decryptedBids = bids.map((bid) => {
    let amount;
    try {
      amount = decryptAmount(bid.encrypted_amount);
    } catch {
      amount = null;
    }
    return {
      bidder_id: bid.bidder_id,
      amount,
      is_winner: bid.is_winner || false,
      bid_id: bid._id, // Keep bid ID for reference
    };
  });

  const sortedBids = decryptedBids
    .filter((b) => b.amount !== null)
    .sort((a, b) => b.amount - a.amount) // highest first for display
    .reverse(); // Actually, let's keep highest first

  // SAFETY CHECK: Ensure only one winner
  const winnersFromDB = sortedBids.filter((bid) => bid.is_winner);

  if (winnersFromDB.length > 1) {
    console.warn(
      `Multiple winners detected for auction ${auction_id}:`,
      winnersFromDB
    );

    // Reset all winners first
    sortedBids.forEach((bid) => (bid.is_winner = false));

    // Find the actual winner based on your business logic
    // Option 1: If you have a target value in auction settings
    if (auction.settings?.target_value) {
      const targetValue = auction.settings.target_value;
      let closestBid = null;
      let minDifference = Infinity;

      sortedBids.forEach((bid) => {
        const difference = Math.abs(bid.amount - targetValue);
        if (difference < minDifference) {
          minDifference = difference;
          closestBid = bid;
        }
      });

      if (closestBid) {
        closestBid.is_winner = true;
        console.log(
          `Selected winner for auction ${auction_id}: ${closestBid.bidder_id} with $${closestBid.amount} (target: $${targetValue})`
        );
      }
    }
    // Option 2: If no target value, use the first winner from DB (or implement your own logic)
    else {
      const actualWinner = winnersFromDB[0];
      const winnerIndex = sortedBids.findIndex(
        (bid) => bid.bid_id.toString() === actualWinner.bid_id.toString()
      );
      if (winnerIndex !== -1) {
        sortedBids[winnerIndex].is_winner = true;
        console.log(
          `Selected first winner for auction ${auction_id}: ${actualWinner.bidder_id}`
        );
      }
    }

    // Update the database to fix the inconsistency
    try {
      // First, reset all bids to not winner
      await Bid.updateMany(
        { auction_id, item_id: itemId },
        { is_winner: false }
      );

      // Then set the correct winner
      const correctWinner = sortedBids.find((bid) => bid.is_winner);
      if (correctWinner) {
        await Bid.updateOne({ _id: correctWinner.bid_id }, { is_winner: true });
        console.log(`Fixed winner in database for auction ${auction_id}`);
      }
    } catch (error) {
      console.error(
        `Failed to fix winner in database for auction ${auction_id}:`,
        error
      );
    }
  }

  const leaderboard = await Promise.all(
    sortedBids.map(async (bid) => {
      const user = await User.findById(bid.bidder_id).select("username").lean();
      return {
        bidder_username: user?.username || "Anonymous",
        amount: bid.amount,
        is_winner: bid.is_winner,
      };
    })
  );

  const stats = {
    totalBids: leaderboard.length,
    averageBid:
      leaderboard.length > 0
        ? leaderboard.reduce((acc, b) => acc + b.amount, 0) / leaderboard.length
        : 0,
    highestBid:
      leaderboard.length > 0
        ? Math.max(...leaderboard.map((b) => b.amount))
        : 0,
  };

  const response = new APIResponse(
    200,
    { leaderboard, stats },
    "Sealed bid leaderboard retrieved"
  );

  await redisClient.setEx(cacheKey, 3600, JSON.stringify(response));
  return res.status(200).json(response);
});

const getMyBids = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new apiError(401, "Unauthorized");

  const userBids = await Bid.find({ bidder_id: userId })
    .sort({ createdAt: -1 })
    .populate({
      path: "auction_id",
      select:
        "auction_title auction_status auction_end_time auctionType_id settings",
      populate: { path: "auctionType_id", select: "type_name" },
    })
    .populate({
      path: "item_id",
      select:
        "name status starting_bid current_bid highest_bidder final_price winner_id",
    })
    .lean();

  if (userBids.length === 0) {
    return res.status(200).json(
      new APIResponse(
        200,
        {
          stats: { bidsPlaced: 0, itemsWon: 0, totalSpent: 0 },
          active: [],
          won: [],
          lost: [],
          history: [],
        },
        "No bids found"
      )
    );
  }

  const byItem = new Map();
  for (const bid of userBids) {
    const a = bid.auction_id;
    const i = bid.item_id;
    const key = `${a?._id}|${i?._id}`;
    if (!byItem.has(key)) {
      byItem.set(key, bid);
    } else {
      const existing = byItem.get(key);
      if ((bid.amount ?? 0) > (existing.amount ?? 0)) {
        byItem.set(key, bid);
      }
    }
  }

  const allItemIds = [...byItem.values()]
    .map((b) => b.item_id?._id)
    .filter(Boolean);
  const bidsByItem = await Bid.aggregate([
    {
      $match: {
        item_id: {
          $in: allItemIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
    },
    {
      $group: {
        _id: "$item_id",
        topAmount: { $max: "$amount" },
        topBidId: { $first: "$_id" },
      },
    },
  ]);

  const topAmountMap = new Map();
  for (const r of bidsByItem) {
    topAmountMap.set(r._id.toString(), r.topAmount ?? 0);
  }

  const active = [],
    won = [],
    lost = [];

  for (const bid of byItem.values()) {
    const auction = bid.auction_id || {};
    const item = bid.item_id || {};
    const auctionType = auction.auctionType_id?.type_name;
    const isAuctionCompleted = auction.auction_status === "completed";

    const sealedDeadline = auction.settings?.sealed_bid_deadline
      ? new Date(auction.settings.sealed_bid_deadline)
      : null;
    const extendedEnd = auction.settings?.extended_end_time
      ? new Date(auction.settings.extended_end_time)
      : null;
    const endTime =
      sealedDeadline && auctionType === "sealed_bid"
        ? sealedDeadline
        : extendedEnd || new Date(auction.auction_end_time);
    const timeLeft = formatTimeLeft(endTime - Date.now());

    let shownAmount = bid.amount;
    if (auctionType === "sealed_bid" && !isAuctionCompleted) {
      shownAmount = undefined;
    }

    let status;
    if (isAuctionCompleted) {
      status = bid.is_winner ? "won" : "lost";
    } else if (auctionType === "sealed_bid") {
      status = "sealed_submitted";
    } else {
      const topAmt =
        topAmountMap.get(item._id?.toString()) ?? item.current_bid ?? 0;
      status = bid.amount >= topAmt ? "leading" : "outbid";
    }

    const finalPrice = isAuctionCompleted
      ? (item.final_price ?? bid.amount ?? null)
      : null;

    const record = {
      bid_id: bid._id,
      auction_id: auction._id,
      auction_title: auction.auction_title,
      auction_status: auction.auction_status,
      auction_type: auctionType,
      item_id: item._id,
      item_name: item.name,
      item_status: item.status,
      amount: shownAmount,
      final_price: finalPrice,
      is_winner: !!bid.is_winner,
      status,
      timeLeft,
      createdAt: bid.createdAt,
    };

    if (isAuctionCompleted) {
      (bid.is_winner ? won : lost).push(record);
    } else {
      active.push(record);
    }
  }

  const itemsWon = won.length;
  const totalSpent = won.reduce(
    (sum, r) => sum + (typeof r.final_price === "number" ? r.final_price : 0),
    0
  );
  const bidsPlaced = byItem.size;

  const history = userBids.slice(0, 25).map((b) => ({
    bid_id: b._id,
    auction_id: b.auction_id?._id,
    item_id: b.item_id?._id,
    amount: b.amount,
    is_winner: b.is_winner,
    createdAt: b.createdAt,
  }));

  return res.status(200).json(
    new APIResponse(
      200,
      {
        stats: { bidsPlaced, itemsWon, totalSpent },
        active,
        won,
        lost,
        history,
      },
      "Bidder data retrieved."
    )
  );
});
const endAuctionEarly = asyncHandler(async (req, res) => {
  const { auctionId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(auctionId)) {
    throw new apiError(400, "Invalid auction ID format");
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const userId = req.user?._id;

      if (!userId) {
        throw new apiError(
          401,
          "User authentication required - no user ID found"
        );
      }

      const auction = await Auction.findOne({
        _id: auctionId,
        deletedAt: null,
      })
        .populate("auctionType_id")
        .session(session);

      if (!auction) {
        throw new apiError(404, "Auction not found");
      }

      if (
        !auction.auctioneer_id ||
        auction.auctioneer_id.toString() !== userId.toString()
      ) {
        throw new apiError(
          403,
          "Only the auctioneer can end their own auction"
        );
      }

      const validStatusesForEarlyEnd = ["upcoming", "active", "paused"];
      if (!validStatusesForEarlyEnd.includes(auction.auction_status)) {
        throw new apiError(
          400,
          `Cannot end auction with status: ${auction.auction_status}`
        );
      }

      const auctionType = auction.auctionType_id;
      const updateData = {
        auction_status: "completed",
        auction_end_time: new Date(),
      };

      if (auctionType.type_name === "sealed_bid") {
        updateData["settings.sealed_bid_deadline"] = new Date();
      } else if (auctionType.type_name === "single_timed_item") {
        updateData["settings.extended_end_time"] = null;
      }

      const updatedAuction = await Auction.findByIdAndUpdate(
        auctionId,
        updateData,
        {
          new: true,
          session,
          runValidators: false,
        }
      ).populate("auctionType_id settings.item_ids");

      if (
        auction.settings.bid_count === 0 &&
        auction.settings.item_ids?.length > 0
      ) {
        await Item.updateMany(
          { _id: { $in: auction.settings.item_ids } },
          { status: "available" },
          { session }
        );
      } else if (
        auction.settings.bid_count > 0 &&
        auction.settings.item_ids?.length > 0
      ) {
        if (auctionType.type_name !== "sealed_bid") {
          const items = await Item.find({
            _id: { $in: auction.settings.item_ids },
          }).session(session);

          for (const item of items) {
            const highestBid = await Bid.findOne({
              auction_id: auctionId,
              item_id: item._id,
            })
              .sort({ amount: -1 })
              .session(session);

            if (
              highestBid &&
              highestBid.amount >= auction.settings.reserve_price
            ) {
              await Item.findByIdAndUpdate(
                item._id,
                {
                  status: "sold",
                  winner_id: highestBid.bidder_id,
                  final_price: highestBid.amount,
                },
                { session }
              );

              await Bid.findByIdAndUpdate(
                highestBid._id,
                { is_winner: true },
                { session }
              );
            } else {
              await Item.findByIdAndUpdate(
                item._id,
                { status: "unsold" },
                { session }
              );
            }
          }
        } else {
          await Item.updateMany(
            { _id: { $in: auction.settings.item_ids } },
            { status: "unsold" },
            { session }
          );
        }
      }

      // Emit WebSocket events
      emitAuctionStatusUpdate(updatedAuction); // Add this
      try {
        auctionNamespace.to(auctionId.toString()).emit("auctionEndedEarly", {
          auction_id: auctionId,
          status: "completed",
          ended_at: new Date(),
          previous_end_time: auction.auction_end_time,
          total_bids: auction.settings.bid_count,
          unique_bidders: auction.settings.unique_bidders,
        });
      } catch (socketError) {
        logger.error(
          `Failed to emit auctionEndedEarly for auction ${auctionId}:`,
          socketError
        );
      }

      // Invalidate caches
      try {
        await redisClient.del(`auction:${auctionId}`);
        await redisClient.del(`auction:summary:${auctionId}`);
        await redisClient.del(`auction:preview:${auctionId}`);
        await redisClient.del(`leaderboard:${auctionId}`);
        const allAuctionsKeys = await redisClient.keys(`auctions:all:*`);
        if (allAuctionsKeys.length > 0) {
          await redisClient.del(allAuctionsKeys);
        }
      } catch (redisError) {
        logger.error(
          `Failed to clear caches for auction ${auctionId}:`,
          redisError
        );
      }

      return res.status(200).json(
        new APIResponse(
          200,
          {
            auction: updatedAuction,
            endedAt: updateData.auction_end_time,
            previousEndTime: auction.auction_end_time,
            totalBids: auction.settings.bid_count,
            uniqueBidders: auction.settings.unique_bidders,
          },
          "Auction ended successfully"
        )
      );
    });
  } catch (error) {
    logger.error("Error ending auction early:", error);
    throw error instanceof apiError
      ? error
      : new apiError(500, `Internal server error while ending auction: ${error.message}`);
  } finally {
    await session.endSession();
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
  getSealedBidLeaderboard,
  decryptAmount,
  getMyBids,
  endAuctionEarly
};
