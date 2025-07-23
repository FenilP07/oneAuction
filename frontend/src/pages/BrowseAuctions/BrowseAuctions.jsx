import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faArrowTrendUp,
  faGavel,
  faClock,
  faTag,
  faEye,
  faSearch,
  faFilter,
  faSyncAlt,
  faSort,
  faTh,
  faList,
  faHeart,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons";
import {
  Spinner,
  Alert,
  Pagination,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import Navbar from "../../components/Navbar.jsx";
import Footer from "../../components/Footer.jsx";
import AuctionPreviewModal from "../../components/AuctionPreviewModal.jsx";
import AuctionLeaderboardModal from "../../components/AuctionLeaderboardModal.jsx";
import {
  getAllAuctions,
  getAuctionPreview,
  getAuctionLeaderboard,
} from "../../services/auctionService.js";
import "./browseAuction.css";

const BrowseAuctions = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State management
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [auctionType, setAuctionType] = useState(
    searchParams.get("type") || "all"
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "all"
  );
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
  const [viewMode, setViewMode] = useState(
    localStorage.getItem("viewMode") || "grid"
  );
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timerTexts, setTimerTexts] = useState({});
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page")) || 1
  );
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(
    parseInt(localStorage.getItem("itemsPerPage")) || 9
  );
  const [favorites, setFavorites] = useState(
    JSON.parse(localStorage.getItem("favoriteAuctions")) || []
  );

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Leaderboard modal state
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState(null);

  // Toast notifications
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("info");

  // Memoized filter options
  const filterOptions = useMemo(
    () => ({
      types: [
        { value: "all", label: "All Types" },
        { value: "live", label: "Live Auctions" },
        { value: "single_timed_item", label: "Timed Auctions" },
        { value: "sealed_bid", label: "Sealed Bids" },
      ],
      statuses: [
        { value: "all", label: "All Statuses" },
        { value: "upcoming", label: "Upcoming" },
        { value: "active", label: "Active" },
        { value: "ended", label: "Ended" },
      ],
      sortOptions: [
        { value: "starting-soon", label: "Starting Soon" },
        { value: "ending-soon", label: "Ending Soon" },
        { value: "newest", label: "Newest First" },
        { value: "oldest", label: "Oldest First" },
        { value: "most-bidders", label: "Most Popular" },
        { value: "highest-bid", label: "Highest Bid" },
      ],
    }),
    []
  );

  // Update URL params when filters change
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (auctionType !== "all") params.set("type", auctionType);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (sortBy !== "starting-soon") params.set("sort", sortBy);
    if (currentPage !== 1) params.set("page", currentPage.toString());
    setSearchParams(params);
  }, [
    searchTerm,
    auctionType,
    statusFilter,
    sortBy,
    currentPage,
    setSearchParams,
  ]);

  // Fetch auctions with improved error handling
  const fetchAuctions = useCallback(
    async (showLoadingSpinner = true) => {
      try {
        if (showLoadingSpinner) {
          setLoading(true);
        }
        setError(null);

        const queryParams = {
          search: searchTerm,
          type: auctionType === "all" ? undefined : auctionType,
          status: statusFilter === "all" ? undefined : statusFilter,
          page: currentPage,
          limit: itemsPerPage,
          sort: sortBy,
        };

        const data = await getAllAuctions(queryParams);
        const mappedAuctions = data.auctions.map((auction) => ({
          ...auction,
          status: auction.auction_status || auction.status || "unknown",
          end_time: auction.auction_end_time,
          start_time: auction.auction_start_time,
        }));

        setAuctions(mappedAuctions);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.totalItems || 0);

        if (searchTerm && mappedAuctions.length > 0) {
          showNotification(`Found ${data.totalItems} auctions`, "success");
        }
      } catch (err) {
        const errorMessage = err.message || "Failed to fetch auctions";
        setError(errorMessage);
        showNotification(errorMessage, "error");
        console.error("Error fetching auctions:", err);
      } finally {
        if (showLoadingSpinner) {
          setLoading(false);
        }
      }
    },
    [searchTerm, auctionType, statusFilter, currentPage, itemsPerPage, sortBy]
  );

  // Debounced search effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchAuctions();
      updateUrlParams();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [
    searchTerm,
    auctionType,
    statusFilter,
    sortBy,
    currentPage,
    itemsPerPage,
  ]);

  // Timer effect with performance optimization
  useEffect(() => {
    if (auctions.length === 0) return;
    const updateTimers = () => {
      const updated = {};
      auctions.forEach((auction) => {
        updated[auction._id] = calculateTimeLeft(auction.end_time);
      });
      setTimerTexts(updated);
    };
    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [auctions]);

  // Auto-refresh active auctions
  useEffect(() => {
    if (statusFilter === "active" || statusFilter === "all") {
      const refreshInterval = setInterval(() => {
        fetchAuctions(false);
      }, 30000);
      return () => clearInterval(refreshInterval);
    }
  }, [statusFilter, fetchAuctions]);

  // Utility functions
  const calculateTimeLeft = (endDate) => {
    if (!endDate) return "N/A";
    const now = new Date();
    const end = new Date(endDate);
    const difference = end - now;
    if (difference <= 0) return "Auction Ended";
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };
  const formatStartTime = (startDate) => {
    if (!startDate) return "N/A";
    const date = new Date(startDate);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getAuctionTypeName = (auctionType) => {
    if (!auctionType) return "Unknown";
    const name = auctionType.type_name?.toLowerCase();
    return (
      {
        live: "Live Auction",
        sealed_bid: "Sealed Bid",
        single_timed_item: "Timed Auction",
      }[name] ||
      auctionType.type_name ||
      "Unknown"
    );
  };

  const getStatusBadgeClass = (status) => {
    if (!status) return "bg-secondary";
    switch (status.toLowerCase()) {
      case "active":
        return "bg-success";
      case "upcoming":
        return "bg-warning text-dark";
      case "ended":
        return "bg-danger";
      default:
        return "bg-secondary";
    }
  };

  const formatStatus = (status) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const showNotification = (message, variant = "info") => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };

  const toggleFavorite = (auctionId) => {
    const newFavorites = favorites.includes(auctionId)
      ? favorites.filter((id) => id !== auctionId)
      : [...favorites, auctionId];
    setFavorites(newFavorites);
    localStorage.setItem("favoriteAuctions", JSON.stringify(newFavorites));
    const action = newFavorites.includes(auctionId)
      ? "added to"
      : "removed from";
    showNotification(`Auction ${action} favorites`, "success");
  };

  const fetchAuctionPreview = async (auctionId) => {
    try {
      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewData(null);
      const data = await getAuctionPreview(auctionId);
      console.log("Auction Preview API Response:", data); // Debug log
      if (!data.preview?.end_time) {
        console.warn("Missing end_time in preview data");
      }
      const mappedData = {
        ...data.preview,
        status: data.preview.status || "unknown", // Use status from preview
        end_time: data.preview.end_time || null, // Use end_time from preview
        start_time: data.preview.start_time || null, // Use start_time from preview
      };
      setPreviewData(mappedData);
      setShowPreview(true);
    } catch (err) {
      const errorMessage =
        err.message ||
        "Failed to fetch auction preview. If unauthorized, please log in.";
      setPreviewError(errorMessage);
      showNotification(errorMessage, "error");
      console.error("Error fetching auction preview:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const fetchAuctionLeaderboard = async (auctionId) => {
    try {
      setPreviewLoading(true);
      setPreviewError(null);
      setLeaderboardData(null);

      const response = await getAuctionLeaderboard(auctionId);
      console.log("Leaderboard response:", response);

      let responseData = null;
      let isSuccess = false;

      if (response) {
        if (response.success && response.data) {
          responseData = response.data;
          isSuccess = true;
        } else if (response.statusCode === 200 && response.data) {
          responseData = response.data;
          isSuccess = true;
        } else if (response.leaderboard) {
          responseData = response;
          isSuccess = true;
        }
      }

      if (!isSuccess || !responseData) {
        const errorMsg = response?.message || "Failed to fetch leaderboard";
        throw new Error(errorMsg);
      }

      const leaderboardData = responseData.leaderboard;

      if (!leaderboardData || !Array.isArray(leaderboardData)) {
        throw new Error("Invalid leaderboard data format received from server");
      }

      if (leaderboardData.length === 0) {
        throw new Error("No items found in this auction leaderboard");
      }

      const leaderboardDataToSet = {
        leaderboard: leaderboardData,
        auction_title: responseData.auction_title || "Auction Results",
        auction_description: responseData.auction_description || "",
        auction_status: responseData.auction_status,
        auction_start_time: responseData.auction_start_time,
        auction_end_time: responseData.auction_end_time,
        total_items: responseData.total_items || leaderboardData.length,
        auction_id: auctionId,
        status: responseData.auction_status || "completed",
      };

      setLeaderboardData(leaderboardDataToSet);
      setShowLeaderboard(true);
      showNotification(
        `Leaderboard loaded with ${leaderboardData.length} items`,
        "success"
      );
    } catch (err) {
      let errorMessage = "Failed to fetch auction leaderboard";

      if (err.message.includes("not found") || err.message.includes("404")) {
        errorMessage = "Auction not found or not completed yet";
      } else if (err.message.includes("No items found")) {
        errorMessage = "No items found in this auction leaderboard";
      } else if (err.message.includes("Invalid leaderboard data format")) {
        errorMessage = "Invalid data format received from server";
      } else if (
        err.message.includes("Network Error") ||
        err.message.includes("fetch")
      ) {
        errorMessage = "Network error - please check your connection";
      } else if (err.message.includes("401") || err.message.includes("403")) {
        errorMessage = "Authentication required - please log in";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setPreviewError(errorMessage);
      showNotification(errorMessage, "error");
      console.error("Error fetching auction leaderboard:", err);
      console.error("Full error details:", {
        message: err.message,
        stack: err.stack,
        response: err.response,
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleJoinRoom = (auction) => {
    if (!auction || !auction._id) return;
    const type = auction.auctionType_id?.type_name?.toLowerCase();
    if (type === "sealed_bid") {
      navigate(`/joinAuction/sealed_bid/${auction._id}`, {
        state: { auction },
      });
    } else if (type === "single_timed_item") {
      navigate(`/joinAuction/single_timed_item/${auction._id}`, {
        state: { auction },
      });
    } else if (type === "live") {
      navigate(`/joinAuction/live/${auction._id}`, {
        state: { auction },
      });
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    localStorage.setItem("itemsPerPage", newItemsPerPage.toString());
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem("viewMode", mode);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setAuctionType("all");
    setStatusFilter("all");
    setSortBy("starting-soon");
    setCurrentPage(1);
    setSearchParams(new URLSearchParams());
    showNotification("Filters reset", "info");
  };

  const refreshAuctions = () => {
    fetchAuctions(true);
    showNotification("Auctions refreshed", "success");
  };

  // Loading state
  if (loading) {
    return (
      <>
        <Navbar />
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: "50vh" }}
        >
          <div className="text-center">
            <Spinner animation="border" variant="primary" size="lg" />
            <div className="mt-3">
              <h5>Loading auctions...</h5>
              <p className="text-muted">
                Please wait while we fetch the latest auctions
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Navbar />
        <div className="container mt-5">
          <Alert variant="danger" className="text-center">
            <FontAwesomeIcon icon={faGavel} className="mb-3" size="3x" />
            <h4>Error Loading Auctions</h4>
            <p>{error}</p>
            <div className="d-flex justify-content-center gap-2">
              <button className="btn btn-primary" onClick={refreshAuctions}>
                <FontAwesomeIcon icon={faSyncAlt} className="me-2" />
                Try Again
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => navigate("/")}
              >
                Go Home
              </button>
            </div>
          </Alert>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container-fluid bg-light py-4">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold mb-0">
              <FontAwesomeIcon icon={faGavel} className="me-2" />
              Browse Auctions
            </h2>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary"
                onClick={refreshAuctions}
                title="Refresh auctions"
              >
                <FontAwesomeIcon icon={faSyncAlt} />
              </button>
              <div className="btn-group" role="group">
                <button
                  className={`btn ${
                    viewMode === "grid" ? "btn-primary" : "btn-outline-primary"
                  }`}
                  onClick={() => handleViewModeChange("grid")}
                  title="Grid view"
                >
                  <FontAwesomeIcon icon={faTh} />
                </button>
                <button
                  className={`btn ${
                    viewMode === "list" ? "btn-primary" : "btn-outline-primary"
                  }`}
                  onClick={() => handleViewModeChange("list")}
                  title="List view"
                >
                  <FontAwesomeIcon icon={faList} />
                </button>
              </div>
            </div>
          </div>

          <div className="card mb-4 shadow-sm">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <div className="input-group">
                    <span className="input-group-text">
                      <FontAwesomeIcon icon={faSearch} />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search auctions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="input-group">
                    <span className="input-group-text">
                      <FontAwesomeIcon icon={faFilter} />
                    </span>
                    <select
                      className="form-select"
                      value={auctionType}
                      onChange={(e) => setAuctionType(e.target.value)}
                    >
                      {filterOptions.types.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="input-group">
                    <span className="input-group-text">
                      <FontAwesomeIcon icon={faClock} />
                    </span>
                    <select
                      className="form-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      {filterOptions.statuses.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="input-group">
                    <span className="input-group-text">
                      <FontAwesomeIcon icon={faSort} />
                    </span>
                    <select
                      className="form-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      {filterOptions.sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-1">
                  <select
                    className="form-select"
                    value={itemsPerPage}
                    onChange={(e) =>
                      handleItemsPerPageChange(parseInt(e.target.value))
                    }
                    title="Items per page"
                  >
                    <option value={9}>9</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={resetFilters}
                  >
                    <FontAwesomeIcon icon={faSyncAlt} className="me-1" />
                    Reset
                  </button>
                </div>
              </div>
              <div className="mt-3 d-flex justify-content-between align-items-center">
                <small className="text-muted">
                  Showing {auctions.length} of {totalItems} auctions
                  {searchTerm && ` for "${searchTerm}"`}
                </small>
                <small className="text-muted">
                  Page {currentPage} of {totalPages}
                </small>
              </div>
            </div>
          </div>

          {auctions.length === 0 ? (
            <div className="card shadow-sm">
              <div className="card-body text-center py-5">
                <FontAwesomeIcon
                  icon={faGavel}
                  className="text-muted mb-3"
                  size="3x"
                />
                <h4 className="text-muted">No auctions found</h4>
                <p className="text-muted">
                  {searchTerm
                    ? `No auctions match your search for "${searchTerm}"`
                    : "Try adjusting your search filters"}
                </p>
                <button className="btn btn-primary" onClick={resetFilters}>
                  <FontAwesomeIcon icon={faSyncAlt} className="me-2" />
                  Reset Filters
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`row ${
                  viewMode === "grid"
                    ? "row-cols-1 row-cols-md-2 row-cols-lg-3"
                    : "row-cols-1"
                } g-4`}
              >
                {auctions.map((auction) => {
                  const auctionType =
                    auction.auctionType_id?.type_name?.toLowerCase();
                  const status = auction.status?.toLowerCase();
                  const isTimedOrSealed =
                    auctionType === "single_timed_item" ||
                    auctionType === "sealed_bid";
                  const isEnded = status === "ended";
                  const isSealedBid = auctionType === "sealed_bid";

                  return (
                    <div className="col" key={auction._id}>
                      <div
                        className={`card h-100 shadow-sm auction-card ${
                          viewMode === "list" ? "card-horizontal" : ""
                        }`}
                      >
                        <div className="position-relative">
                          <span
                            className={`badge ${getStatusBadgeClass(
                              auction.status
                            )} position-absolute top-0 start-0 m-2`}
                          >
                            {formatStatus(auction.status)}
                          </span>
                          <span className="badge bg-primary position-absolute top-0 end-0 m-2">
                            {getAuctionTypeName(auction.auctionType_id)}
                          </span>
                          <button
                            className="btn btn-link position-absolute top-100 end-0 mt-2"
                            onClick={() => toggleFavorite(auction._id)}
                            aria-label={
                              favorites.includes(auction._id)
                                ? "Remove from favorites"
                                : "Add to favorites"
                            }
                          >
                            <FontAwesomeIcon
                              icon={faHeart}
                              className={
                                favorites.includes(auction._id)
                                  ? "text-danger"
                                  : "text-muted"
                              }
                            />
                          </button>
                          <div
                            className={`auction-banner ${
                              viewMode === "list" ? "list-banner" : ""
                            }`}
                            style={{
                              backgroundImage: `url(${
                                auction.banner_image || "/default-auction.jpg"
                              })`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              height: viewMode === "list" ? "150px" : "200px",
                            }}
                            onError={(e) => {
                              e.target.style.backgroundImage =
                                'url("/default-auction.jpg")';
                            }}
                          ></div>
                        </div>
                        <div className="card-body">
                          <h5 className="card-title">
                            {auction.auction_title || "Untitled Auction"}
                          </h5>
                          <p className="card-text text-muted">
                            {auction.auction_description?.slice(
                              0,
                              viewMode === "list" ? 200 : 100
                            ) || "No description available"}
                            {auction.auction_description?.length >
                              (viewMode === "list" ? 200 : 100) && "..."}
                          </p>
                          <div
                            className={`${
                              viewMode === "list"
                                ? "d-flex justify-content-between"
                                : ""
                            } mb-2`}
                          >
                            <div
                              className={
                                viewMode === "list"
                                  ? "me-4"
                                  : "d-flex justify-content-between mb-2"
                              }
                            >
                              {!isEnded && (
                                <div>
                                  <small className="text-muted">
                                    Start Time:
                                  </small>
                                  <div className="fw-bold text-primary">
                                    {formatStartTime(auction.start_time)}
                                  </div>
                                </div>
                              )}
                              <div>
                                <small className="text-muted">
                                  Time Remaining:
                                </small>
                                <div className="fw-bold text-primary">
                                  {timerTexts[auction._id] || "--"}
                                </div>
                              </div>
                              <div
                                className={
                                  viewMode === "list"
                                    ? "text-start"
                                    : "text-end"
                                }
                              >
                                <small className="text-muted">Bidders:</small>
                                <div>
                                  <FontAwesomeIcon
                                    icon={faUsers}
                                    className="me-1"
                                  />
                                  {auction.settings?.unique_bidders || 0}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              {isSealedBid ? (
                                <div className="text-muted">
                                  Sealed Bid - Place your bid to participate
                                </div>
                              ) : (
                                <>
                                  <small className="text-muted">
                                    {auction.auctionType_id?.type_name?.toLowerCase() ===
                                      "single_timed_item" &&
                                    auction.items?.[0]?.current_bid
                                      ? "Current Bid"
                                      : "Starting Bid"}
                                  </small>
                                  <div className="fw-bold">
                                    $
                                    {(auction.auctionType_id?.type_name?.toLowerCase() ===
                                      "single_timed_item" &&
                                    auction.items?.[0]?.current_bid
                                      ? auction.items[0].current_bid
                                      : auction.settings?.reserve_price || 0
                                    ).toLocaleString()}
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="d-flex gap-2">
                              {isTimedOrSealed &&
                                status !== "completed" &&
                                status !== "cancelled" && (
                                  <button
                                    onClick={() =>
                                      fetchAuctionPreview(auction._id)
                                    }
                                    className="btn btn-sm btn-outline-primary"
                                    disabled={!auction._id}
                                    aria-label="Preview auction"
                                  >
                                    <FontAwesomeIcon
                                      icon={faEye}
                                      className="me-1"
                                    />
                                    Preview
                                  </button>
                                )}
                              {status === "active" && (
                                <button
                                  onClick={() => handleJoinRoom(auction)}
                                  className="btn btn-sm btn-success"
                                  disabled={!auction._id}
                                  aria-label="Join auction room"
                                >
                                  <FontAwesomeIcon
                                    icon={faGavel}
                                    className="me-1"
                                  />
                                  Join Room
                                </button>
                              )}
                              {status === "completed" &&
                                auctionType === "single_timed_item" && (
                                  <button
                                    onClick={() =>
                                      fetchAuctionLeaderboard(auction._id)
                                    }
                                    className="btn btn-sm btn-outline-secondary"
                                    disabled={!auction._id}
                                    aria-label="View auction leaderboard"
                                  >
                                    <FontAwesomeIcon
                                      icon={faTrophy}
                                      className="me-1"
                                    />
                                    Leaderboard
                                  </button>
                                )}
                              {status === "completed" &&
                                auctionType === "sealed_bid" && (
                                  <button
                                    onClick={() => handleJoinRoom(auction)}
                                    className="btn btn-sm btn-outline-secondary"
                                    disabled={!auction._id}
                                    aria-label="Reveal sealed bid results"
                                  >
                                    <FontAwesomeIcon
                                      icon={faEye}
                                      className="me-1"
                                    />
                                    Reveal
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination size="lg">
                    <Pagination.First
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(1)}
                    />
                    <Pagination.Prev
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                    />
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Pagination.Item
                          key={pageNum}
                          active={pageNum === currentPage}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Pagination.Item>
                      );
                    })}
                    <Pagination.Next
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                    />
                    <Pagination.Last
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(totalPages)}
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AuctionPreviewModal
        showPreview={showPreview}
        setShowPreview={setShowPreview}
        previewData={previewData}
        previewLoading={previewLoading}
        previewError={previewError}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        navigate={navigate}
        calculateTimeLeft={calculateTimeLeft}
        getStatusBadgeClass={getStatusBadgeClass}
        formatStatus={formatStatus}
      />

      <AuctionLeaderboardModal
        showLeaderboard={showLeaderboard}
        setShowLeaderboard={setShowLeaderboard}
        leaderboardData={leaderboardData}
        previewLoading={previewLoading}
        previewError={previewError}
        auctionTitle={leaderboardData?.auction_title}
        formatStatus={formatStatus}
        getStatusBadgeClass={getStatusBadgeClass}
      />

      <ToastContainer position="top-end" className="p-3">
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={4000}
          autohide
          style={{
            backgroundColor:
              toastVariant === "success"
                ? "rgba(168, 90, 50, 0.95)"
                : toastVariant === "error"
                ? "rgba(139, 69, 19, 0.95)"
                : "rgba(101, 67, 33, 0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "15px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            color: "white",
            minWidth: "350px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Toast.Header
            style={{
              backgroundColor: "transparent",
              border: "none",
              color: "white",
              paddingBottom: "0.5rem",
            }}
            closeVariant="white"
          >
            <div className="d-flex align-items-center w-100">
              <div className="d-flex align-items-center">
                {toastVariant === "success" && (
                  <svg
                    className="me-2"
                    width="20"
                    height="20"
                    fill="white"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {toastVariant === "error" && (
                  <svg
                    className="me-2"
                    width="20"
                    height="20"
                    fill="white"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {(toastVariant === "info" || !toastVariant) && (
                  <svg
                    className="me-2"
                    width="20"
                    height="20"
                    fill="#f4a460"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                <strong className="fw-bold">
                  {toastVariant === "success"
                    ? "Success"
                    : toastVariant === "error"
                    ? "Error"
                    : "Info"}
                </strong>
              </div>
              <small
                className="ms-auto"
                style={{ color: "rgba(255, 255, 255, 0.7)" }}
              >
                just now
              </small>
            </div>
          </Toast.Header>

          <Toast.Body
            style={{ color: "white", paddingTop: "0.25rem", lineHeight: "1.5" }}
          >
            {toastMessage}
          </Toast.Body>

          {/* Progress bar */}
          <div
            className="progress-bar-container"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "3px",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              borderRadius: "0 0 15px 15px",
              overflow: "hidden",
            }}
          >
            <div
              className="progress-bar-fill"
              style={{
                height: "100%",
                backgroundColor:
                  toastVariant === "success"
                    ? "#a85a32"
                    : toastVariant === "error"
                    ? "#8b4513"
                    : "#d2691e",
                animation: "shrinkProgress 4s linear forwards",
                width: "100%",
              }}
            />
          </div>
        </Toast>
      </ToastContainer>

      <style>
        {`
  @keyframes shrinkProgress {
    from { width: 100%; }
    to { width: 0%; }
  }
  
  .btn-close-white {
    filter: invert(1) grayscale(100%) brightness(200%);
  }
`}
      </style>

      <Footer />
    </>
  );
};

export default BrowseAuctions;
