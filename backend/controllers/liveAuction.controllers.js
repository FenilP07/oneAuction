import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponse.js";
import AuctionSession from "../models/auctionSession.models.js";
import Auction from "../models/auction.models.js";
import Item from "../models/item.models.js";
import Bid from "../models/bid.model.js";
import mongoose from "mongoose";

/**
 * @desc Get current item in live auction session
 */
const getCurrentItem = asyncHandler(async (req, res) => {
  const { session_id } = req.params;

  const session = await AuctionSession.findById(session_id);
  if (!session) {
    throw new apiError(404, "Session not found");
  }

  const auction = await Auction.findById(session.auction_id);
  if (!auction) {
    throw new apiError(404, "Auction not found");
  }

  // Get current item details
  const currentItem = await Item.findById(auction.settings.current_item_id);
  if (!currentItem) {
    throw new apiError(404, "Current item not found");
  }

  // Get highest bid for current item
  const highestBid = await Bid.findOne({ item_id: currentItem._id })
    .sort({ amount: -1 })
    .limit(1)
    .populate("bidder_id", "username");

  return res.status(200).json(
    new APIResponse(
      200,
      {
        currentItem,
        highestBid,
        nextItemId: getNextItemId(auction), // Helper function to get next item
        biddingOpen:
          session.status === "active" &&
          auction.settings.current_item_id === currentItem._id,
      },
      "Current item retrieved successfully"
    )
  );
});

/**
 * @desc Place a bid on current item
 */
const placeBid = asyncHandler(async (req, res) => {
  const { session_id } = req.params;
  const { amount } = req.body;

  // Validate input
  if (!amount || isNaN(amount)) {
    throw new apiError(400, "Valid bid amount is required");
  }

  const session = await AuctionSession.findById(session_id);
  if (!session || session.status !== "active") {
    throw new apiError(400, "Session is not active");
  }

  const auction = await Auction.findById(session.auction_id);
  if (!auction) {
    throw new apiError(404, "Auction not found");
  }

  const currentItem = await Item.findById(auction.settings.current_item_id);
  if (!currentItem) {
    throw new apiError(404, "Current item not found");
  }

  // Check if user is a participant
  const isParticipant = await AuctionParticipant.findOne({
    session_id,
    User_id: req.user._id,
    status: "active",
  });
  if (!isParticipant) {
    throw new apiError(403, "You must join the session to bid");
  }

  // Get current highest bid
  const highestBid = await Bid.findOne({ item_id: currentItem._id })
    .sort({ amount: -1 })
    .limit(1);

  // Validate bid amount
  const minimumBid = highestBid
    ? highestBid.amount + (currentItem.bid_increment || 1)
    : currentItem.starting_bid;

  if (amount < minimumBid) {
    throw new apiError(400, `Bid must be at least ${minimumBid}`);
  }

  // Create new bid
  const bid = new Bid({
    auction_id: auction._id,
    session_id,
    item_id: currentItem._id,
    bidder_id: req.user._id,
    amount,
  });

  await bid.save();

  // Update current price on item
  currentItem.current_bid = amount;
  await currentItem.save();

  return res
    .status(201)
    .json(new APIResponse(201, { bid }, "Bid placed successfully"));
});

/**
 * @desc Move to next item in auction (auctioneer only)
 */
const moveToNextItem = asyncHandler(async (req, res) => {
  const { session_id } = req.params;

  const session = await AuctionSession.findById(session_id);
  if (!session) {
    throw new apiError(404, "Session not found");
  }

  const auction = await Auction.findById(session.auction_id);
  if (!auction) {
    throw new apiError(404, "Auction not found");
  }

  // Verify auctioneer
  if (!auction.auctioneer_id.equals(req.user._id)) {
    throw new apiError(403, "Only the auctioneer can perform this action");
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();
  try {
    // 1. Determine winner for current item
    const currentItemId = auction.settings.current_item_id;
    const currentItem = await Item.findById(currentItemId).session(dbSession);

    if (currentItem) {
      const winningBid = await Bid.findOne({ item_id: currentItemId })
        .sort({ amount: -1 })
        .limit(1)
        .session(dbSession);

      if (winningBid) {
        winningBid.is_winner = true;
        await winningBid.save({ session: dbSession });

        currentItem.winner_id = winningBid.bidder_id;
        currentItem.status = "sold";
        await currentItem.save({ session: dbSession });
      } else {
        currentItem.status = "unsold";
        await currentItem.save({ session: dbSession });
      }
    }

    // 2. Move to next item
    const nextItemId = getNextItemId(auction);
    if (nextItemId) {
      auction.settings.current_item_id = nextItemId;
      await auction.save({ session: dbSession });
    } else {
      // No more items - end session
      session.status = "completed";
      session.actual_end_time = new Date();
      await session.save({ session: dbSession });

      auction.auction_status = "completed";
      await auction.save({ session: dbSession });
    }

    await dbSession.commitTransaction();
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }

  return res.status(200).json(
    new APIResponse(
      200,
      {
        currentItemId: auction.settings.current_item_id,
        sessionStatus: session.status,
      },
      "Moved to next item successfully"
    )
  );
});

// Helper function to get next item ID
function getNextItemId(auction) {
  if (!auction.settings.item_ids || !auction.settings.current_item_id) {
    return null;
  }

  const currentIndex = auction.settings.item_ids.indexOf(
    auction.settings.current_item_id.toString()
  );

  if (
    currentIndex === -1 ||
    currentIndex >= auction.settings.item_ids.length - 1
  ) {
    return null;
  }

  return auction.settings.item_ids[currentIndex + 1];
}

export { getCurrentItem, placeBid, moveToNextItem };
