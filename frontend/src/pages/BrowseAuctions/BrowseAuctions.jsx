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
  const [sortBy, setSortBy] = useState(
    searchParams.get("sort") || "starting-soon"
  );
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
          status: auction.auction_status,
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
      const mappedData = {
        ...data.preview,
        status: data.preview.auction_status,
        end_time: data.preview.auction_end_time,
        start_time: data.preview.auction_start_time,
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
      setPreviewData(null);
      const data = await getAuctionLeaderboard(auctionId);
      setPreviewData({
        ...data.leaderboard,
        auction_id: auctionId,
        status: "ended",
        is_leaderboard: true,
      });
      setShowPreview(true);
    } catch (err) {
      const errorMessage = err.message || "Failed to fetch auction leaderboard";
      setPreviewError(errorMessage);
      showNotification(errorMessage, "error");
      console.error("Error fetching auction leaderboard:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleViewDetails = (auction) => {
  if (!auction || !auction._id) return;

  const type = auction.auctionType_id?.type_name?.toLowerCase();

  if (type === "sealed_bid") {
    navigate(`/joinAuction/sealed_bid/${auction._id}`, {
      state: { auction },
    });
  } else if (auction.status === "active") {
    navigate(`/joinAuction/${type}/${auction._id}`, {
      state: { auction },
    });
  } else {
    fetchAuctionPreview(auction._id);
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
                {auctions.map((auction) => (
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
                          className="btn btn-link position-absolute top-0 end-0 me-5 mt-2"
                          onClick={() => toggleFavorite(auction._id)}
                          title={
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
                                viewMode === "list" ? "text-start" : "text-end"
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
                          </div>
                          <div className="d-flex gap-2">
                            {auction.auctionType_id?.type_name ===
                            "sealed_bid" ? (
                              <button
                                onClick={() => handleViewDetails(auction)}
                                className="btn btn-sm btn-success"
                                disabled={!auction._id}
                              >
                                <FontAwesomeIcon
                                  icon={faGavel}
                                  className="me-1"
                                />
                                Join Room
                              </button>
                            ) : auction.status === "active" ? (
                              <button
                                onClick={() => handleViewDetails(auction)}
                                className="btn btn-sm btn-success"
                                disabled={!auction._id}
                              >
                                <FontAwesomeIcon
                                  icon={faGavel}
                                  className="me-1"
                                />
                                Bid Now
                              </button>
                            ) : auction.status === "completed" ? (
                              <button
                                onClick={() =>
                                  fetchAuctionLeaderboard(auction._id)
                                }
                                className="btn btn-sm btn-outline-secondary"
                                disabled={!auction._id}
                              >
                                <FontAwesomeIcon
                                  icon={faTrophy}
                                  className="me-1"
                                />
                                Leaderboard
                              </button>
                            ) : (
                              <button
                                onClick={() => handleViewDetails(auction)}
                                className="btn btn-sm btn-outline-primary"
                                disabled={!auction._id}
                              >
                                <FontAwesomeIcon
                                  icon={faEye}
                                  className="me-1"
                                />
                                Preview
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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

      <ToastContainer position="top-end" className="p-3">
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={3000}
          autohide
          bg={toastVariant === "error" ? "danger" : toastVariant}
        >
          <Toast.Header>
            <strong className="me-auto">
              {toastVariant === "success"
                ? "Success"
                : toastVariant === "error"
                ? "Error"
                : "Info"}
            </strong>
            <small>just now</small>
          </Toast.Header>
          <Toast.Body className={toastVariant === "error" ? "text-white" : ""}>
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <Footer />
    </>
  );
};

export default BrowseAuctions;
