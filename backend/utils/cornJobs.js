import cron from "node-cron";
import mongoose from "mongoose";
import Auction from "../models/auction.models.js";
import AuctionSession from "../models/auctionSession.models.js";
import AuctionParticipant from "../models/auctionParticipants.models.js";
import AuctionType from "../models/auctionTypes.models.js";
import Item from "../models/items.models.js";
import Bid from "../models/bid.models.js";
import logger from "./logger.js";
import { moveToNextItemWithTransaction } from "../controllers/liveAuction.controllers.js";
import { redisClient } from "../app.js";

let cachedAuctionTypes = null;

const getAuctionTypes = async () => {
  if (cachedAuctionTypes) return cachedAuctionTypes;
  
  const [live, sealed, timed] = await Promise.all([
    AuctionType.findOne({ type_name: "live" }).select("_id").lean(),
    AuctionType.findOne({ type_name: "sealed_bid" }).select("_id").lean(),
    AuctionType.findOne({ type_name: "single_timed_item" }).select("_id").lean(),
  ]);
  
  cachedAuctionTypes = { live, sealed, timed };
  return cachedAuctionTypes;
};

const clearAuctionCache = async () => {
  try {
    const keys = await redisClient.keys("auctions:*");
    if (keys.length) await redisClient.del(keys);
  } catch (error) {
    logger.error(`Failed to clear auction cache: ${error.message}`);
  }
};

// Helper function to execute operations with transaction
const executeWithTransaction = async (operation, errorMessage) => {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    logger.error(`${errorMessage}: ${error.message}`);
    throw error;
  } finally {
    await session.endSession();
  }
};

// Process upcoming auctions that should become active
const processUpcomingAuctions = async (now, auctionTypes) => {
  const upcomingAuctions = await Auction.find({
    auction_status: "upcoming",
    auction_start_time: { $lte: now },
    deletedAt: null,
  }).lean();

  if (!upcomingAuctions.length) return;

  logger.info(`Processing ${upcomingAuctions.length} upcoming auctions`);

  for (const auction of upcomingAuctions) {
    try {
      await executeWithTransaction(async (session) => {
        await Auction.findByIdAndUpdate(
          auction._id,
          { auction_status: "active" },
          { session }
        );

        if (auction.auctionType_id.equals(auctionTypes.live._id)) {
          const existingSession = await AuctionSession.findOne({ 
            auction_id: auction._id 
          }).session(session);

          const sessionData = {
            status: "active",
            actual_start_time: now,
            bidding_window: new Date(Date.now() + 60 * 1000),
          };

          if (!existingSession) {
            const newSession = new AuctionSession({
              auction_id: auction._id,
              auctioneer_id: auction.auctioneer_id,
              start_time: now,
              ...sessionData,
            });
            await newSession.save({ session });
          } else {
            await AuctionSession.findByIdAndUpdate(
              existingSession._id,
              sessionData,
              { session }
            );
          }
        }

        return auction._id;
      }, `Error activating auction ${auction._id}`);

      logger.info(`Activated auction ${auction._id} (${auction.auction_title})`);
      await clearAuctionCache();
      
    } catch (error) {
      continue;
    }
  }
};

// Process expired auctions (sealed bid and timed)
const processExpiredAuctions = async (now, auctionTypes) => {
  const expiredAuctions = await Auction.find({
    auction_status: "active",
    deletedAt: null,
    auctionType_id: { $in: [auctionTypes.sealed._id, auctionTypes.timed._id] },
  }).lean();

  if (!expiredAuctions.length) return;

  logger.info(`Processing ${expiredAuctions.length} expired auctions`);

  for (const auction of expiredAuctions) {
    const deadline = auction.auctionType_id.equals(auctionTypes.sealed._id)
      ? (auction.settings.sealed_bid_deadline || auction.auction_end_time)
      : auction.auction_end_time;

    if (deadline <= now) {
      try {
        await executeWithTransaction(async (session) => {
          const itemId = auction.settings?.item_ids?.[0];
          if (!itemId) {
            logger.warn(`Auction ${auction._id} has no item_ids`);
            return;
          }

          await processAuctionWinner(auction, itemId, auctionTypes, session);
          
          await Auction.findByIdAndUpdate(
            auction._id,
            { auction_status: "completed" },
            { session }
          );

          return auction._id;
        }, `Error completing auction ${auction._id}`);

        logger.info(`Completed auction ${auction._id} (${auction.auction_title})`);
        await clearAuctionCache();
      } catch (error) {
        continue;
      }
    }
  }
};

