import React, { useState, useEffect, useCallback, useRef } from "react";
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
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { io } from "socket.io-client";
import Navbar from "../../components/Navbar.jsx";
import Footer from "../../components/Footer.jsx";
import {
  getAuctionById,
  placeSealedBid,
  placeTimedBid,
} from "../../services/auctionService.js";
import useAuthStore from "../../store/authStore.js";
import "./joinAuction.css";

const JoinAuction = () => {
  const { auctionType, auction_id } = useParams();
  const navigate = useNavigate();
  const { accessToken, isAuthenticated, userId } = useAuthStore();
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
  const [isRevealed, setIsRevealed] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [hasBid, setHasBid] = useState(false);
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

      // Check if user has already bid in sealed bid auctions
      if (auctionType === "sealed_bid" && auctionData.bid_history) {
        const userBid = auctionData.bid_history.find(
          (bid) => bid.bidder_id === userId
        );
        setHasBid(!!userBid);
      }

      setLoading(false);
    } catch (err) {
      setError(err.message || "Failed to fetch auction details");
      setLoading(false);
      showNotification(
        err.message || "Failed to fetch auction details",
        "danger"
      );
    }
  }, [auction_id, auctionType, userId]);

  // Initial load & validation
  useEffect(() => {
    if (
      !auction_id ||
      !["sealed_bid", "single_timed_item"].includes(auctionType)
    ) {
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
      const end = new Date(auction.auction_end_time);
      const diff = end - now;

      if (diff <= 0) {
        setTimer("Auction Ended");
        return;
      }

      const days = String(Math.floor(diff / (1000 * 60 * 60 * 24))).padStart(
        2,
        "0"
      );
      const hours = String(
        Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      ).padStart(2, "0");
      const minutes = String(
        Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      ).padStart(2, "0");
      const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(
        2,
        "0"
      );

      setTimer(`${days}d : ${hours}h : ${minutes}m : ${seconds}s`);
    };

    calculateTimer();
    const interval = setInterval(calculateTimer, 1000);
    return () => clearInterval(interval);
  }, [auction]);

  // Socket.io for timed auctions
  useEffect(() => {
    if (auctionType !== "single_timed_item") return;

    if (!accessToken) {
      showNotification(
        "Authentication token missing. Please log in again.",
        "danger"
      );
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
      console.log(
        "Connected to auction namespace with socket ID:",
        socketRef.current.id
      );
      socketRef.current.emit("join_auction_room", auction_id);
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      if (error.message.includes("Authentication")) {
        showNotification(
          "Authentication failed. Please log in again.",
          "danger"
        );
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
        const updatedBidHistory = [newBid, ...(prev.bid_history || [])];
        const highestBid = Math.max(
          updatedBid.amount,
          prev.items[0]?.current_bid || 0,
          prev.items[0]?.starting_bid || 0
        );
        setBidAmount(highestBid + prev.settings.min_bid_increment);
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
      setMessage((prev) => prev || null); // Trigger re-render
      showNotification(
        `New bid of $${updatedBid.amount.toLocaleString()} placed!`,
        "info"
      );
    });

    socketRef.current.on("error", (error) => {
      console.error("Socket error:", error);
      showNotification(error.message || "Socket error occurred", "danger");
    });

    return () => {
      if (socketRef.current) {
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

    const minBid =
      auctionType === "sealed_bid"
        ? 0
        : Math.max(
            auction.items[0]?.current_bid || 0,
            auction.bid_history?.[0]?.amount ||
              auction.items[0]?.starting_bid ||
              0
          ) +
          (auctionType === "sealed_bid"
            ? 0
            : auction.settings.min_bid_increment);

    if (bidAmount < minBid) {
      setMessage(
        <Alert variant="danger" className="text-center" role="alert">
          {auctionType === "sealed_bid"
            ? "Enter your guess!"
            : `Bid must be at least $${minBid.toLocaleString()}`}
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
      const endpoint =
        auctionType === "sealed_bid" ? placeSealedBid : placeTimedBid;
      await endpoint(payload);

      setMessage(
        <Alert variant="success" className="text-center" role="alert">
          {auctionType === "sealed_bid"
            ? `Guess of $${bidAmount.toLocaleString()} recorded! (Sealed bid)`
            : `Bid of $${bidAmount.toLocaleString()} placed successfully!`}
        </Alert>
      );
      if (auctionType === "sealed_bid") {
        // Only set hasBid for sealed bids to enforce one-time bid
        setHasBid(true);
        fetchAuction();
      } else {
        // Reset bid amount for next bid in timed auctions
        setBidAmount(minBid + auction.settings.min_bid_increment);
      }
      showNotification("Action successful!", "success");
    } catch (err) {
      setMessage(
        <Alert variant="danger" className="text-center" role="alert">
          {err.message || "Failed to place bid"}
        </Alert>
      );
      showNotification(err.message || "Failed to place bid", "danger");
    }
  };

  // Fetch leaderboard on reveal
  const handleReveal = async () => {
    try {
      const response = await getAuctionById(auction_id);
      const auctionData = response.data.auction;
      const bids = auctionData.bid_history || [];
      const sortedBids = bids
        .slice()
        .sort((a, b) => b.amount - a.amount)
        .map((bid, idx) => ({
          ...bid,
          is_winner: idx === 0,
        }));
      const funStats = {
        totalBids: bids.length,
        averageBid: bids.length
          ? bids.reduce((sum, bid) => sum + bid.amount, 0) / bids.length
          : 0,
        highestBid: bids.length
          ? Math.max(...bids.map((bid) => bid.amount))
          : 0,
      };
      setLeaderboard([...sortedBids, funStats]);
      setIsRevealed(true);

      const confetti = document.createElement("script");
      confetti.src =
        "https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js";
      confetti.onload = () =>
        window.confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      document.body.appendChild(confetti);
    } catch (err) {
      showNotification("Failed to reveal leaderboard", "danger");
    }
  };

  if (!isAuthenticated()) {
    return (
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
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container p-5">
          {/* Skeleton for banner image */}
          <Skeleton height={400} borderRadius={6} />

          <div className="row mt-4">
            {/* Skeleton for auction title and description */}
            <div className="col-lg-8">
              <Skeleton height={40} width="60%" className="mb-3" />
              <Skeleton count={3} />
            </div>

            {/* Skeleton for sidebar details */}
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
  }

  if (error) {
    return (
      <>
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
      </>
    );
  }

  const isAuctionEnded = timer === "Auction Ended";
  const currentBid = Math.max(
    auction.items[0]?.current_bid || 0,
    auction.bid_history?.[0]?.amount || auction.items[0]?.starting_bid || 0
  );

  // Minimum bid for UI display
  const minBidDisplay =
    auctionType === "sealed_bid"
      ? 0
      : currentBid + (auction.settings.min_bid_increment || 0);

  return (
    <>
      <Navbar />
      <div className="container-fluid p-5 bg-light">
        <div className="row g-4">
          {/* Auction Banner and Description */}
          <div className="col-lg-8">
            <Card className="mb-4 shadow-lg rounded">
              <Card.Img
                variant="top"
                src={
                  auction.banner_image ||
                  "https://via.placeholder.com/800x400?text=No+Image"
                }
                alt={auction.auction_title}
                style={{
                  height: "400px",
                  objectFit: "cover",
                  borderTopLeftRadius: "0.3rem",
                  borderTopRightRadius: "0.3rem",
                }}
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
          </div>

          {/* Right Sidebar */}
          <div className="col-lg-4">
            {/* Timer */}
            <Card className="mb-4 shadow-sm rounded">
              <Card.Body className="text-center">
                <Badge
                  bg={isAuctionEnded ? "danger" : "dark"}
                  className="fs-5 py-2 px-3 d-inline-flex align-items-center gap-2"
                >
                  <FontAwesomeIcon icon={faClock} />
                  {timer}
                </Badge>
              </Card.Body>
              {auctionType === "single_timed_item" && (
                <Card.Body className="text-center">
                  <h4 className="text-success fw-bold my-3">
                    Current Bid: ${currentBid.toLocaleString()}
                  </h4>
                  <p className="text-muted mb-0">
                    Starting bid: $
                    {(auction.items[0]?.starting_bid || 0).toLocaleString()}
                  </p>
                </Card.Body>
              )}
            </Card>

            {/* Bid Form */}
            {!isAuctionEnded && (
              <Card className="mb-4 shadow-sm rounded">
                <Card.Body>
                  <Card.Title as="h4" className="mb-4">
                    {auctionType === "sealed_bid"
                      ? "Place Your Sealed Guess"
                      : "Place Your Bid"}
                  </Card.Title>

                  {message && <div className="mb-3">{message}</div>}

                  <Form onSubmit={handleBid}>
                    <Form.Floating className="mb-3">
                      <Form.Control
                        id="bidAmountInput"
                        type="number"
                        placeholder="Enter your bid"
                        value={bidAmount}
                        onChange={(e) =>
                          setBidAmount(Number(e.target.value) || "")
                        }
                        disabled={auctionType === "sealed_bid" && hasBid}
                        min={minBidDisplay}
                        required
                        aria-label={
                          auctionType === "sealed_bid"
                            ? "Guess the value"
                            : `Bid amount (minimum $${minBidDisplay.toLocaleString()})`
                        }
                      />
                      <label htmlFor="bidAmountInput">
                        {auctionType === "sealed_bid"
                          ? "Guess the Value"
                          : `Bid Amount (Min: $${minBidDisplay.toLocaleString()})`}
                      </label>
                    </Form.Floating>
                    <Form.Text className="text-muted mb-3 d-block">
                      {auctionType === "sealed_bid"
                        ? "You can only bid once. Make your guess count!"
                        : `Your bid must be at least $${minBidDisplay.toLocaleString()}.`}
                    </Form.Text>

                    {auction.is_invite_only && (
                      <Form.Floating className="mb-3">
                        <Form.Control
                          id="inviteCodeInput"
                          type="text"
                          placeholder="Invite Code"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          disabled={auctionType === "sealed_bid" && hasBid}
                          required
                          aria-label="Invite Code"
                        />
                        <label htmlFor="inviteCodeInput">Invite Code</label>
                      </Form.Floating>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-100 mb-3"
                      disabled={
                        (auctionType === "sealed_bid" && hasBid) || !bidAmount
                      }
                    >
                      {auctionType === "sealed_bid"
                        ? "Submit Guess"
                        : "Place Bid"}
                    </Button>

                    {/* Quick bid buttons for timed auctions */}
                    {auctionType === "single_timed_item" && (
                      <div
                        className="btn-group w-100"
                        role="group"
                        aria-label="Quick bid increments"
                      >
                        {[1, 2, 3].map((mult) => (
                          <Button
                            key={mult}
                            variant="outline-secondary"
                            onClick={() =>
                              setBidAmount(
                                currentBid +
                                  auction.settings.min_bid_increment * mult
                              )
                            }
                            aria-label={`Bid $${(
                              currentBid +
                              auction.settings.min_bid_increment * mult
                            ).toLocaleString()}`}
                          >
                            $
                            {(
                              currentBid +
                              auction.settings.min_bid_increment * mult
                            ).toLocaleString()}
                          </Button>
                        ))}
                      </div>
                    )}
                  </Form>

                  {auctionType === "sealed_bid" && hasBid && (
                    <Alert
                      variant="info"
                      className="text-center mt-3"
                      role="alert"
                    >
                      You have submitted your guess. No edits allowed!
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            )}

            {/* Bidding History for timed auction */}
            {auctionType === "single_timed_item" && (
              <Card className="shadow-sm rounded">
                <Card.Body>
                  <Card.Title as="h5" className="mb-3">
                    Bidding History
                  </Card.Title>
                  <ListGroup
                    variant="flush"
                    style={{ maxHeight: "250px", overflowY: "auto" }}
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {auction.bid_history && auction.bid_history.length > 0 ? (
                      auction.bid_history.map((bid, idx) => (
                        <ListGroup.Item
                          key={idx}
                          className="d-flex justify-content-between align-items-center"
                          active={bid.amount === currentBid}
                          aria-current={
                            bid.amount === currentBid ? "true" : undefined
                          }
                        >
                          <span>{bid.bidder_username || "Anonymous"}</span>
                          <span>
                            ${bid.amount.toLocaleString()}{" "}
                            {bid.amount === currentBid && (
                              <Badge bg="success" pill>
                                Winning
                              </Badge>
                            )}
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

            {/* Reveal button & leaderboard for sealed bid */}
            {auctionType === "sealed_bid" && isAuctionEnded && !isRevealed && (
              <Button
                variant="success"
                className="w-100 mb-3"
                size="lg"
                onClick={handleReveal}
                aria-label="Reveal sealed bid results"
              >
                Reveal Results
              </Button>
            )}

            {auctionType === "sealed_bid" &&
              isRevealed &&
              leaderboard.length > 0 && (
                <Card className="mb-4 shadow-sm rounded">
                  <Card.Body>
                    <Card.Title as="h5" className="mb-3">
                      Leaderboard
                    </Card.Title>
                    <Table
                      hover
                      responsive
                      striped
                      bordered
                      className="mb-3"
                      aria-describedby="leaderboard-description"
                    >
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
                          <tr
                            key={idx}
                            className={bid.is_winner ? "table-success" : ""}
                            aria-current={bid.is_winner ? "true" : undefined}
                          >
                            <td>{idx + 1}</td>
                            <td>{bid.bidder_username || "Anonymous"}</td>
                            <td>${bid.amount.toLocaleString()}</td>
                            <td>
                              {bid.is_winner && (
                                <Badge bg="success" pill>
                                  Winner!
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    <div
                      id="leaderboard-description"
                      className="small text-muted"
                    >
                      <strong>Fun Stats:</strong>
                      <ul>
                        <li>
                          Total Bids:{" "}
                          {leaderboard[leaderboard.length - 1].totalBids}
                        </li>
                        <li>
                          Average Bid: $
                          {leaderboard[
                            leaderboard.length - 1
                          ].averageBid.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </li>
                        <li>
                          Highest Bid: $
                          {leaderboard[
                            leaderboard.length - 1
                          ].highestBid.toLocaleString()}
                        </li>
                      </ul>
                    </div>
                  </Card.Body>
                </Card>
              )}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer
        position="top-end"
        className="p-3"
        aria-live="polite"
        aria-atomic="true"
      >
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={3000}
          autohide
          bg={toastVariant}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <Toast.Header closeButton>
            <strong className="me-auto">
              {toastVariant === "success"
                ? "Success"
                : toastVariant === "danger"
                ? "Error"
                : "Info"}
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
