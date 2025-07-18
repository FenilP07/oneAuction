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
      if (!auctionData?.items?.length) {
        throw new Error("No items found for this auction");
      }
      setAuction(auctionData);

      // Check if user has already bid
      if (auctionData.bid_history && userId) {
        const userBid = auctionData.bid_history.find(
          (bid) => bid.bidder_id.toString() === userId
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
      if (!prev || !prev.items?.length) return prev;

      const newBid = {
        _id: updatedBid._id,
        bidder_id: updatedBid.bidder_id,
        bidder_username: updatedBid.bidder_username || "Anonymous",
        amount: updatedBid.amount,
        item_id: updatedBid.item_id,
        timestamp: new Date(updatedBid.timestamp),
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
          unique_bidders: prev.settings.unique_bidders + (prev.bid_history.some(bid => bid.bidder_id.toString() === updatedBid.bidder_id.toString()) ? 0 : 1),
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