import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponse.js";
import AuctionSession from "../models/auctionSession.models.js";
import Auction from "../models/auction.models.js";
import Item from "../models/items.models.js";
import Bid from "../models/bid.models.js";
import mongoose from "mongoose";

const moveToNextItemWithTransaction = async (auctionId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const auction = await Auction.findOne({
      _id: auctionId,
      auctioneer_id: userId,
      auction_status: "active",
    }).session(session);

    if (!auction) throw new apiError(404, "Auction not found or not active");

    const currentItem = await Item.findById(
      auction.settings.current_item_id
    ).session(session);

    // Finalize current item
    if (currentItem) {
      const winningBid = await Bid.findOne({ item_id: currentItem._id })
        .sort({ amount: -1 })
        .limit(1)
        .session(session);

      currentItem.status = winningBid ? "sold" : "unsold";
      currentItem.winner_id = winningBid?.bidder_id;
      await currentItem.save({ session });

      if (winningBid) {
        winningBid.is_winner = true;
        await winningBid.save({ session });
      }
    }

    // Get next available item
    const nextItemId = await getNextAvailableItemId(
      auction.settings.item_ids,
      auction.settings.current_item_id
    );

    if (nextItemId) {
      auction.settings.current_item_id = nextItemId;
      await auction.save({ session });
    } else {
      auction.auction_status = "completed";
      await auction.save({ session });

      await AuctionSession.updateMany(
        { auction_id: auction._id, status: "active" },
        { status: "completed", actual_end_time: new Date() },
        { session }
      );
    }

    await session.commitTransaction();
    return nextItemId;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Atomic bid placement
const placeBid = asyncHandler(async (req, res) => {
  const { session_id } = req.params;
  const { amount, item_id } = req.body;

  // Validate input
  if (!amount || !item_id) {
    throw new apiError(400, "Amount and item ID are required");
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    // 1. Validate session and item
    const session = await AuctionSession.findOne({
      _id: session_id,
      status: "active",
    }).session(dbSession);

    if (!session) throw new apiError(400, "Invalid or inactive session");

    const auction = await Auction.findOne({
      _id: session.auction_id,
      "settings.current_item_id": item_id,
    }).session(dbSession);

    if (!auction) throw new apiError(400, "Item not currently being auctioned");

    // 2. Validate participant
    const isParticipant = await AuctionParticipant.exists({
      session_id,
      user_id: req.user._id,
      status: "active",
    }).session(dbSession);

    if (!isParticipant) throw new apiError(403, "Join session to bid");

    // 3. Get current item
    const item = await Item.findById(item_id).session(dbSession);
    if (!item) throw new apiError(404, "Item not found");

    // 4. Atomic bid validation and placement
    const minValidBid = await getMinimumValidBid(item_id, dbSession);
    if (amount < minValidBid) {
      throw new apiError(400, `Bid must be at least ${minValidBid}`);
    }

    const bid = await Bid.create(
      [
        {
          auction_id: auction._id,
          session_id,
          item_id,
          bidder_id: req.user._id,
          amount,
          timestamp: new Date(),
        },
      ],
      { session: dbSession }
    );

    // 5. Update item's current price
    await Item.findByIdAndUpdate(
      item_id,
      { current_bid: amount },
      { session: dbSession }
    );

    await dbSession.commitTransaction();

    return res
      .status(201)
      .json(new APIResponse(201, { bid: bid[0] }, "Bid placed successfully"));
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }
});

// Helper functions
const getMinimumValidBid = async (itemId, session) => {
  const highestBid = await Bid.findOne({ item_id: itemId })
    .sort({ amount: -1 })
    .limit(1)
    .session(session || null);

  const item = await Item.findById(itemId).session(session || null);
  const increment = item?.bid_increment || 1;

  return highestBid ? highestBid.amount + increment : item.starting_bid;
};

const getNextAvailableItemId = async (itemIds, currentItemId) => {
  const currentIndex = itemIds.indexOf(currentItemId.toString());
  if (currentIndex === -1 || currentIndex >= itemIds.length - 1) return null;

  // Find next available item
  for (let i = currentIndex + 1; i < itemIds.length; i++) {
    const item = await Item.findById(itemIds[i]);
    if (item?.status === "available") return item._id;
  }

  return null;
};


const getItemBidHistory = asyncHandler(async (req, res) => {
  const { session_id, item_id } = req.params;

  const session = await AuctionSession.findById(session_id);
  if (!session) throw new apiError(404, "SESSION_NOT_FOUND", "Session not found");

  const item = await Item.findById(item_id);
  if (!item) throw new apiError(404, "ITEM_NOT_FOUND", "Item not found");

  const bids = await Bid.find({
    session_id,
    item_id,
  })
    .sort({ amount: -1 })
    .populate("bidder_id", "username email");

  res.status(200).json(
    new APIResponse(200, {
      count: bids.length,
      bids,
    }, "Bid history retrieved successfully")
  );
});


export { placeBid, moveToNextItemWithTransaction, getItemBidHistory };
