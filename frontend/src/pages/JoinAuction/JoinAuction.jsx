import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGavel, faClock } from "@fortawesome/free-solid-svg-icons";
import { Form, Button, Alert, Spinner, Toast, ToastContainer, Badge, Card, ListGroup } from "react-bootstrap";
import { io } from "socket.io-client";
import Navbar from "../../components/Navbar.jsx";
import Footer from "../../components/Footer.jsx";
import { getAuctionById, placeSealedBid, placeTimedBid } from "../../services/auctionService.js";
import useAuthStore from "../../store/authStore.js";
import "./joinAuction.css";

const JoinAuction = () => {
  const { auctionType, auction_id } = useParams();
  const navigate = useNavigate();
  const { accessToken, isAuthenticated } = useAuthStore();

  const [auction, setAuction] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState(null);
  const [timer, setTimer] = useState("Calculating...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("info");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const socketRef = useRef(null);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
  }, [isAuthenticated, navigate]);

  // Fetch auction details
  const fetchAuction = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAuctionById(auction_id);
      const auctionData = response.data.auction;
      setAuction(auctionData);
      if (isInitialLoad) {
        const highestBid = Math.max(
          auctionData.items[0]?.current_bid || 0,
          auctionData.bid_history?.[0]?.amount || auctionData.items[0]?.starting_bid || 0
        );
        setBidAmount(highestBid + (auctionType === "sealed_bid" ? 1000 : auctionData.settings.min_bid_increment));
        setIsInitialLoad(false);
      }
      setLoading(false);
    } catch (err) {
      setError(err.message || "Failed to fetch auction details");
      setLoading(false);
      showNotification(err.message || "Failed to fetch auction details", "danger");
    }
  }, [auction_id, auctionType, isInitialLoad]);

  // Initial load
  useEffect(() => {
    if (!auction_id || !["sealed_bid", "single_timed_item"].includes(auctionType)) {
      navigate("/browse-auctions");
      return;
    }
    fetchAuction();
  }, [fetchAuction, auctionType, auction_id, navigate]);

  // Timer countdown
  useEffect(() => {
    if (!auction) return;

    const calculateTimer = () => {
      const now = new Date();
      const end = new Date(auction.settings.extended_end_time || auction.auction_end_time);
      const diff = end - now;

      if (diff <= 0) {
        setTimer("Auction Ended");
        return;
      }

      const days = String(Math.floor(diff / (1000 * 60 * 60 * 24))).padStart(2, "0");
      const hours = String(Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, "0");
      const minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0");
      const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, "0");

      setTimer(`${days}d : ${hours}h : ${minutes}m : ${seconds}s`);
    };

    calculateTimer();
    const interval = setInterval(calculateTimer, 1000);
    return () => clearInterval(interval);
  }, [auction]);

  // Socket.io for live updates
  useEffect(() => {
    if (auctionType !== "single_timed_item") return;

    if (!accessToken) {
      showNotification("Authentication token missing. Please log in again.", "danger");
      navigate("/login");
      return;
    }

    socketRef.current = io("http://localhost:3000/auctions", {
      auth: { token: `Bearer ${accessToken}` },
      transports: ["polling", "websocket"],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on("connect", () => {
      console.log("Connected to auction namespace with socket ID:", socketRef.current.id);
      socketRef.current.emit("join_auction_room", auction_id);
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      if (error.message.includes("Authentication")) {
        showNotification("Authentication failed. Please log in again.", "danger");
        navigate("/login");
      } else {
        showNotification("Connection error. Retrying...", "warning");
      }
    });

    socketRef.current.on("timeBidPlaced", (updatedBid) => {
      console.log("Received time bid update:", updatedBid);
      setAuction((prev) => {
        if (!prev) return prev;
        const newBid = {
          bidder_id: updatedBid.bidder_id,
          bidder_username: updatedBid.bidder_username || "Anonymous",
          amount: updatedBid.amount,
          item_id: updatedBid.item_id,
          timestamp: new Date(),
        };
        const updatedBidHistory = [newBid, ...(prev.bid_history || [])]; // Prepend new bid
        const highestBid = Math.max(
          updatedBid.amount,
          prev.items[0]?.current_bid || 0,
          prev.items[0]?.starting_bid || 0
        );
        setBidAmount(highestBid + prev.settings.min_bid_increment); // Update bidAmount for next bid
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
          },
        };
      });
      // Force re-render of bidding history
      setMessage((prev) => prev || null); // Trigger re-render without changing content
      showNotification(`New bid of $${updatedBid.amount.toLocaleString()} placed!`, "info");
    });

    socketRef.current.on("error", (error) => {
      console.error("Socket error:", error);
      showNotification(error.message || "Socket error occurred", "danger");
    });

    return () => {
      if (socketRef.current) {
        console.log("Cleaning up socket connection");
        socketRef.current.emit("leave_auction_room", auction_id);
        socketRef.current.disconnect();
      }
    };
  }, [auctionType, auction_id, accessToken, navigate]);

  // Show toast notification
  const showNotification = (message, variant = "info") => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };

  // Bid submit handler
  const handleBid = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!auction) return;

    const minBid = Math.max(
      auction.items[0]?.current_bid || 0,
      auction.bid_history?.[0]?.amount || auction.items[0]?.starting_bid || 0
    ) + auction.settings.min_bid_increment;

    if (bidAmount < minBid) {
      setMessage(
        <Alert variant="danger" className="text-center">
          Bid must be at least ${minBid.toLocaleString()}
        </Alert>
      );
      return;
    }

    try {
      const payload = {
        auction_id,
        item_id: auction.items[0]?._id,
        amount: parseFloat(bidAmount),
        invite_code: auction.is_invite_only ? inviteCode : undefined,
      };
      const endpoint = auctionType === "sealed_bid" ? placeSealedBid : placeTimedBid;
      await endpoint(payload);

      setMessage(
        <Alert variant="success" className="text-center">
          Bid of ${bidAmount.toLocaleString()} placed successfully!{" "}
          {auctionType === "sealed_bid" ? "(Sealed bid recorded)" : ""}
        </Alert>
      );

      setBidAmount(bidAmount + auction.settings.min_bid_increment);

      // No fetchAuction() for single_timed_item; rely on socket.io
      if (auctionType === "sealed_bid") {
        fetchAuction(); // Only refresh for sealed_bid to update state
      }
      showNotification("Bid placed successfully!", "success");
    } catch (err) {
      setMessage(
        <Alert variant="danger" className="text-center">
          {err.message || "Failed to place bid"}
        </Alert>
      );
      showNotification(err.message || "Failed to place bid", "danger");
    }
  };

  // Show loading state if not authenticated
  if (!isAuthenticated()) {
    return (
      <>
        <Navbar />
        <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
          <Spinner animation="border" variant="primary" size="lg" />
          <h5 className="ms-3">Checking authentication...</h5>
        </div>
        <Footer />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
          <Spinner animation="border" variant="primary" size="lg" />
          <h5 className="ms-3">Loading auction...</h5>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="container mt-5">
          <Alert variant="danger" className="text-center">
            <FontAwesomeIcon icon={faGavel} size="3x" className="mb-3" />
            <h4>Error</h4>
            <p>{error}</p>
            <Button onClick={() => navigate("/browse-auctions")}>Back to Auctions</Button>
          </Alert>
        </div>
        <Footer />
      </>
    );
  }

  const currentBid = Math.max(
    auction.items[0]?.current_bid || 0,
    auction.bid_history?.[0]?.amount || auction.items[0]?.starting_bid || 0
  );
  const minBidIncrement = auctionType === "sealed_bid" ? 1000 : auction.settings.min_bid_increment;

  const isAuctionEnded = auction.auction_status !== "active" || timer === "Auction Ended";

  return (
    <>
      <Navbar />
      <div className="container-fluid p-5 bg-light">
        <div className="row g-4">
          {/* LEFT COLUMN */}
          <div className="col-lg-8">
            <Card className="mb-4 shadow-sm">
              <Card.Img
                variant="top"
                src={auction.banner_image || "https://via.placeholder.com/800x400?text=No+Image"}
                alt={auction.auction_title}
                style={{ height: "400px", objectFit: "cover" }}
              />
              <Card.Body className="d-flex gap-3">
                {(auction.items[0]?.images || []).slice(0, 3).map((img, i) => (
                  <img
                    key={i}
                    src={img.image_url || "https://via.placeholder.com/80?text=No+Image"}
                    alt={`thumb${i + 1}`}
                    className="rounded border"
                    style={{ width: "80px", height: "80px", objectFit: "cover", cursor: "pointer" }}
                    onClick={() => window.open(img.image_url, "_blank")}
                  />
                ))}
              </Card.Body>
            </Card>

            <Card className="mb-4 shadow-sm">
              <Card.Body>
                <Card.Title className="fw-bold h4 text-dark">Description</Card.Title>
                <blockquote className="blockquote mb-0">
                  <p className="text-secondary">{auction.auction_description || "No description available."}</p>
                </blockquote>
              </Card.Body>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="col-lg-4">
            <Card className="mb-4 shadow-sm">
              <Card.Body>
                <Card.Title className="h3 text-dark fw-bold">{auction.auction_title || "Untitled Auction"}</Card.Title>
                <h4 className="text-success fw-bold my-3">
                  {auctionType === "sealed_bid" ? "Starting Bid" : "Current Bid"}: ${currentBid.toLocaleString()}
                </h4>
                <p className="text-muted mb-3">
                  {auctionType === "sealed_bid"
                    ? "Bids are sealed and not visible until the auction ends."
                    : `Starting bid: $${(auction.items[0]?.starting_bid || 0).toLocaleString()}`}
                </p>
                <div className="text-center mb-2">
                  <Badge bg={isAuctionEnded ? "danger" : "dark"} className="fs-5 py-2 px-3">
                    <FontAwesomeIcon icon={faClock} className="me-2" />
                    {timer}
                  </Badge>
                </div>
              </Card.Body>
            </Card>

            <Card className="mb-4 shadow-sm">
              <Card.Body>
                <Card.Title className="h5 mb-4">Place Your {auctionType === "sealed_bid" ? "Sealed" : ""} Bid</Card.Title>

                {message && <div className="mb-3">{message}</div>}

                <Form onSubmit={handleBid}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Bid Amount (Min: ${(currentBid + minBidIncrement).toLocaleString()})
                    </Form.Label>
                    <div className="input-group">
                      <span className="input-group-text">$</span>
                      <Form.Control
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(Number(e.target.value) || "")}
                        disabled={isAuctionEnded}
                        required
                      />
                    </div>
                  </Form.Group>

                  {auction.is_invite_only && (
                    <Form.Group className="mb-3">
                      <Form.Label>Invite Code</Form.Label>
                      <Form.Control
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="Enter invite code"
                        disabled={isAuctionEnded}
                        required
                      />
                    </Form.Group>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-100 mb-3"
                    disabled={isAuctionEnded || !bidAmount}
                  >
                    <FontAwesomeIcon icon={faGavel} className="me-2" />
                    {auctionType === "sealed_bid" ? "Submit Sealed Bid" : "Place Bid"}
                  </Button>

                  <div className="d-flex justify-content-between gap-2">
                    {[minBidIncrement, minBidIncrement * 2, minBidIncrement * 3].map(
                      (increment) => (
                        <Button
                          key={increment}
                          variant="outline-secondary"
                          onClick={() => setBidAmount(currentBid + increment)}
                          disabled={isAuctionEnded}
                          className="flex-fill"
                        >
                          ${(currentBid + increment).toLocaleString()}
                        </Button>
                      )
                    )}
                  </div>
                </Form>
              </Card.Body>
            </Card>

            {/* Bidding History (Timed Auctions Only) */}
            {auctionType === "single_timed_item" && (
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title className="h5 mb-3">Bidding History</Card.Title>
                  <ListGroup
                    variant="flush"
                    style={{ maxHeight: "250px", overflowY: "auto" }}
                  >
                    {(auction.bid_history && auction.bid_history.length > 0) ? (
                      auction.bid_history.map((bid, idx) => (
                        <ListGroup.Item
                          key={idx}
                          className="d-flex justify-content-between align-items-center"
                          active={bid.amount === currentBid}
                        >
                          <span>{bid.bidder_username || "Anonymous"}</span>
                          <span>
                            ${bid.amount.toLocaleString()}{" "}
                            {bid.amount === currentBid && <Badge bg="success">Winning</Badge>}
                          </span>
                        </ListGroup.Item>
                      ))
                    ) : (
                      <ListGroup.Item className="text-muted text-center">
                        No bids yet
                      </ListGroup.Item>
                    )}
                  </ListGroup>
                </Card.Body>
              </Card>
            )}
          </div>
        </div>
      </div>

      <ToastContainer position="top-end" className="p-3">
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={3000}
          autohide
          bg={toastVariant}
        >
          <Toast.Header>
            <strong className="me-auto">
              {toastVariant === "success" ? "Success" : toastVariant === "danger" ? "Error" : "Info"}
            </strong>
          </Toast.Header>
          <Toast.Body>{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
      <Footer />
    </>
  );
};

export default JoinAuction;
