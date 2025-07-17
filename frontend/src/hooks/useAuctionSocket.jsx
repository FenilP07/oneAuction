import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

export const useAuctionSocket = (auctionType, auctionId, accessToken, onBidUpdate, onNotification) => {
  const socketRef = useRef(null);

  const connectSocket = useCallback(() => {
    if (auctionType !== "single_timed_item" || !accessToken) return;

    socketRef.current = io("http://localhost:3000/auctions", {
      auth: { token: `Bearer ${accessToken}` },
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

    socketRef.current.on("timeBidPlaced", (updatedBid) => {
      onBidUpdate(updatedBid);
      onNotification(`New bid: $${updatedBid.amount.toLocaleString()}`, "info");
    });

    socketRef.current.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      onNotification("Connection error. Trying to reconnect...", "warning");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave_auction_room", auctionId);
        socketRef.current.disconnect();
      }
    };
  }, [auctionType, auctionId, accessToken, onBidUpdate, onNotification]);

  useEffect(() => {
    const cleanup = connectSocket();
    return cleanup;
  }, [connectSocket]);

  return socketRef.current;
};
