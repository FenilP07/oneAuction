import React from "react";
import { Card } from "react-bootstrap";

const AuctionDescription = React.memo(({ auction, auctionType }) => {
  return (
    <Card className="mb-4 shadow-lg rounded">
      <Card.Img
        variant="top"
        src={auction.banner_image || "https://via.placeholder.com/800x400?text=No+Image"}
        style={{ height: "400px", objectFit: "cover" }}
      />
      <Card.Body>
        <Card.Title as="h2" className="fw-bold text-dark">
          {auction.auction_title}
        </Card.Title>
        <Card.Text className="text-secondary mt-3">
          <strong>Description:</strong>{" "}
          {auction.auction_description || "No description available."}
        </Card.Text>
        {auctionType === "sealed_bid" && (
          <Card.Text className="text-info fw-semibold">
            <strong>Hint:</strong> {auction.hint || "No hint provided."}
          </Card.Text>
        )}
      </Card.Body>
    </Card>
  );
});

AuctionDescription.displayName = "AuctionDescription";
export default AuctionDescription;