import { useState, useEffect } from "react";

export const useAuctionTimer = (endTime) => {
  const [timer, setTimer] = useState("Calculating...");
  const [isEnded, setIsEnded] = useState(false);

  useEffect(() => {
    if (!endTime) return;

    const calculateTimer = () => {
      const now = new Date();
      const end = new Date(endTime);
      const diff = end - now;

      if (diff <= 0) {
        setTimer("Auction Ended");
        setIsEnded(true);
        return;
      }

      const days = String(Math.floor(diff / (1000 * 60 * 60 * 24))).padStart(2, "0");
      const hours = String(Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, "0");
      const minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0");
      const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, "0");

      setTimer(`${days}d : ${hours}h : ${minutes}m : ${seconds}s`);
      setIsEnded(false);
    };

    calculateTimer();
    const interval = setInterval(calculateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return { timer, isEnded };
};