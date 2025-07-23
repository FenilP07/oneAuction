import { io } from "../app.js"; // Import the Socket.IO instance from app.js
import logger from "./logger.js";

const emitAuctionStatusUpdate = (auction) => {
  if (!auction || !auction._id) {
    logger.error("Invalid auction data for status update:", auction);
    return;
  }

  const updateData = {
    auction_id: auction._id.toString(),
    status: auction.auction_status,
    end_time: auction.auction_end_time,
    start_time: auction.auction_start_time,
  };

  logger.info("Emitting auctionStatusUpdate:", updateData);
  io.of("/auctions").to("auctions").emit("auctionStatusUpdate", updateData);
};

export { emitAuctionStatusUpdate };