import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGavel, faClock } from "@fortawesome/free-solid-svg-icons";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  Form,
  Button,
  Alert,
  Spinner,
  Toast,
  ToastContainer,
  Badge,
  Card,
  ListGroup,
  Table,
} from "react-bootstrap";
import Navbar from "../../components/Navbar.jsx";
import Footer from "../../components/Footer.jsx";
import {
  getAuctionById,
  placeSealedBid,
  placeTimedBid,
  getSealedBidLeaderboard,
  revealSealedBids
} from "../../services/auctionService.js";
import useAuthStore from "../../store/authStore.js";
// Import your custom hooks
import { useAuctionData } from "../../hooks/useAuctionData.jsx";
import { useAuctionSocket } from "../../hooks/useAuctionSocket.jsx";
import { useAuctionTimer } from "../../hooks/useAuctionTimer.jsx";
import { useBidCalculations } from "../../hooks/useBidCalculation.jsx";
import { useNotification } from "../../hooks/useNotification.jsx";
// Import your new components
import AuctionDescription from "../../components/AuctionDescription.jsx";
import AuctionTimer from "../../components/AuctionTimer.jsx";
import CurrentBidDisplay from "../../components/CurrentBidDisplay.jsx";
import BidHistory from "../../components/BidHistory.jsx";
import ErrorBoundary from "../../components/ErrorBoundary.jsx";
import NotificationToast from "../../components/NotificationToast.jsx";
import "./joinAuction.css";

