import React, { useState, useEffect } from "react";
import { Modal, Spinner, Alert, Button, Badge } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGavel,
  faClock,
  faUsers,
  faArrowTrendUp,
  faTag,
  faUser,
  faHeart,
} from "@fortawesome/free-solid-svg-icons";

const AuctionPreviewModal = ({
  showPreview,
  setShowPreview,
  previewData,
  previewLoading,
  previewError,
  favorites,
  toggleFavorite,
  navigate,
  calculateTimeLeft,
  getStatusBadgeClass,
  formatStatus,
}) => {
  // Unpack the preview object from previewData
  const auctionData = previewData || {};
  
  // State for dynamic time remaining
  const [timeRemaining, setTimeRemaining] = useState(
    auctionData.end_time ? calculateTimeLeft(auctionData.end_time) : "N/A"
  );

  // Format start time
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

  // Dynamic timer for time remaining
  useEffect(() => {
    if (!auctionData.end_time) {
      setTimeRemaining("N/A");
      return;
    }
    const updateTimer = () => {
      setTimeRemaining(calculateTimeLeft(auctionData.end_time));
    };
    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 1000); // Update every second
    return () => clearInterval(interval);
  }, [auctionData.end_time, calculateTimeLeft]);

  // Determine if the auction has ended based on current time
  const isEnded = auctionData.end_time ? new Date(auctionData.end_time) < new Date() : false;

  return (
    <Modal
      show={showPreview}
      onHide={() => setShowPreview(false)}
      size="xl"
      centered
      backdrop="static"
    >
      <Modal.Header closeButton className="bg-light border-bottom">
        <Modal.Title className="d-flex align-items-center">
          <FontAwesomeIcon icon={faGavel} className="me-2 text-primary" />
          <span className="fw-bold">Auction Preview</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-3">
        {previewLoading && (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <h6 className="mt-2 text-muted">Loading auction details...</h6>
          </div>
        )}

        {previewError && (
          <Alert variant="danger" className="text-center border-0 shadow-sm mb-3">
            <FontAwesomeIcon icon={faGavel} className="me-2" />
            <strong>{previewError}</strong>
          </Alert>
        )}

        {auctionData && Object.keys(auctionData).length > 0 && (
          <>
            {/* Header Section - More Compact */}
            <div className="row mb-3">
              <div className="col-lg-8">
                <h4 className="mb-2 text-dark fw-bold">
                  {auctionData.auction_title || "Untitled Auction"}
                </h4>
                <p className="text-muted mb-0 small">
                  {auctionData.auction_description || "No description available"}
                </p>
              </div>
              <div className="col-lg-4">
                <div className="text-lg-end mt-2 mt-lg-0">
                  <Badge 
                    className={`${getStatusBadgeClass(auctionData.status)} mb-2 px-2 py-1`}
                  >
                    {formatStatus(auctionData.status)}
                  </Badge>
                  <div className="small">
                    <FontAwesomeIcon icon={faUser} className="me-1 text-primary" />
                    <span className="fw-semibold">{auctionData.auctioneer || "Unknown"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Stats Cards */}
            <div className="row g-3 mb-3">
              {auctionData.status === "upcoming" && (
                <div className="col-lg-3 col-6">
                  <div className="card border-0 shadow-sm h-100 hover-card">
                    <div className="card-body text-center p-3">
                      <FontAwesomeIcon icon={faClock} className="text-primary mb-2" />
                      <h6 className="card-title text-muted mb-1 small">Start Time</h6>
                      <p className="fw-bold mb-0 small text-dark">
                        {formatStartTime(auctionData.start_time)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {auctionData.status === "active" && (
                <div className="col-lg-3 col-6">
                  <div className="card border-0 shadow-sm h-100 hover-card">
                    <div className="card-body text-center p-3">
                      <FontAwesomeIcon icon={faClock} className="text-warning mb-2" />
                      <h6 className="card-title text-muted mb-1 small">Time Left</h6>
                      <p className={`fw-bold mb-0 small ${isEnded || auctionData.status === "ended" ? 'text-danger' : 'text-warning'}`}>
                        {isEnded || auctionData.status === "ended" ? "Ended" : timeRemaining}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {auctionData.status === "completed" && (
                <>
                  <div className="col-lg-3 col-6">
                    <div className="card border-0 shadow-sm h-100 hover-card">
                      <div className="card-body text-center p-3">
                        <FontAwesomeIcon icon={faClock} className="text-primary mb-2" />
                        <h6 className="card-title text-muted mb-1 small">Start Time</h6>
                        <p className="fw-bold mb-0 small text-dark">
                          {formatStartTime(auctionData.start_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-3 col-6">
                    <div className="card border-0 shadow-sm h-100 hover-card">
                      <div className="card-body text-center p-3">
                        <FontAwesomeIcon icon={faClock} className="text-danger mb-2" />
                        <h6 className="card-title text-muted mb-1 small">End Time</h6>
                        <p className="fw-bold mb-0 small text-dark">
                          {formatStartTime(auctionData.end_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
              <div className="col-lg-3 col-6">
                <div className="card border-0 shadow-sm h-100 hover-card">
                  <div className="card-body text-center p-3">
                    <FontAwesomeIcon icon={faUsers} className="text-success mb-2" />
                    <h6 className="card-title text-muted mb-1 small">Bidders</h6>
                    <p className="fw-bold mb-0 text-success">
                      {auctionData.stats?.unique_bidders || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-lg-3 col-6">
                <div className="card border-0 shadow-sm h-100 hover-card">
                  <div className="card-body text-center p-3">
                    <FontAwesomeIcon icon={faArrowTrendUp} className="text-info mb-2" />
                    <h6 className="card-title text-muted mb-1 small">Total Bids</h6>
                    <p className="fw-bold mb-0 text-info">
                      {auctionData.stats?.total_bids || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Preview Items Section */}
            {auctionData.preview_items?.length > 0 && (
              <div className="mb-3">
                <div className="d-flex align-items-center mb-3">
                  <FontAwesomeIcon icon={faTag} className="me-2 text-primary" />
                  <h5 className="mb-0 fw-bold">
                    Preview Items ({auctionData.preview_items.length})
                    {auctionData.has_more_items && (
                      <Badge bg="secondary" className="ms-2 small">More Available</Badge>
                    )}
                  </h5>
                </div>
                
                <div className="row row-cols-1 row-cols-lg-2 g-3">
                  {auctionData.preview_items.map((item, index) => (
                    <div key={item._id || index} className="col">
                      <div className="card h-100 border-0 shadow-sm hover-card">
                        <div className="row g-0 h-100">
                          <div className="col-4">
                            <div className="position-relative h-100" style={{ minHeight: '120px' }}>
                              <img
                                src={
                                  item.images?.find((img) => img.is_primary)?.image_url ||
                                  item.images?.[0]?.image_url ||
                                  "/default-item.jpg"
                                }
                                className="img-fluid rounded-start h-100 w-100"
                                alt={item.name || "Auction item"}
                                style={{ objectFit: "cover" }}
                                onError={(e) => {
                                  e.target.src = "/default-item.jpg";
                                }}
                              />
                            </div>
                          </div>
                          <div className="col-8">
                            <div className="card-body d-flex flex-column h-100 p-3">
                              <div className="flex-grow-1">
                                <h6 className="card-title fw-bold text-dark mb-2">
                                  {item.name || "Unnamed Item"}
                                </h6>
                                <p className="text-muted mb-3 small" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                                  {item.description?.slice(0, 80) || "No description available"}
                                  {item.description?.length > 80 && "..."}
                                </p>
                              </div>
                              <div className="mt-auto">
                                {auctionData.auction_type?.toLowerCase() === "sealed_bid" ? (
                                  <div className="text-center small">
                                    <small className="text-muted d-block">Sealed Bid Auction</small>
                                    <span className="fw-bold text-dark">Place your bid to participate</span>
                                  </div>
                                ) : (
                                  <div className="row text-center small">
                                    <div className="col-6">
                                      <div className="border-end">
                                        <small className="text-muted d-block">Starting</small>
                                        <span className="fw-bold text-dark">
                                          ${item.starting_bid?.toLocaleString() || "0"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="col-6">
                                      <small className="text-muted d-block">Current</small>
                                      <span className="fw-bold text-success">
                                        ${(item.current_bid || item.starting_bid || 0).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer className="bg-light border-top p-3">
        <div className="d-flex gap-2 w-100 justify-content-end">
          <Button
            variant="outline-secondary"
            onClick={() => setShowPreview(false)}
            size="sm"
          >
            Close
          </Button>
          
          {auctionData?.auction_id && (
            <Button
              variant={favorites.includes(auctionData.auction_id) ? "outline-danger" : "outline-primary"}
              onClick={() => toggleFavorite(auctionData.auction_id)}
              size="sm"
            >
              <FontAwesomeIcon
                icon={faHeart}
                className={`me-1 ${favorites.includes(auctionData.auction_id) ? "text-danger" : ""}`}
              />
              {favorites.includes(auctionData.auction_id) ? "Remove" : "Add to"} Favorites
            </Button>
          )}
          
          {auctionData?.status === "active" && (
            <Button
              variant="primary"
              onClick={() => {
                setShowPreview(false);
                navigate(
                  `/joinAuction/${auctionData.auction_type?.toLowerCase()}/${auctionData.auction_id}`
                );
              }}
              size="sm"
              className="fw-bold"
            >
              <FontAwesomeIcon icon={faGavel} className="me-1" />
              Join Auction
            </Button>
          )}
        </div>
      </Modal.Footer>

      <style jsx>{`
        .hover-card {
          transition: all 0.3s ease;
        }
        .hover-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
    </Modal>
  );
};

export default AuctionPreviewModal;