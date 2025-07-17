import { useMemo } from "react";

export const useBidCalculations = (auction, auctionType) => {
  const currentBid = useMemo(() => {
    if (!auction) return 0;
    return Math.max(
      auction.items[0]?.current_bid || 0,
      auction.bid_history?.[0]?.amount || auction.items[0]?.starting_bid || 0
    );
  }, [auction]);

  const minBid = useMemo(() => {
    if (!auction) return 0;
    return auctionType === "sealed_bid"
      ? 0
      : currentBid + (auction.settings?.min_bid_increment || 0);
  }, [auction, auctionType, currentBid]);

  const startingBid = useMemo(() => {
    return auction?.items[0]?.starting_bid || 0;
  }, [auction]);

  const nextBidSuggestions = useMemo(() => {
    if (!auction || auctionType === "sealed_bid") return [];
    const increment = auction.settings?.min_bid_increment || 0;
    return [1, 2, 3].map(mult => currentBid + increment * mult);
  }, [auction, auctionType, currentBid]);

  return {
    currentBid,
    minBid,
    startingBid,
    nextBidSuggestions
  };
};
