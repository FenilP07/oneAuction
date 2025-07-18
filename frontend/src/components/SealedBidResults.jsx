import React, { useState } from "react";
import { Button, Card, Table, Badge } from "react-bootstrap";
import { getAuctionById } from "../services/auctionService.js";

const SealedBidResults = React.memo(({ auctionId, isEnded, onError }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  const handleReveal = async () => {
    try {
      const response = await getAuctionById(auctionId);
      const auctionData = response.data.auction;
      const bids = auctionData.bid_history || [];

      const sortedBids = bids
        .slice()
        .sort((a, b) => b.amount - a.amount)
        .map((bid, idx) => ({ ...bid, is_winner: idx === 0 }));

      const stats = {
        totalBids: bids.length,
        averageBid: bids.length ? bids.reduce((sum, bid) => sum + bid.amount, 0) / bids.length : 0,
        highestBid: bids.length ? Math.max(...bids.map(b => b.amount)) : 0,
      };

      setLeaderboard([...sortedBids, stats]);
      setIsRevealed(true);

      // Confetti effect
      const confettiScript = document.createElement("script");
      confettiScript.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js";
      confettiScript.onload = () =>
        window.confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
        });
      document.body.appendChild(confettiScript);
    } catch (err) {
      onError("Failed to reveal leaderboard");
    }
  };

  if (!isEnded) return null;

  return (
    <div>
      {!isRevealed && (
        <Button 
          variant="success" 
          className="w-100 mb-3" 
          size="lg" 
          onClick={handleReveal}
        >
          Reveal Results
        </Button>
      )}

      {isRevealed && leaderboard.length > 0 && (
        <Card className="mb-4 shadow-sm rounded slide-in">
          <Card.Body>
            <Card.Title as="h5">Leaderboard</Card.Title>
            <Table hover responsive striped bordered>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Bidder</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, -1).map((bid, idx) => (
                  <tr key={idx} className={bid.is_winner ? "table-success" : ""}>
                    <td>{idx + 1}</td>
                    <td>{bid.bidder_username || "Anonymous"}</td>
                    <td>${bid.amount.toLocaleString()}</td>
                    <td>{bid.is_winner && <Badge bg="success">Winner!</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="small text-muted">
              <strong>Fun Stats:</strong>
              <ul>
                <li>Total Bids: {leaderboard.at(-1).totalBids}</li>
                <li>Average Bid: ${leaderboard.at(-1).averageBid.toFixed(2)}</li>
                <li>Highest Bid: ${leaderboard.at(-1).highestBid.toLocaleString()}</li>
              </ul>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
});

SealedBidResults.displayName = "SealedBidResults";
export default SealedBidResults;