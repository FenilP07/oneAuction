import React from "react";
import { Card, Carousel } from "react-bootstrap";

const AuctionDescription = React.memo(({ auction, auctionType }) => {
  const item = auction.items?.[0]; // assume single item for single_timed_item
  const images = item?.images?.length > 0 ? item.images : [];

  const imageFallback = [
    {
      image_url: "https://via.placeholder.com/800x400?text=No+Image",
      _id: "fallback",
    },
  ];

  return (
    <Card className="mb-4 shadow-lg rounded">
      <div style={{ maxHeight: "400px", overflow: "hidden" }}>
        <Carousel interval={5000} indicators={images.length > 1}>
          {(images.length > 0 ? images : imageFallback).map((img, idx) => (
            <Carousel.Item key={img._id || idx}>
              <img
                src={img.image_url}
                alt={`Auction Item ${idx + 1}`}
                className="d-block w-100"
                style={{ height: "400px", objectFit: "cover" }}
              />
            </Carousel.Item>
          ))}
        </Carousel>
      </div>

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

        <Card.Text className="text-secondary mt-3">
          <strong>Unique Bidders:</strong>{" "}
          {auction.settings?.unique_bidders ?? 0}
        </Card.Text>
        <Card.Text className="text-secondary mt-3">
          <strong>Total Bids:</strong> {auction.settings?.bid_count ?? 0}
        </Card.Text>
      </Card.Body>
    </Card>
  );
});

AuctionDescription.displayName = "AuctionDescription";
export default AuctionDescription;
