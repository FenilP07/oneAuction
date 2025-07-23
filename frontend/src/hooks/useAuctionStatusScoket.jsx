import { useEffect, useCallback } from "react";
import io from "socket.io-client";
import useAuthStore from "../store/authStore.js";
// import { showNotification } from "./useNotification.jsx";

const useAuctionStatusSocket = (onStatusUpdate) => {
  const accessToken = useAuthStore((state) => state.accessToken);

  const socket = useCallback(() => {
    return io("https://oneauctionbackend.onrender.com/auctions", {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;

    const sock = socket();

    sock.on("connect", () => {
      console.log("Connected to WebSocket /auctions namespace");
      sock.emit("subscribeToAuctions");
    });

    sock.on("auctionStatusUpdate", (data) => {
      console.log("Received auctionStatusUpdate:", data);
      onStatusUpdate(data);
    //   showNotification(`Auction ${data.auction_id} status updated to ${data.status}`, "info");
    });

    sock.on("connect_error", (err) => {
      console.error("WebSocket connection error:", err);
    //   showNotification("Failed to connect to auction updates", "error");
    });

    return () => {
      sock.emit("unsubscribeFromAuctions");
      sock.disconnect();
      console.log("Disconnected from WebSocket /auctions namespace");
    };
  }, [accessToken, onStatusUpdate]);

  return null;
};

export default useAuctionStatusSocket;