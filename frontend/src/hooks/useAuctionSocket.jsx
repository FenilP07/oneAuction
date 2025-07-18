import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

export const useAuctionSocket = (
  auctionType,
  auctionId,
  accessToken,
  onBidUpdate,
  onNotification
) => {
  const socketRef = useRef(null);

  const connectSocket = useCallback(() => {
    if (auctionType !== "single_timed_item" || !accessToken) return () => {};

    socketRef.current = io("http://localhost:3000/auctions", {
      auth: { token: accessToken },
      transports: ["polling", "websocket"],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on("connect", () => {
      console.log("Socket connected:", socketRef.current.id);
      socketRef.current.emit("join_auction_room", auctionId);
    });

    socketRef.current.on("timeBidPlaced", (bid) => {
      onBidUpdate(bid);
      onNotification(
        `New bid: $${bid.amount.toLocaleString()} by ${
          bid.bidder_username || "Anonymous"
        }`,
        "info"
      );
    });

    socketRef.current.on("reconnect_failed", () => {
      onNotification("Failed to reconnect to real-time updates", "danger");
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      onNotification("Connection error. Trying to reconnect...", "warning");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave_auction_room", auctionId);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [auctionType, auctionId, accessToken, onBidUpdate, onNotification]);

  useEffect(() => {
    const cleanup = connectSocket();
    return cleanup;
  }, [connectSocket]);
};
