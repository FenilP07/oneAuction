import { useState, useEffect, useCallback } from "react";
import { getAuctionById } from "../services/auctionService.js";

export const useAuctionData = (auctionId, userId) => {
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasBid, setHasBid] = useState(false);

  const fetchAuction = useCallback(async () => {
    if (!auctionId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getAuctionById(auctionId);
      const auctionData = response.data.auction;
      setAuction(auctionData);

      // Check if user has already bid in sealed auctions
      if (auctionData.bid_history && userId) {
        const userBid = auctionData.bid_history.find(
          (bid) => bid.bidder_id === userId
        );
        setHasBid(!!userBid);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch auction details");
    } finally {
      setLoading(false);
    }
  }, [auctionId, userId]);

  const updateAuctionWithBid = useCallback((updatedBid) => {
    setAuction((prev) => {
      if (!prev) return prev;

      const newBid = {
        bidder_id: updatedBid.bidder_id,
        bidder_username: updatedBid.bidder_username || "Anonymous",
        amount: updatedBid.amount,
        item_id: updatedBid.item_id,
        timestamp: new Date(),
      };

      const updatedBidHistory = [newBid, ...(prev.bid_history || [])];
      const highestBid = Math.max(
        updatedBid.amount,
        prev.items[0]?.current_bid || 0,
        prev.items[0]?.starting_bid || 0
      );

      return {
        ...prev,
        bid_history: updatedBidHistory,
        items: prev.items.map((item) =>
          item._id === updatedBid.item_id
            ? { ...item, current_bid: highestBid }
            : item
        ),
        settings: {
          ...prev.settings,
          bid_count: (prev.settings.bid_count || 0) + 1,
        },
      };
    });
  }, []);

  useEffect(() => {
    fetchAuction();
  }, [fetchAuction]);

  return {
    auction,
    loading,
    error,
    hasBid,
    setHasBid,
    refetch: fetchAuction,
    updateAuctionWithBid,
  };
};