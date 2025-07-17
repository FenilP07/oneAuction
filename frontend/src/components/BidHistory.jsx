import React from "react";
import { Card, ListGroup } from "react-bootstrap";

const BidHistory = React.memo(({ bidHistory, currentBid, pulseKey }) => {
  return (
    <Card className="shadow-sm rounded animate-list">
      <Card.Body>
        <Card.Title as="h5">Bidding History</Card.Title>
        <ListGroup variant="flush" style={{ maxHeight: "250px", overflowY: "auto" }}>
          {bidHistory?.map((bid, idx) => (
            <ListGroup.Item
              key={`${idx}-${pulseKey}`}
              className={`d-flex justify-content-between ${
                bid.amount === currentBid ? "highlight-bid animate-slide-in" : ""
              }`}
            >
              <span>{bid.bidder_username || "Anonymous"}</span>
              <span>${bid.amount.toLocaleString()}</span>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  );
});

BidHistory.displayName = "BidHistory";
export default BidHistory;