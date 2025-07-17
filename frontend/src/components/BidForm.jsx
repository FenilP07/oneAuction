import React, { useState, useMemo, useCallback } from "react";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import { placeSealedBid, placeTimedBid } from "../services/auctionService.js";
import { useBidCalculations } from "../hooks/useBidCalculations.js";

const EnhancedBidForm = React.memo(({ 
  auction, 
  auctionType, 
  auctionId, 
  hasBid, 
  onBidSuccess, 
  onError,
  isEnded 
}) => {
  const [bidAmount, setBidAmount] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const { currentBid, minBid, nextBidSuggestions } = useBidCalculations(auction, auctionType);

  const isFormDisabled = useMemo(() => {
    return (auctionType === "sealed_bid" && hasBid) || submitting || isEnded;
  }, [auctionType, hasBid, submitting, isEnded]);

  const validateBid = useCallback((amount) => {
    if (!amount || amount <= 0) {
      return "Please enter a valid bid amount";
    }
    if (amount < minBid) {
      return auctionType === "sealed_bid"
        ? "Enter your guess!"
        : `Bid must be at least ${minBid.toLocaleString()}`;
    }
    return null;
  }, [minBid, auctionType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    
    const validationError = validateBid(bidAmount);
    if (validationError) {
      setMessage(<Alert variant="danger">{validationError}</Alert>);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        auction_id: auctionId,
        item_id: auction.items[0]?._id,
        amount: parseFloat(bidAmount),
        invite_code: auction.is_invite_only ? inviteCode : undefined,
      };

      const endpoint = auctionType === "sealed_bid" ? placeSealedBid : placeTimedBid;
      await endpoint(payload);

      const successMsg = auctionType === "sealed_bid"
        ? `Guess of ${bidAmount.toLocaleString()} submitted!`
        : `Bid of ${bidAmount.toLocaleString()} placed!`;
      
      setMessage(<Alert variant="success">{successMsg}</Alert>);
      onBidSuccess(bidAmount);

      // Reset form for timed auctions
      if (auctionType === "single_timed_item") {
        setBidAmount("");
      }
    } catch (err) {
      const errorMsg = err.message || "Failed to place bid";
      setMessage(<Alert variant="danger">{errorMsg}</Alert>);
      onError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickBid = useCallback((amount) => {
    setBidAmount(amount);
  }, []);

  if (isEnded) return null;

  return (
    <div>
      <h4 className="mb-4">
        {auctionType === "sealed_bid" ? "Place Your Sealed Guess" : "Place Your Bid"}
      </h4>
      
      {message && <div className="mb-3">{message}</div>}

      <Form onSubmit={handleSubmit}>
        <Form.Floating className="mb-3">
          <Form.Control
            type="number"
            placeholder="Enter your bid"
            value={bidAmount}
            onChange={(e) => setBidAmount(Number(e.target.value) || "")}
            disabled={isFormDisabled}
            min={minBid}
            step="0.01"
            required
          />
          <label>
            {auctionType === "sealed_bid"
              ? "Guess the Value"
              : `Bid Amount (Min: ${minBid.toLocaleString()})`}
          </label>
        </Form.Floating>

        {auction.is_invite_only && (
          <Form.Floating className="mb-3">
            <Form.Control
              type="text"
              placeholder="Invite Code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              disabled={isFormDisabled}
              required
            />
            <label>Invite Code</label>
          </Form.Floating>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-100 mb-3"
          disabled={isFormDisabled || !bidAmount}
        >
          {submitting ? (
            <>
              <Spinner animation="border" size="sm" /> Submitting...
            </>
          ) : auctionType === "sealed_bid" ? "Submit Guess" : "Place Bid"}
        </Button>

        {auctionType === "single_timed_item" && nextBidSuggestions.length > 0 && (
          <QuickBidButtons
            suggestions={nextBidSuggestions}
            onBidSelect={handleQuickBid}
            disabled={isFormDisabled}
          />
        )}
      </Form>

      {auctionType === "sealed_bid" && hasBid && (
        <Alert variant="info" className="text-center mt-3">
          You have submitted your guess. No edits allowed!
        </Alert>
      )}
    </div>
  );
});

const QuickBidButtons = React.memo(({ suggestions, onBidSelect, disabled }) => {
  return (
    <div className="btn-group w-100" role="group">
      {suggestions.map((amount, index) => (
        <Button
          key={index}
          variant="outline-secondary"
          onClick={() => onBidSelect(amount)}
          disabled={disabled}
        >
          ${amount.toLocaleString()}
        </Button>
      ))}
    </div>
  );
});

QuickBidButtons.displayName = "QuickBidButtons";
EnhancedBidForm.displayName = "EnhancedBidForm";