// Helper function to process auction winner determination
const processAuctionWinner = async (auction, itemId, auctionTypes, session) => {
  const reservePrice = auction.settings?.reserve_price || 0;
  let highestBid = null;

  if (auction.auctionType_id.equals(auctionTypes.sealed._id)) {
    const bids = await Bid.find({ 
      auction_id: auction._id, 
      item_id: itemId 
    }).session(session);
    
    if (bids.length > 0) {
      highestBid = bids.reduce((max, bid) => 
        bid.amount > max.amount ? bid : max, 
        { amount: -Infinity }
      );
      // Reset all is_winner flags
      await Bid.updateMany(
        { auction_id: auction._id, item_id: itemId },
        { is_winner: false },
        { session }
      );
    }
  } else if (auction.auctionType_id.equals(auctionTypes.timed._id)) {
    highestBid = await Bid.findOne({ 
      auction_id: auction._id, 
      item_id: itemId 
    }).sort({ amount: -1 }).session(session);
  }

  if (highestBid && highestBid.amount >= reservePrice) {
    await Bid.findByIdAndUpdate(
      highestBid._id,
      { is_winner: true },
      { session }
    );
    await Item.findByIdAndUpdate(
      itemId,
      { status: "sold", winner_id: highestBid.bidder_id },
      { session }
    );
    logger.info(`Winner for auction ${auction._id}: ${highestBid.bidder_id} with amount $${highestBid.amount}`);
  } else {
    await Item.findByIdAndUpdate(
      itemId,
      { status: "unsold" },
      { session }
    );
    logger.info(`No winner for auction ${auction._id}, item marked unsold`);
  }
};

// Process active live auction sessions
const processActiveSessions = async (now, io) => {
  const activeSessions = await AuctionSession.find({
    status: "active",
    bidding_window: { $lte: now },
  }).lean();

  if (!activeSessions.length) return;

  logger.info(`Processing ${activeSessions.length} active sessions`);

  for (const session of activeSessions) {
    try {
      await executeWithTransaction(async (dbSession) => {
        const auction = await Auction.findById(session.auction_id).session(dbSession);
        if (!auction || auction.auction_status !== "active") {
          return;
        }

        const recentBids = await Bid.find({
          auction_id: auction._id,
          item_id: auction.settings?.current_item_id,
          timestamp: { $gte: new Date(now - 60 * 1000) },
        }).session(dbSession);

        if (!recentBids.length && auction.settings?.current_item_id) {
          await Item.findByIdAndUpdate(
            auction.settings.current_item_id,
            { status: "unsold" },
            { session: dbSession }
          );
          
          io.to(`session:${session._id}`).emit("itemChanged", {
            session_id: session._id,
            item_id: auction.settings.current_item_id,
            status: "unsold",
          });
        }

        return auction._id;
      }, `Error processing session ${session._id}`);

      try {
        const nextItemId = await moveToNextItemWithTransaction(
          session.auction_id, 
          session.auctioneer_id
        );
        
        if (!nextItemId) {
          logger.info(`Completed auction ${session.auction_id}`);
          io.to(`session:${session._id}`).emit("sessionEnded", { 
            session_id: session._id 
          });
          await redisClient.del(`leaderboard:${session.auction_id}`);
        } else {
          logger.info(`Moved to next item ${nextItemId} for auction ${session.auction_id}`);
        }
      } catch (err) {
        logger.error(`Failed to move to next item in auction ${session.auction_id}: ${err.message}`);
      }
      
    } catch (error) {
      continue;
    }
  }
};

const auctionCronJob = (io) => {
  logger.info("Initializing auction cron job...");

  cron.schedule("*/10 * * * * *", async () => { // Run every 10 seconds
    const startTime = Date.now();
    const now = new Date();
    
    try {
      logger.info(`[CRON] Starting auction check at ${now.toISOString()}`);

      const auctionTypes = await getAuctionTypes();

      await Promise.allSettled([
        processUpcomingAuctions(now, auctionTypes),
        processExpiredAuctions(now, auctionTypes),
        processActiveSessions(now, io),
      ]);

      const duration = Date.now() - startTime;
      logger.info(`[CRON] Auction check completed in ${duration}ms at ${new Date().toISOString()}`);
      
    } catch (error) {
      logger.error(`[CRON] Fatal error in auction cron job: ${error.message}`, {
        stack: error.stack,
        timestamp: now.toISOString(),
      });
    }
  });

  logger.info("Auction cron job started - running every 10 seconds");
};

export default auctionCronJob;
