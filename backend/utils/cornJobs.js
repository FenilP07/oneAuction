import cron from "node-cron";
import mongoose from "mongoose";
import Auction from "../models/auction.models.js";
import AuctionType from "../models/auctionTypes.models.js";
import Item from "../models/items.models.js";
import Bid from "../models/bid.models.js";
import logger from "./logger.js";
import { redisClient } from "../app.js";
import { decryptAmount } from "./encryption.js";

let cachedAuctionTypes = null;

const getAuctionTypes = async () => {
  if (cachedAuctionTypes) return cachedAuctionTypes;

  const [sealed, timed] = await Promise.all([
    AuctionType.findOne({ type_name: "sealed_bid" }).select("_id").lean(),
    AuctionType.findOne({ type_name: "single_timed_item" }).select("_id").lean(),
  ]);

  if (!sealed || !timed) {
    logger.error("Failed to load one or more auction types");
    throw new Error("Missing auction types in database");
  }

  cachedAuctionTypes = { sealed, timed };
  return cachedAuctionTypes;
};

const clearAuctionCache = async () => {
  try {
    const keys = await redisClient.keys("auctions:*");
    if (keys.length) await redisClient.del(keys);
    logger.debug(`Cleared ${keys.length} auction cache keys`);
  } catch (error) {
    logger.error(`Failed to clear auction cache: ${error.message}`);
  }
};

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

const processUnsoldItems = async (now) => {
  try {
    const unsoldItems = await Item.find({
      status: "unsold",
      deletedAt: null,
    }).lean();

    if (!unsoldItems.length) {
      logger.debug("No unsold items to process");
      return;
    }

    logger.info(`Processing ${unsoldItems.length} unsold items to make available`);

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

      logger.info(`Changed ${result.modifiedCount} items from 'unsold' to 'available'`);
      return result;
    }, "Error processing unsold items");
  } catch (error) {
    logger.error(`Error in processUnsoldItems: ${error.message}`);
  }
};

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
        // Double-check the auction still needs to be activated
        const currentAuction = await Auction.findById(auction._id).session(session);
        if (!currentAuction) {
          logger.debug(`Auction ${auction._id} not found`);
          return null;
        }
        if (currentAuction.auction_status !== "upcoming") {
          logger.debug(`Auction ${auction._id} already processed (status: ${currentAuction.auction_status})`);
          return null;
        }
        if (new Date(currentAuction.auction_start_time).getTime() > now.getTime()) {
          logger.debug(`Auction ${auction._id} start time (${currentAuction.auction_start_time}) is in the future`);
          return null;
        }

        logger.info(`Activating auction ${auction._id} (${auction.auction_title}) - Start time: ${auction.auction_start_time}, Current time: ${now}`);

        await Auction.findByIdAndUpdate(
          auction._id,
          {
            auction_status: "active",
            updatedAt: now,
          },
          { session }
        );

        return auction._id;
      }, `Error activating auction ${auction._id}`);

      logger.info(`✅ Successfully activated auction ${auction._id} (${auction.auction_title})`);
      await clearAuctionCache();
    } catch (error) {
      logger.error(`❌ Failed to activate auction ${auction._id}: ${error.message}`);
      continue;
    }
  }
};

const processExpiredAuctions = async (now, auctionTypes) => {
  const expiredAuctions = await Auction.find({
    auction_status: "active",
    deletedAt: null,
    auctionType_id: { $in: [auctionTypes.sealed._id, auctionTypes.timed._id] },
    $or: [
      { auction_end_time: { $lte: now } },
      { "settings.sealed_bid_deadline": { $lte: now } },
    ],
  }).lean();

  if (!expiredAuctions.length) {
    logger.debug("No expired auctions to process");
    return;
  }

  logger.info(`Processing ${expiredAuctions.length} expired auctions`);

  for (const auction of expiredAuctions) {
    const deadline = auction.auctionType_id.equals(auctionTypes.sealed._id)
      ? auction.settings?.sealed_bid_deadline || auction.auction_end_time
      : auction.auction_end_time;

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

          logger.info(`Processing winner for auction ${auction._id} - Deadline: ${deadline}, Current: ${now}`);

          await processAuctionWinner(auction, itemId, auctionTypes, session);

          await Auction.findByIdAndUpdate(
            auction._id,
            {
              auction_status: "completed",
              updatedAt: now,
            },
            { session }
          );

          return auction._id;
        }, `Error completing auction ${auction._id}`);

        logger.info(`✅ Successfully completed auction ${auction._id} (${auction.auction_title})`);
        await clearAuctionCache();
      } catch (error) {
        logger.error(`❌ Failed to complete auction ${auction._id}: ${error.message}`);
        continue;
      }
    } else {
      logger.debug(`Auction ${auction._id} not yet expired - Deadline: ${deadline}, Current: ${now}`);
    }
  }
};

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
            logger.warn(`Failed to decrypt bid ${bid._id} in auction ${auction._id}: ${error.message}`);
            actualAmount = null;
          }
          return {
            ...bid.toObject(),
            actualAmount,
          };
        })
        .filter((b) => b.actualAmount !== null);

      winnerBid = bidsWithAmounts.reduce((closest, bid) => {
        const bidDiff = Math.abs(bid.actualAmount - targetPrice);
        const closestDiff = closest ? Math.abs(closest.actualAmount - targetPrice) : Infinity;
        return bidDiff < closestDiff ? bid : closest;
      }, null);

      await Bid.updateMany(
        { auction_id: auction._id, item_id: itemId },
        { is_winner: false },
        { session }
      );

      logger.info(
        `Selected winner for sealed auction ${auction._id}: Bid amount ${winnerBid?.actualAmount}, target was ${targetPrice}`
      );
    }
  } else if (auction.auctionType_id.equals(auctionTypes.timed._id)) {
    winnerBid = await Bid.findOne({
      auction_id: auction._id,
      item_id: itemId,
    })
      .sort({ amount: -1 })
      .session(session);

    if (winnerBid) {
      logger.info(`Selected winner for timed auction ${auction._id}: Highest bid ${winnerBid.amount}`);
    }
  }

  if (winnerBid) {
    await Bid.findByIdAndUpdate(winnerBid._id, { is_winner: true }, { session });

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

const auctionCronJob = (io) => {
  logger.info("Initializing auction cron job...");

  cron.schedule("*/1 * * * * *", async () => {
    const startTime = Date.now();
    const now = new Date();

    try {
      logger.debug(`[CRON] Starting auction check at ${now.toISOString()}`);

      const auctionTypes = await getAuctionTypes();

      const promises = [
        processUpcomingAuctions(now, auctionTypes),
        processExpiredAuctions(now, auctionTypes),
        processUnsoldItems(now),
      ];

      const results = await Promise.allSettled(promises);

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const processNames = [
            "processUpcomingAuctions",
            "processExpiredAuctions",
            "processUnsoldItems",
          ];
          logger.error(`[CRON] ${processNames[index]} failed: ${result.reason?.message}`);
        }
      });

      const duration = Date.now() - startTime;
      logger.debug(`[CRON] Auction check completed in ${duration}ms at ${new Date().toISOString()}`);
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