import React, { useState, useMemo } from "react";
import { Button, Modal, Alert, Spinner } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStop } from "@fortawesome/free-solid-svg-icons";
import { endAuctionEarly } from "../services/auctionService";

const EndAuctionEarlyButton = ({ auction, userId, onEndSuccess, onError }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Check if current user is the auctioneer and auction can be ended
  const canEndEarly = useMemo(() => {
    const validStatuses = ["upcoming", "active", "paused"];
    return (
      auction?.auctioneer_id?._id === userId &&
      validStatuses.includes(auction?.auction_status)
    );
  }, [auction?.auctioneer_id?._id, auction?.auction_status, userId]);

  const handleEndAuction = async () => {
    setIsEnding(true);
    try {
      const response = await endAuctionEarly(auction._id);
      onEndSuccess(response);
      setShowConfirmModal(false);
    } catch (error) {
      const errorMsg = error.message || "Failed to end auction early";
      onError(errorMsg);
    } finally {
      setIsEnding(false);
    }
  };

  // Don't render if user can't end auction early
  if (!canEndEarly) {
    return null;
  }

  return (
    <>
      <Button
        variant="danger"
        size="lg"
        className="w-100 mb-3"
        onClick={() => setShowConfirmModal(true)}
        disabled={isEnding}
      >
        <FontAwesomeIcon icon={faStop} className="me-2" />
        End Auction Early
      </Button>

      <Modal
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>End Auction Early</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <strong>Warning:</strong> This action cannot be undone!
          </Alert>
          <p>Are you sure you want to end this auction early?</p>
          {auction?.settings?.bid_count > 0 ? (
            <div>
              <p>
                <strong>Current Status:</strong>
              </p>
              <ul>
                <li>Total Bids: {auction.settings.bid_count}</li>
                <li>Unique Bidders: {auction.settings.unique_bidders || 0}</li>
                <li>
                  {auction.auctionType_id?.type_name === "sealed_bid"
                    ? "Items will be marked as UNSOLD (use Reveal fryer to reveal winners)"
                    : "Items will be marked as SOLD"}
                </li>
              </ul>
            </div>
          ) : (
            <Alert variant="info">
              No bids have been placed yet. Items will be returned to
              "available" status.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowConfirmModal(false)}
            disabled={isEnding}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleEndAuction}
            disabled={isEnding}
          >
            {isEnding ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Ending...
              </>
            ) : (
              "End Auction Now"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default EndAuctionEarlyButton;
