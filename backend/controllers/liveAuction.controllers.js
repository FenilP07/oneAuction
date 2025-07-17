import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponse.js";
import AuctionSession from "../models/auctionSession.models.js";
import AuctionParticipant from "../models/auctionParticipants.models.js";
import Auction from "../models/auction.models.js";
import Item from "../models/items.models.js";
import Bid from "../models/bid.models.js";
import mongoose from "mongoose";
import { auctionNamespace, redisClient } from "../app.js";

const getMinimumValidBid = async (item_id, min_bid_increment) => {
  const item = await Item.findById(item_id);
  if (!item) throw new apiError(404, "Item not found");
  const highestBid = await Bid.findOne({ item_id }).sort({ amount: -1 });
  return highestBid ? highestBid.amount + min_bid_increment : item.starting_bid;
};

const getNextAvailableItemId = async (auction_id, current_item_id) => {
  const auction = await Auction.findById(auction_id);
  const currentIndex = auction.settings.item_ids.findIndex(id => id.equals(current_item_id));
  if (currentIndex === -1 || currentIndex === auction.settings.item_ids.length - 1) {
    return null;
  }
  return auction.settings.item_ids[currentIndex + 1];
};

const moveToNextItemWithTransaction = async (auction_id, user_id) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();
  try {
    const auction = await Auction.findOne({ _id: auction_id, auctioneer_id: user_id }).session(dbSession);
    if (!auction || auction.auction_status !== "active") {
      throw new apiError(403, "Auction not found or not active");
    }

    const session = await AuctionSession.findOne({ auction_id, status: "active" }).session(dbSession);
    if (!session) {
      throw new apiError(404, "Active session not found");
    }

    const currentItemId = auction.settings.current_item_id;
    if (!currentItemId) {
      throw new apiError(400, "No current item");
    }

    const highestBid = await Bid.findOne({ auction_id, item_id: currentItemId })
      .sort({ amount: -1 })
      .session(dbSession);

    const item = await Item.findById(currentItemId).session(dbSession);
    if (highestBid && highestBid.amount >= auction.settings.reserve_price) {
      item.status = "sold";
      item.winner_id = highestBid.bidder_id;
      item.final_price = highestBid.amount;
      await highestBid.updateOne({ is_winner: true }, { session: dbSession });
    } else {
      item.status = "unsold";
    }
    await item.save({ session: dbSession });

    const nextItemId = await getNextAvailableItemId(auction_id, currentItemId);
    let eventData = {};
    if (!nextItemId) {
      auction.auction_status = "completed";
      session.status = "completed";
      session.actual_end_time = new Date();
      await auction.save({ session: dbSession });
      await session.save({ session: dbSession });
      await AuctionParticipant.updateMany(
        { session_id: session._id, status: "active" },
        { status: "left", last_activity: new Date() },
        { session: dbSession }
      );
      eventData = { session_id: session._id, status: "completed" };
      auctionNamespace.to(session._id.toString()).emit("sessionEnded", eventData);
      await redisClient.del(`leaderboard:${auction._id}`);
    } else {
      auction.settings.current_item_id = nextItemId;
      session.bidding_window = new Date(Date.now() + 60 * 1000); // 1 minute for next item
      await auction.save({ session: dbSession });
      await session.save({ session: dbSession });
      eventData = { session_id: session._id, current_item_id: nextItemId, bidding_window: session.bidding_window };
      auctionNamespace.to(session._id.toString()).emit("itemChanged", eventData);
    }

    await dbSession.commitTransaction();
    return nextItemId;
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }
};

const placeBid = asyncHandler(async (req, res) => {
  const { session_id } = req.params;
  const { item_id, amount } = req.body;
  const userId = req.user._id;

  if (!item_id || !amount || amount <= 0) {
    throw new apiError(400, "Item ID and valid amount are required");
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const session = await AuctionSession.findOne({
      _id: session_id,
      status: "active",
    }).session(dbSession);

    if (!session || new Date() > session.bidding_window) {
      throw new apiError(400, "Session not active or bidding window closed");
    }

    const auction = await Auction.findOne({
      _id: session.auction_id,
      auction_status: "active",
      "settings.current_item_id": item_id,
    }).session(dbSession);

    if (!auction) {
      throw new apiError(404, "Auction or item not found");
    }

    const participant = await AuctionParticipant.findOne({
      session_id,
      user_id: userId,
      status: "active",
    }).session(dbSession);

    if (!participant) {
      throw new apiError(403, "User not a participant or not active");
    }

    const minValidBid = await getMinimumValidBid(item_id, auction.settings.min_bid_increment);
    if (amount < minValidBid) {
      throw new apiError(400, `Bid must be at least ${minValidBid}`);
    }

    const bid = await Bid.create(
      [{
        auction_id: auction._id,
        session_id,
        item_id,
        bidder_id: userId,
        amount,
      }],
      { session: dbSession }
    );

    await Item.findByIdAndUpdate(
      item_id,
      { current_bid: amount },
      { session: dbSession }
    );

    await Auction.findByIdAndUpdate(
      auction._id,
      { $inc: { "settings.bid_count": 1 } },
      { session: dbSession }
    );

    // Update unique bidders count
    const uniqueBidders = await Bid.distinct("bidder_id", { auction_id: auction._id });
    await Auction.findByIdAndUpdate(
      auction._id,
      { "settings.unique_bidders": uniqueBidders.length },
      { session: dbSession }
    );

    // Update participant's last activity
    participant.last_activity = new Date();
    await participant.save({ session: dbSession });

    session.bidding_window = new Date(Date.now() + 30 * 1000); // Extend by 30 seconds
    await session.save({ session: dbSession });

    await dbSession.commitTransaction();

    // Emit real-time event
    auctionNamespace.to(session_id).emit("bidPlaced", {
      session_id,
      item_id,
      bidder_id: userId,
      bidder_username: req.user.username,
      amount,
      bidding_window: session.bidding_window,
      timestamp: new Date(),
    });

    // Invalidate cache
    await redisClient.del(`item:bids:${item_id}`);

    return res.status(201).json(new APIResponse(201, { bid: bid[0] }, "Bid placed successfully"));
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }
});

