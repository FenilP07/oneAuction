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

const auctionCronJob = (io, redisClient) => {
  console.log("Initializing auction cron job...");

  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      console.log(`[CRON] Running auction check at ${now.toISOString()}`);

      const liveType = await AuctionType.findOne({ type_name: "live" }).select("_id").lean();
      const sealedType = await AuctionType.findOne({ type_name: "sealed_bid" }).select("_id").lean();
      const timedType = await AuctionType.findOne({ type_name: "single_timed_item" }).select("_id").lean();

      // Live Auctions: Check bidding windows
      const activeSessions = await AuctionSession.find({
        status: "active",
        bidding_window: { $lte: now },
      });

      for (const session of activeSessions) {
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();
        try {
          const auction = await Auction.findById(session.auction_id).session(dbSession);
          if (!auction || auction.auction_status !== "active") {
            throw new apiError(404, "Auction not found or not active");
          }

          const recentBids = await Bid.find({
            auction_id: auction._id,
            item_id: auction.settings.current_item_id,
            timestamp: { $gte: new Date(now - 60 * 1000) },
          }).session(dbSession);

          if (!recentBids.length) {
            const item = await Item.findById(auction.settings.current_item_id).session(dbSession);
            if (item) {
              item.status = "unsold";
              await item.save({ session: dbSession });
              io.to(session._id).emit("itemChanged", {
                session_id: session._id,
                item_id: item._id,
                status: "unsold",
              });
            }
          }

          const nextItemId = await moveToNextItemWithTransaction(auction._id, auction.auctioneer_id);
          if (!nextItemId) {
            console.log(`[CRON] Completed auction ${auction._id}`);
            io.to(session._id).emit("sessionEnded", { session_id: session._id });
            await redisClient.del(`leaderboard:${auction._id}`);
          } else {
            console.log(`[CRON] Moved to next item ${nextItemId} for auction ${auction._id}`);
          }

          await dbSession.commitTransaction();
        } catch (error) {
          await dbSession.abortTransaction();
          logger.error(`Error processing session ${session._id}: ${error.message}`);
        } finally {
          dbSession.endSession();
        }
      }

      // Live Auctions: Activate pending sessions
      const pendingSessions = await AuctionSession.find({
        status: "pending",
        start_time: { $lte: now },
      });

      for (const session of pendingSessions) {
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();
        try {
          session.status = "active";
          session.actual_start_time = new Date();
          session.bidding_window = new Date(Date.now() + 60 * 1000);
          await session.save({ session: dbSession });

          const auction = await Auction.findById(session.auction_id).session(dbSession);
          if (auction.auction_status === "upcoming") {
            auction.auction_status = "active";
            await auction.save({ session: dbSession });
          }

          await dbSession.commitTransaction();
          io.to(session._id).emit("sessionStarted", {
            session_id: session._id,
            current_item_id: auction.settings.current_item_id,
            bidding_window: session.bidding_window,
          });
        } catch (error) {
          await dbSession.abortTransaction();
          logger.error(`Error activating session ${session._id}: ${error.message}`);
        } finally {
          dbSession.endSession();
        }
      }

      // Sealed Bid and Single Timed Item Auctions
      const activeSealed = await Auction.find({
        auction_status: "active",
        auctionType_id: sealedType._id,
        "settings.sealed_bid_deadline": { $lte: now },
      });

      for (const auction of activeSealed) {
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();
        try {
          const bids = await Bid.find({ auction_id: auction._id, item_id: auction.settings.item_id })
            .select("encrypted_amount bidder_id")
            .session(dbSession);

          const decryptedBids = bids.map(bid => ({
            ...bid.toObject(),
            amount: parseInt(crypto.createHash("sha256").update(bid.encrypted_amount).digest("hex"), 16) % 1000000,
          }));

          const highestBid = decryptedBids.reduce((max, bid) => bid.amount > max.amount ? bid : max, { amount: 0 });
          if (highestBid.amount >= auction.settings.reserve_price) {
            await Bid.updateOne(
              { _id: highestBid._id },
              { is_winner: true, amount: highestBid.amount },
              { session: dbSession }
            );
            await Item.findByIdAndUpdate(
              auction.settings.item_id,
              { status: "sold", winner_id: highestBid.bidder_id },
              { session: dbSession }
            );
          } else {
            await Item.findByIdAndUpdate(
              auction.settings.item_id,
              { status: "unsold" },
              { session: dbSession }
            );
          }

          auction.auction_status = "completed";
          await auction.save({ session: dbSession });

          await dbSession.commitTransaction();
        } catch (error) {
          await dbSession.abortTransaction();
          logger.error(`Error completing sealed bid auction ${auction._id}: ${error.message}`);
        } finally {
          dbSession.endSession();
        }
      }

      const activeTimed = await Auction.find({
        auction_status: "active",
        auctionType_id: timedType._id,
        $or: [
          { auction_end_time: { $lte: now } },
          { "settings.extended_end_time": { $lte: now } },
        ],
      });

      for (const auction of activeTimed) {
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();
        try {
          const highestBid = await Bid.findOne({ auction_id: auction._id, item_id: auction.settings.item_id })
            .sort({ amount: -1 })
            .session(dbSession);

          if (highestBid && highestBid.amount >= auction.settings.reserve_price) {
            await Bid.updateOne(
              { _id: highestBid._id },
              { is_winner: true },
              { session: dbSession }
            );
            await Item.findByIdAndUpdate(
              auction.settings.item_id,
              { status: "sold", winner_id: highestBid.bidder_id },
              { session: dbSession }
            );
          } else {
            await Item.findByIdAndUpdate(
              auction.settings.item_id,
              { status: "unsold" },
              { session: dbSession }
            );
          }

          auction.auction_status = "completed";
          await auction.save({ session: dbSession });

          await dbSession.commitTransaction();
        } catch (error) {
          await dbSession.abortTransaction();
          logger.error(`Error completing timed auction ${auction._id}: ${error.message}`);
        } finally {
          dbSession.endSession();
        }
      }

      console.log(`[CRON] Auction check completed at ${new Date().toISOString()}`);
    } catch (error) {
      logger.error(`Cron job fatal error: ${error.message}`);
    }
  });

  console.log("Auction cron job started - running every minute");
};

export default auctionCronJob;