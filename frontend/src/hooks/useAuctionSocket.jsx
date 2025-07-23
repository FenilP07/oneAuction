import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export const useAuctionSocket = (
  auctionType,
  auctionId,
  accessToken,
  onBidUpdate,
  onAuctionEndedEarly,
  onNotification
) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (auctionType !== "single_timed_item" || !auctionId || !accessToken)
      return;

    const socket = io("https://oneauctionbackend.onrender.com/auctions", {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to auction socket:", socket.id);
      socket.emit("join_auction_room", auctionId);
    });

    socket.on("disconnect", (reason) => {
      console.warn("❌ Disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("⚠️ Socket connection error:", error);
      if (onNotification)
        onNotification("Connection error. Reconnecting...", "warning");
    });

    socket.on("reconnect_failed", () => {
      if (onNotification)
        onNotification("Failed to reconnect to auction", "danger");
    });

    socket.on("timeBidPlaced", (bid) => {
      console.log("📡 Bid received:", bid);
      if (onBidUpdate) onBidUpdate(bid);
      if (onNotification) {
        onNotification(
          `New bid: $${bid.amount.toLocaleString()} by ${
            bid.bidder_username || "Anonymous"
          }`,
          "info"
        );
      }
    });
    socket.on("auctionEndedEarly", (data) => {
      console.log("ended early", data);
      if (onAuctionEndedEarly) {
        onAuctionEndedEarly(data);
      }
      if (onNotification) {
        onNotification(
          `Auction ended early at ${new Date(
            data.ended_at
          ).toLocaleDateString()}`,
          "info"
        );
      }
    });

    return () => {
      console.log("👋 Cleaning up socket...");
      socket.emit("leave_auction_room", auctionId);
      socket.disconnect();
    };
  }, [auctionType, auctionId, accessToken]); // ❗️Don't include callbacks here
};