const moveToNextItem = asyncHandler(async (req, res) => {
  const { auction_id } = req.params;
  const userId = req.user._id;

  const nextItemId = await moveToNextItemWithTransaction(auction_id, userId);
  if (!nextItemId) {
    return res.status(200).json(new APIResponse(200, {}, "Auction completed"));
  }

  const nextItem = await Item.findById(nextItemId).lean();
  return res.status(200).json(new APIResponse(200, { nextItem }, "Moved to next item"));
});

const getItemBidHistory = asyncHandler(async (req, res) => {
  const { item_id } = req.params;
  const { limit = 50, page = 1 } = req.query;

  if (!item_id) {
    throw new apiError(400, "Item ID is required");
  }

  const cacheKey = `item:bids:${item_id}:${page}:${limit}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return res.status(200).json(JSON.parse(cached));
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Get bids with pagination
  const bids = await Bid.find({ item_id })
    .populate("bidder_id", "username")
    .populate("auction_id", "auction_title")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Get total count for pagination
  const totalBids = await Bid.countDocuments({ item_id });

  // Get item details
  const item = await Item.findById(item_id)
    .select("item_name current_bid starting_bid status")
    .lean();

  if (!item) {
    throw new apiError(404, "Item not found");
  }

  // Get highest bid
  const highestBid = await Bid.findOne({ item_id })
    .sort({ amount: -1 })
    .populate("bidder_id", "username")
    .lean();

  const bidHistory = {
    item: {
      item_id: item._id,
      item_name: item.item_name,
      starting_bid: item.starting_bid,
      current_bid: item.current_bid,
      status: item.status,
      highest_bid: highestBid ? {
        amount: highestBid.amount,
        bidder: highestBid.bidder_id?.username || "Anonymous",
        timestamp: highestBid.createdAt
      } : null
    },
    bids: bids.map(bid => ({
      bid_id: bid._id,
      amount: bid.amount,
      bidder: bid.bidder_id?.username || "Anonymous",
      auction_title: bid.auction_id?.auction_title || "Unknown",
      timestamp: bid.createdAt,
      is_winner: bid.is_winner || false
    })),
    pagination: {
      current_page: parseInt(page),
      total_pages: Math.ceil(totalBids / parseInt(limit)),
      total_bids: totalBids,
      has_next: skip + parseInt(limit) < totalBids,
      has_previous: parseInt(page) > 1
    }
  };

  const response = new APIResponse(200, { bidHistory }, "Bid history retrieved successfully");
  await redisClient.setEx(cacheKey, 600, JSON.stringify(response)); // Cache for 10 minutes
  return res.status(200).json(response);
});

const getSessionStats = asyncHandler(async (req, res) => {
  const { session_id } = req.params;

  if (!session_id) {
    throw new apiError(400, "Session ID is required");
  }

  const cacheKey = `session:stats:${session_id}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return res.status(200).json(JSON.parse(cached));
  }

  const session = await AuctionSession.findById(session_id)
    .populate("auction_id", "auction_title settings")
    .lean();

  if (!session) {
    throw new apiError(404, "Session not found");
  }

  // Get session statistics
  const totalBids = await Bid.countDocuments({ session_id });
  const activeParticipants = await AuctionParticipant.countDocuments({ 
    session_id, 
    status: "active" 
  });
  const totalParticipants = await AuctionParticipant.countDocuments({ session_id });

  const stats = {
    session_id: session._id,
    auction_title: session.auction_id?.auction_title || "Unknown",
    status: session.status,
    start_time: session.start_time,
    end_time: session.end_time,
    actual_end_time: session.actual_end_time,
    bidding_window: session.bidding_window,
    current_item_id: session.auction_id?.settings?.current_item_id || null,
    statistics: {
      total_bids: totalBids,
      active_participants: activeParticipants,
      total_participants: totalParticipants,
      total_items: session.auction_id?.settings?.item_ids?.length || 0
    }
  };

  const response = new APIResponse(200, { stats }, "Session statistics retrieved successfully");
  await redisClient.setEx(cacheKey, 300, JSON.stringify(response)); 
  return res.status(200).json(response);
});

export { 
  placeBid, 
  moveToNextItem, 
  getItemBidHistory, 
  moveToNextItemWithTransaction,
  getSessionStats 
};