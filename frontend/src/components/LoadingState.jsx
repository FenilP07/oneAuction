import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Alert, Button, Card } from "react-bootstrap";
import Navbar from "../../components/Navbar.jsx";
import Footer from "../../components/Footer.jsx";
import useAuthStore from "../../store/authStore.js";
import ErrorBoundary from "./ErrorBoundary.jsx";
import AuctionTimer from "./AuctionTimer.jsx";
import CurrentBidDisplay from "./CurrentBidDisplay.jsx";
import BidForm from "./BidForm.jsx";
import BidHistory from "./BidHistory.jsx";
import SealedBidResults from "./SealedBidResults.jsx";
import AuctionDescription from "./AuctionDescription.jsx";
import NotificationToast from "./NotificationToast.jsx";
import { AuthLoadingState, AuctionLoadingState } from "./LoadingState.jsx";
import { useAuctionTimer } from "../hooks/useAuctionTimer.js";
import { useAuctionSocket } from "../hooks/useAuctionSocket.js";
import { useAuctionData } from "../hooks/useAuctionData.js";
import { useNotification } from "../hooks/useNotification.js";
import "./joinAuction.css";

const JoinAuction = () => {
  const { auctionType, auction_id } = useParams();
  const navigate = useNavigate();
  const { accessToken, isAuthenticated, userId } = useAuthStore();
  const [pulseKey, setPulseKey] = useState(0);

  // Custom hooks
  const { showNotification, ...notificationProps } = useNotification();
  const { 
    auction, 
    loading, 
    error, 
    hasBid, 
    setHasBid, 
    refetch, 
    updateAuctionWithBid 
  } = useAuctionData(auction_id, userId);
  
  const { timer, isEnded } = useAuctionTimer(auction?.auction_end_time);

  // Socket connection with optimized callbacks
  const handleBidUpdate = useCallback((updatedBid) => {
    updateAuctionWithBid(updatedBid);
    setPulseKey(prev => prev + 1);
  }, [updateAuctionWithBid]);

  useAuctionSocket(
    auctionType, 
    auction_id, 
    accessToken, 
    handleBidUpdate, 
    showNotification
  );

  // Memoized calculations
  const currentBid = useMemo(() => {
    if (!auction) return 0;
    return Math.max(
      auction.items[0]?.current_bid || 0,
      auction.bid_history?.[0]?.amount || auction.items[0]?.starting_bid || 0
    );
  }, [auction]);

  const startingBid = useMemo(() => {
    return auction?.items[0]?.starting_bid || 0;
  }, [auction]);

  // Event handlers
  const handleBidSuccess = useCallback((bidAmount) => {
    if (auctionType === "sealed_bid") {
      setHasBid(true);
      refetch();
    }
    showNotification("Bid placed successfully!", "success");
  }, [auctionType, setHasBid, refetch, showNotification]);

  const handleBidError = useCallback((error) => {
    showNotification(error, "danger");
  }, [showNotification]);

  // Route protection
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!auction_id || !["sealed_bid", "single_timed_item"].includes(auctionType)) {
      navigate("/browse-auctions");
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
          {/* Left Column - Auction Description */}
          <div className="col-lg-8">
            <AuctionDescription auction={auction} auctionType={auctionType} />
          </div>

          {/* Right Column - Bidding Interface */}
          <div className="col-lg-4">
            {/* Timer Card */}
            <Card className="mb-4 shadow-sm rounded pulse-animation" key={pulseKey}>
              <Card.Body>
                <AuctionTimer timer={timer} isEnded={isEnded} />
              </Card.Body>
              {auctionType === "single_timed_item" && (
                <Card.Body>
                  <CurrentBidDisplay 
                    currentBid={currentBid} 
                    startingBid={startingBid} 
                  />
                </Card.Body>
              )}
            </Card>

            {/* Bid Form */}
            {!isEnded && (
              <Card className="mb-4 shadow-sm rounded slide-in">
                <Card.Body>
                  <BidForm
                    auction={auction}
                    auctionType={auctionType}
                    auctionId={auction_id}
                    hasBid={hasBid}
                    onBidSuccess={handleBidSuccess}
                    onError={handleBidError}
                    isEnded={isEnded}
                  />
                </Card.Body>
              </Card>
            )}

            {/* Bid History for Timed Auctions */}
            {auctionType === "single_timed_item" && (
              <BidHistory
                bidHistory={auction.bid_history}
                currentBid={currentBid}
                pulseKey={pulseKey}
              />
            )}

            {/* Sealed Bid Results */}
            {auctionType === "sealed_bid" && (
              <SealedBidResults
                auctionId={auction_id}
                isEnded={isEnded}
                onError={handleBidError}
              />
            )}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <NotificationToast {...notificationProps} />
      
      <Footer />
    </ErrorBoundary>
  );
};

export default JoinAuction;