// Enhanced Bid Form Component (inline since it uses multiple hooks)
const EnhancedBidForm = React.memo(
  ({
    auction,
    auctionType,
    auctionId,
    hasBid,
    onBidSuccess,
    onError,
    isEnded,
  }) => {
    const [bidAmount, setBidAmount] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    const { currentBid, minBid, nextBidSuggestions } = useBidCalculations(
      auction,
      auctionType
    );

    const isFormDisabled = useMemo(() => {
      return (auctionType === "sealed_bid" && hasBid) || submitting || isEnded;
    }, [auctionType, hasBid, submitting, isEnded]);

    const validateBid = useCallback(
      (amount) => {
        if (!amount || amount <= 0) {
          return "Please enter a valid bid amount";
        }
        if (amount < minBid) {
          return auctionType === "sealed_bid"
            ? "Enter your guess!"
            : `Bid must be at least $${minBid.toLocaleString()}`;
        }
        return null;
      },
      [minBid, auctionType]
    );

    // Update bid amount when auction data changes
    useEffect(() => {
      if (auction && auctionType === "single_timed_item") {
        setBidAmount(minBid);
      }
    }, [auction, minBid, auctionType]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setMessage(null);

      const validationError = validateBid(bidAmount);
      if (validationError) {
        setMessage(
          <Alert variant="danger" className="text-center">
            {validationError}
          </Alert>
        );
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

        const endpoint =
          auctionType === "sealed_bid" ? placeSealedBid : placeTimedBid;
        await endpoint(payload);

        const successMsg =
          auctionType === "sealed_bid"
            ? `Guess of $${bidAmount.toLocaleString()} submitted!`
            : `Bid of $${bidAmount.toLocaleString()} placed!`;

        setMessage(
          <Alert variant="success" className="text-center">
            {successMsg}
          </Alert>
        );
        onBidSuccess(bidAmount);

        // Reset form for timed auctions or update next bid
        if (auctionType === "single_timed_item") {
          const nextBid = minBid + (auction.settings?.min_bid_increment || 0);
          setBidAmount(nextBid);
        }
      } catch (err) {
        const errorMsg = err.message || "Failed to place bid";
        setMessage(
          <Alert variant="danger" className="text-center">
            {errorMsg}
          </Alert>
        );
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
        <Card.Title as="h4" className="mb-4">
          {auctionType === "sealed_bid"
            ? "Place Your Sealed Guess"
            : "Place Your Bid"}
        </Card.Title>

        {message && <div className="mb-3">{message}</div>}

        <Form onSubmit={handleSubmit}>
          <Form.Floating className="mb-3">
            <Form.Control
              id="bidAmountInput"
              type="number"
              placeholder="Enter your bid"
              value={bidAmount}
              onChange={(e) => setBidAmount(Number(e.target.value) || "")}
              disabled={isFormDisabled}
              min={minBid}
              step="0.01"
              required
            />
            <label htmlFor="bidAmountInput">
              {auctionType === "sealed_bid"
                ? "Guess the Value"
                : `Bid Amount (Min: $${minBid.toLocaleString()})`}
            </label>
          </Form.Floating>

          {auction.is_invite_only && (
            <Form.Floating className="mb-3">
              <Form.Control
                id="inviteCodeInput"
                type="text"
                placeholder="Invite Code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                disabled={isFormDisabled}
                required
              />
              <label htmlFor="inviteCodeInput">Invite Code</label>
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
            ) : auctionType === "sealed_bid" ? (
              "Submit Guess"
            ) : (
              "Place Bid"
            )}
          </Button>

          {auctionType === "single_timed_item" &&
            nextBidSuggestions.length > 0 && (
              <div className="btn-group w-100" role="group">
                {nextBidSuggestions.map((amount, idx) => (
                  <Button
                    key={idx}
                    variant="outline-secondary"
                    onClick={() => handleQuickBid(amount)}
                    disabled={isFormDisabled}
                  >
                    +$
                    {(
                      (idx + 1) *
                      (auction.settings?.min_bid_increment || 0)
                    ).toLocaleString()}
                  </Button>
                ))}
              </div>
            )}
        </Form>

        {auctionType === "sealed_bid" && hasBid && (
          <Alert variant="info" className="text-center mt-3">
            You have submitted your guess. No edits allowed!
          </Alert>
        )}
      </div>
    );
  }
);

// Sealed Bid Results Component (keeping original functionality)
const SealedBidResults = React.memo(({ auctionId, isEnded, onError }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [funStats, setFunStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleReveal = async () => {
    setLoading(true);
    try {
      // 1. Call reveal API to unlock bids on server
      await revealSealedBids(auctionId);

      // 2. Fetch updated leaderboard with decrypted bids
      const data = await getSealedBidLeaderboard(auctionId);

      setLeaderboard(data.leaderboard || []);
      setFunStats(data.stats || null);
      setIsRevealed(true);

      // Optional: confetti effect
      const confettiScript = document.createElement("script");
      confettiScript.src =
        "https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js";
      confettiScript.onload = () =>
        window.confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
        });
      document.body.appendChild(confettiScript);
    } catch (err) {
      onError(err.message || "Failed to reveal leaderboard");
    } finally {
      setLoading(false);
    }
  };

  if (!isEnded) return null;

  return (
    <>
      {!isRevealed && (
        <Button
          variant="success"
          className="w-100 mb-3"
          size="lg"
          onClick={handleReveal}
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" /> Revealing...
            </>
          ) : (
            "Reveal Results"
          )}
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
                {leaderboard.map((bid, idx) => (
                  <tr
                    key={idx}
                    className={bid.is_winner ? "table-success" : ""}
                  >
                    <td>{idx + 1}</td>
                    <td>{bid.bidder_username || "Anonymous"}</td>
                    <td>${bid.amount?.toLocaleString() || "N/A"}</td>
                    <td>
                      {bid.is_winner && <Badge bg="success">Winner!</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {funStats && (
              <div className="small text-muted">
                <strong>Fun Stats:</strong>
                <ul>
                  <li>Total Bids: {funStats.totalBids}</li>
                  <li>Average Bid: ${funStats.averageBid.toFixed(2)}</li>
                  <li>Highest Bid: ${funStats.highestBid.toLocaleString()}</li>
                </ul>
              </div>
            )}
          </Card.Body>
        </Card>
      )}
    </>
  );
});
// Loading States
const AuthLoadingState = () => (
  <>
    <Navbar />
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ height: "50vh" }}
    >
      <Spinner animation="border" variant="primary" size="lg" />
      <h5 className="ms-3">Checking authentication...</h5>
    </div>
    <Footer />
  </>
);

const AuctionLoadingState = () => (
  <>
    <Navbar />
    <div className="container p-5">
      <Skeleton height={400} borderRadius={6} />
      <div className="row mt-4">
        <div className="col-lg-8">
          <Skeleton height={40} width="60%" className="mb-3" />
          <Skeleton count={3} />
        </div>
        <div className="col-lg-4">
          <Skeleton height={30} width="40%" className="mb-2" />
          <Skeleton height={50} className="mb-4" />
          <Skeleton height={100} />
        </div>
      </div>
    </div>
    <Footer />
  </>
);

