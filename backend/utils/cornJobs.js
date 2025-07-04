import cron from "node-cron";
import mongoose from "mongoose";
import Auction from "../models/auction.models.js";
import AuctionSession from "../models/auctionSession.models.js"
import AuctionParticipant from "../models/auctionParticipants.models.js";
import AuctionType from "../models/auctionTypes.models.js";
import logger from "./logger.js"

// Helper function to generate session code
const generateSessionCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Main cron job function
const auctionCronJob = () => {
  console.log("Initializing auction session cron job...");
  
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      console.log(`[CRON] Running auction session check at ${now.toISOString()}`);
      
      // Get live auction type
      const liveAuctionType = await AuctionType.findOne({ type_name: "live" }).select("_id");
      
      if (!liveAuctionType) {
        logger.error("Live auction type not found in database");
        return;
      }

      // 1. Create sessions for upcoming live auctions that should start
      const upcomingAuctions = await Auction.find({
        auction_status: "upcoming",
        auctionType_id: liveAuctionType._id,
        auction_start_time: { $lte: now },
      });

      console.log(`[CRON] Found ${upcomingAuctions.length} upcoming auctions to process`);

      for (const auction of upcomingAuctions) {
        try {
          // Check if session already exists
          let session = await AuctionSession.findOne({ auction_id: auction._id });
          
          if (!session) {
            // Create new session with session_code
            session = new AuctionSession({
              auction_id: auction._id,
              start_time: auction.auction_start_time,
              end_time: auction.auction_end_time,
              status: "pending",
              session_code: generateSessionCode(),
            });
            await session.save();
            console.log(`[CRON] Created session ${session._id} for auction ${auction._id}`);
          }
        } catch (error) {
          logger.error(`Error creating session for auction ${auction._id}: ${error.message}`);
        }
      }

      // 2. Activate pending sessions that should start
      const pendingSessions = await AuctionSession.find({
        status: "pending",
        start_time: { $lte: now },
      });

      console.log(`[CRON] Found ${pendingSessions.length} pending sessions to activate`);

      for (const session of pendingSessions) {
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();
        
        try {
          // Update session status
          session.status = "active";
          session.actual_start_time = new Date();
          await session.save({ session: dbSession });

          // Update auction status
          const auction = await Auction.findOne({ _id: session.auction_id });
          if (auction && auction.auction_status === "upcoming") {
            auction.auction_status = "active";
            await auction.save({ session: dbSession });
          }

          await dbSession.commitTransaction();
          console.log(`[CRON] Activated session ${session._id} for auction ${session.auction_id}`);
        } catch (error) {
          await dbSession.abortTransaction();
          logger.error(`Error activating session ${session._id}: ${error.message}`);
        } finally {
          dbSession.endSession();
        }
      }

      // 3. Complete expired active sessions
      const activeSessions = await AuctionSession.find({
        status: "active",
        end_time: { $lte: now },
      });

      console.log(`[CRON] Found ${activeSessions.length} active sessions to complete`);

      for (const session of activeSessions) {
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();
        
        try {
          // Update session status
          session.status = "completed";
          session.actual_end_time = new Date();
          await session.save({ session: dbSession });

          // Update auction status
          const auction = await Auction.findOne({ _id: session.auction_id });
          if (auction && auction.auction_status === "active") {
            auction.auction_status = "completed";
            await auction.save({ session: dbSession });
          }

          // Update all active participants to "left"
          const participantUpdate = await AuctionParticipant.updateMany(
            { session_id: session._id, status: "active" },
            { status: "left", last_activity: new Date() },
            { session: dbSession }
          );

          await dbSession.commitTransaction();
          console.log(`[CRON] Completed session ${session._id} for auction ${session.auction_id}, updated ${participantUpdate.modifiedCount} participants`);
        } catch (error) {
          await dbSession.abortTransaction();
          logger.error(`Error completing session ${session._id}: ${error.message}`);
        } finally {
          dbSession.endSession();
        }
      }

      console.log(`[CRON] Auction session check completed at ${new Date().toISOString()}`);
    } catch (error) {
      logger.error(`Cron job fatal error: ${error.message}`);
      console.error(`[CRON] Fatal error: ${error.message}`);
    }
  });

  console.log("Auction session cron job started - running every minute");
};

// Export the function to start the cron job
export default auctionCronJob;