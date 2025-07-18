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
import { decryptAmount } from "./encryption.js";

let cachedAuctionTypes = null;

const getAuctionTypes = async () => {
  if (cachedAuctionTypes) return cachedAuctionTypes;

  const [live, sealed, timed] = await Promise.all([
    AuctionType.findOne({ type_name: "live" }).select("_id").lean(),
    AuctionType.findOne({ type_name: "sealed_bid" }).select("_id").lean(),
    AuctionType.findOne({ type_name: "single_timed_item" })
      .select("_id")
      .lean(),
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

// NEW: Function to change unsold items to available
const processUnsoldItems = async (now) => {
  try {
    const unsoldItems = await Item.find({
      status: "unsold",
      deletedAt: null,
    }).lean();

    if (!unsoldItems.length) return;

    logger.info(
      `Processing ${unsoldItems.length} unsold items to make available`
    );

    await executeWithTransaction(async (session) => {
      const result = await Item.updateMany(
        {
          status: "unsold",
          deletedAt: null,
        },
        {
          status: "available",
          winner_id: null,
          updated_at: now,
        },
        { session }
      );

      logger.info(
        `Changed ${result.modifiedCount} items from 'unsold' to 'available'`
      );
      return result;
    }, "Error processing unsold items");
  } catch (error) {
    logger.error(`Error in processUnsoldItems: ${error.message}`);
  }
};

// 🔧 FIXED: Process upcoming auctions that should become active
const processUpcomingAuctions = async (now, auctionTypes) => {
  const upcomingAuctions = await Auction.find({
    auction_status: "upcoming",
    auction_start_time: { $lte: now },
    deletedAt: null,
  }).lean();

  if (!upcomingAuctions.length) {
    logger.debug("No upcoming auctions to process");
    return;
  }

  logger.info(`Processing ${upcomingAuctions.length} upcoming auctions`);

  for (const auction of upcomingAuctions) {
    try {
      await executeWithTransaction(async (session) => {
        // 🔧 FIX: Double-check the auction still needs to be activated
        const currentAuction = await Auction.findById(auction._id).session(
          session
        );
        if (!currentAuction || currentAuction.auction_status !== "upcoming") {
          logger.debug(`Auction ${auction._id} already processed or not found`);
          return null;
        }

        logger.info(
          `Activating auction ${auction._id} (${auction.auction_title}) - Start time: ${auction.auction_start_time}, Current time: ${now}`
        );

        await Auction.findByIdAndUpdate(
          auction._id,
          {
            auction_status: "active",
            updatedAt: now, // 🔧 FIX: Ensure updatedAt is set
          },
          { session }
        );

        // 🔧 FIX: Handle live auction sessions properly
        if (auction.auctionType_id.equals(auctionTypes.live._id)) {
          const existingSession = await AuctionSession.findOne({
            auction_id: auction._id,
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
            logger.info(`Created new session for live auction ${auction._id}`);
          } else {
            await AuctionSession.findByIdAndUpdate(
              existingSession._id,
              sessionData,
              { session }
            );
            logger.info(
              `Updated existing session for live auction ${auction._id}`
            );
          }
        }

        return auction._id;
      }, `Error activating auction ${auction._id}`);

      logger.info(
        `✅ Successfully activated auction ${auction._id} (${auction.auction_title})`
      );
      await clearAuctionCache();
    } catch (error) {
      logger.error(
        `❌ Failed to activate auction ${auction._id}: ${error.message}`
      );
      continue;
    }
  }
};

// 🔧 FIXED: Process expired auctions (sealed bid and timed)
const processExpiredAuctions = async (now, auctionTypes) => {
  const expiredAuctions = await Auction.find({
    auction_status: "active",
    deletedAt: null,
    auctionType_id: { $in: [auctionTypes.sealed._id, auctionTypes.timed._id] },
  }).lean();

  if (!expiredAuctions.length) {
    logger.debug("No expired auctions to process");
    return;
  }

  logger.info(`Processing ${expiredAuctions.length} expired auctions`);

  for (const auction of expiredAuctions) {
    const deadline = auction.auctionType_id.equals(auctionTypes.sealed._id)
      ? auction.settings.sealed_bid_deadline || auction.auction_end_time
      : auction.auction_end_time;

    // 🔧 FIX: Better deadline comparison
    const deadlineTime = new Date(deadline).getTime();
    const nowTime = now.getTime();

    if (deadlineTime <= nowTime) {
      try {
        await executeWithTransaction(async (session) => {
          const itemId = auction.settings?.item_ids?.[0];
          if (!itemId) {
            logger.warn(`Auction ${auction._id} has no item_ids`);
            return;
          }

          logger.info(
            `Processing winner for auction ${auction._id} - Deadline: ${deadline}, Current: ${now}`
          );

          await processAuctionWinner(auction, itemId, auctionTypes, session);

          await Auction.findByIdAndUpdate(
            auction._id,
            {
              auction_status: "completed",
              updatedAt: now, // 🔧 FIX: Ensure updatedAt is set
            },
            { session }
          );

          return auction._id;
        }, `Error completing auction ${auction._id}`);

        logger.info(
          `✅ Successfully completed auction ${auction._id} (${auction.auction_title})`
        );
        await clearAuctionCache();
      } catch (error) {
        logger.error(
          `❌ Failed to complete auction ${auction._id}: ${error.message}`
        );
        continue;
      }
    } else {
      logger.debug(
        `Auction ${auction._id} not yet expired - Deadline: ${deadline}, Current: ${now}`
      );
    }
  }
};

// 🔧 FIXED: Helper function to process auction winner determination
const processAuctionWinner = async (auction, itemId, auctionTypes, session) => {
  const targetPrice = auction.settings?.reserve_price ?? 0;
  let winnerBid = null;

  if (auction.auctionType_id.equals(auctionTypes.sealed._id)) {
    const bids = await Bid.find({
      auction_id: auction._id,
      item_id: itemId,
    }).session(session);

    logger.info(`Found ${bids.length} bids for sealed auction ${auction._id}`);

    if (bids.length > 0) {
      const bidsWithAmounts = bids
        .map((bid) => {
          let actualAmount;
          try {
            actualAmount = decryptAmount(bid.encrypted_amount);
          } catch (error) {
            logger.warn(
              `Failed to decrypt bid ${bid._id} in auction ${auction._id}: ${error.message}`
            );
            actualAmount = null;
          }
          return {
            ...bid.toObject(),
            actualAmount,
          };
        })
        .filter((b) => b.actualAmount !== null);

      // Closest bid to reserve/target price wins
      winnerBid = bidsWithAmounts.reduce((closest, bid) => {
        const bidDiff = Math.abs(bid.actualAmount - targetPrice);
        const closestDiff = closest
          ? Math.abs(closest.actualAmount - targetPrice)
          : Infinity;
        return bidDiff < closestDiff ? bid : closest;
      }, null);

      // Reset all bids to not winner
      await Bid.updateMany(
        { auction_id: auction._id, item_id: itemId },
        { is_winner: false },
        { session }
      );

      logger.info(
        `Selected winner for sealed auction ${auction._id}: Bid amount ${winnerBid.actualAmount}, target was ${targetPrice}`
      );
    }
  } else if (auction.auctionType_id.equals(auctionTypes.timed._id)) {
    // Timed auctions use highest bid
    winnerBid = await Bid.findOne({
      auction_id: auction._id,
      item_id: itemId,
    })
      .sort({ amount: -1 })
      .session(session);

    if (winnerBid) {
      logger.info(
        `Selected winner for timed auction ${auction._id}: Highest bid ${winnerBid.amount}`
      );
    }
  }

  if (winnerBid) {
    await Bid.findByIdAndUpdate(
      winnerBid._id,
      { is_winner: true },
      { session }
    );

    await Item.findByIdAndUpdate(
      itemId,
      { status: "sold", winner_id: winnerBid.bidder_id },
      { session }
    );

    logger.info(
      `✅ Winner for auction ${auction._id}: ${winnerBid.bidder_id} won with $${winnerBid.actualAmount || winnerBid.amount}, target was $${targetPrice}`
    );
  } else {
    await Item.findByIdAndUpdate(itemId, { status: "unsold" }, { session });

    logger.info(`❌ No winner for auction ${auction._id}, item marked unsold`);
  }
};

// Process active live auction sessions
const processActiveSessions = async (now, io) => {
  const activeSessions = await AuctionSession.find({
    status: "active",
    bidding_window: { $lte: now },
  }).lean();

  if (!activeSessions.length) {
    logger.debug("No active sessions to process");
    return;
  }

  logger.info(`Processing ${activeSessions.length} active sessions`);

  for (const session of activeSessions) {
    try {
      await executeWithTransaction(async (dbSession) => {
        const auction = await Auction.findById(session.auction_id).session(
          dbSession
        );
        if (!auction || auction.auction_status !== "active") {
          logger.debug(
            `Session ${session._id} auction not active or not found`
          );
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
            session_id: session._id,
          });
          await redisClient.del(`leaderboard:${session.auction_id}`);
        } else {
          logger.info(
            `Moved to next item ${nextItemId} for auction ${session.auction_id}`
          );
        }
      } catch (err) {
        logger.error(
          `Failed to move to next item in auction ${session.auction_id}: ${err.message}`
        );
      }
    } catch (error) {
      logger.error(`Error processing session ${session._id}: ${error.message}`);
      continue;
    }
  }
};

// 🔧 FIXED: Main cron job with better error handling and logging
const auctionCronJob = (io) => {
  logger.info("Initializing auction cron job...");

  cron.schedule("*/10 * * * * *", async () => {
    // Run every 10 seconds
    const startTime = Date.now();
    const now = new Date();

    try {
      logger.debug(`[CRON] Starting auction check at ${now.toISOString()}`);

      const auctionTypes = await getAuctionTypes();

      if (!auctionTypes.live || !auctionTypes.sealed || !auctionTypes.timed) {
        logger.error("[CRON] Failed to load auction types");
        return;
      }

      const promises = [
        processUpcomingAuctions(now, auctionTypes),
        processExpiredAuctions(now, auctionTypes),
        processActiveSessions(now, io),
        processUnsoldItems(now),
      ];

      const results = await Promise.allSettled(promises);

      // 🔧 FIX: Log any rejected promises
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const processNames = [
            "processUpcomingAuctions",
            "processExpiredAuctions",
            "processActiveSessions",
            "processUnsoldItems",
          ];
          logger.error(
            `[CRON] ${processNames[index]} failed: ${result.reason?.message}`
          );
        }
      });

      const duration = Date.now() - startTime;
      logger.debug(
        `[CRON] Auction check completed in ${duration}ms at ${new Date().toISOString()}`
      );
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