// Main Component
const JoinAuction = () => {
  const { auctionType, auction_id } = useParams();
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?._id || null);

  // Local state
  const [pulseKey, setPulseKey] = useState(0);

  // Custom hooks
  const {
    auction,
    loading,
    error,
    hasBid,
    setHasBid,
    refetch: fetchAuction,
    updateAuctionWithBid,
  } = useAuctionData(auction_id, userId);

  const { timer, isEnded: isAuctionEnded } = useAuctionTimer(
    auction?.auction_end_time
  );

  const { currentBid, minBid, startingBid, nextBidSuggestions } =
    useBidCalculations(auction, auctionType);

  const {
    showToast,
    toastMessage,
    toastVariant,
    showNotification,
    hideNotification,
  } = useNotification();

  // Memoized calculations for performance
  const memoizedCurrentBid = useMemo(() => {
    if (!auction) return 0;
    return Math.max(
      auction.items[0]?.current_bid || 0,
      auction.bid_history?.[0]?.amount || auction.items[0]?.starting_bid || 0
    );
  }, [auction]);

  const memoizedStartingBid = useMemo(() => {
    return auction?.items[0]?.starting_bid || 0;
  }, [auction]);

  // Socket connection with callbacks
  const handleBidUpdate = useCallback(
    (updatedBid) => {
      updateAuctionWithBid(updatedBid);
      setPulseKey((prev) => prev + 1);
    },
    [updateAuctionWithBid]
  );

  useAuctionSocket(
    auctionType,
    auction_id,
    accessToken,
    handleBidUpdate,
    showNotification
  );

  // Event handlers
  const handleBidSuccess = useCallback(
    (bidAmount) => {
      if (auctionType === "sealed_bid") {
        setHasBid(true);
        fetchAuction();
      }
      showNotification("Bid placed successfully!", "success");
    },
    [auctionType, setHasBid, fetchAuction, showNotification]
  );

  const handleBidError = useCallback(
    (error) => {
      showNotification(error, "danger");
    },
    [showNotification]
  );

  // Authentication check
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
  }, [isAuthenticated, navigate]);

  // Route validation
  useEffect(() => {
    if (
      !auction_id ||
      !["sealed_bid", "single_timed_item"].includes(auctionType)
    ) {
      navigate("/browse-auctions");
      return;
    }
  }, [auctionType, auction_id, navigate]);

  // Loading states
  if (!isAuthenticated()) {
    return <AuthLoadingState />;
  }

  if (loading) {
    return <AuctionLoadingState />;
  }

  if (error) {
    return (
      <ErrorBoundary>
        <Navbar />
        <div className="container mt-5">
          <Alert variant="danger" className="text-center" role="alert">
            <h4>Error</h4>
            <p>{error}</p>
            <Button onClick={() => navigate("/browse-auctions")}>
              Back to Auctions
            </Button>
          </Alert>
        </div>
        <Footer />
      </ErrorBoundary>
    );
  }

  if (!auction) {
    return <AuctionLoadingState />;
  }

  return (
    <ErrorBoundary>
      <Navbar />
      <div className="container-fluid p-5 bg-light fade-in">
        <div className="row g-4">
          {/* Auction Description */}
          <div className="col-lg-8">
            <AuctionDescription auction={auction} auctionType={auctionType} />
          </div>

          {/* Right Sidebar */}
          <div className="col-lg-4">
            <Card
              className="mb-4 shadow-sm rounded pulse-animation"
              key={pulseKey}
            >
              <Card.Body>
                <AuctionTimer timer={timer} isEnded={isAuctionEnded} />
              </Card.Body>
              {auctionType === "single_timed_item" && (
                <Card.Body>
                  <CurrentBidDisplay
                    currentBid={memoizedCurrentBid}
                    startingBid={memoizedStartingBid}
                  />
                </Card.Body>
              )}
            </Card>

            {!isAuctionEnded && (
              <Card className="mb-4 shadow-sm rounded slide-in">
                <Card.Body>
                  <EnhancedBidForm
                    auction={auction}
                    auctionType={auctionType}
                    auctionId={auction_id}
                    hasBid={hasBid}
                    onBidSuccess={handleBidSuccess}
                    onError={handleBidError}
                    isEnded={isAuctionEnded}
                  />
                </Card.Body>
              </Card>
            )}

            {auctionType === "single_timed_item" && (
              <BidHistory
                bidHistory={auction.bid_history}
                currentBid={memoizedCurrentBid}
                pulseKey={pulseKey}
              />
            )}

            {auctionType === "sealed_bid" && (
              <SealedBidResults
                auctionId={auction_id}
                isEnded={isAuctionEnded}
                onError={handleBidError}
              />
            )}
          </div>
        </div>
      </div>

      <NotificationToast
        show={showToast}
        message={toastMessage}
        variant={toastVariant}
        onClose={hideNotification}
      />

      <Footer />
    </ErrorBoundary>
  );
};

EnhancedBidForm.displayName = "EnhancedBidForm";
SealedBidResults.displayName = "SealedBidResults";

export default JoinAuction;
