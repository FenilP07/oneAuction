import React, { useEffect } from "react";
import { Modal, Spinner, Alert } from "react-bootstrap";
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

  // Force recalculate time left when data changes
  useEffect(() => {
    if (auctionData.end_time) {
      calculateTimeLeft(auctionData.end_time); // Ensure timer updates
    }
  }, [auctionData.end_time, calculateTimeLeft]);

  // Determine if the auction has ended based on current time
  const isEnded = new Date(auctionData.end_time) < new Date();

  return (
    <Modal
      show={showPreview}
      onHide={() => setShowPreview(false)}
      size="xl"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <FontAwesomeIcon icon={faGavel} className="me-2" />
          Auction Preview
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {previewLoading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" size="lg" />
            <h5 className="mt-3">Loading auction details...</h5>
          </div>
        )}

        {previewError && (
          <Alert variant="danger" className="text-center">
            <FontAwesomeIcon icon={faGavel} className="me-2" />
            {previewError}
          </Alert>
        )}

        {auctionData && Object.keys(auctionData).length > 0 && (
          <>
            <div className="row mb-4">
              <div className="col-md-8">
                <h3>{auctionData.auction_title || "Untitled Auction"}</h3>
                <p className="text-muted">
                  {auctionData.auction_description || "No description available"}
                </p>
              </div>
              <div className="col-md-4 text-end">
                {/* <span
                  className={`badge ${getStatusBadgeClass(
                    auctionData.auction_status
                  )} mb-2`}
                >
                  {formatStatus(auctionData.auction_status)}
                </span> */}
                <div>
                  <small className="text-muted">Hosted by:</small>
                  <div>
                    <FontAwesomeIcon icon={faUser} className="me-1" />
                    {auctionData.auctioneer || "Unknown"}
                  </div>
                </div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-md-4 mb-3">
                <div className="card h-100 text-center">
                  <div className="card-body">
                    <FontAwesomeIcon
                      icon={faClock}
                      className="text-primary mb-2"
                      size="2x"
                    />
                    <h6>Time Remaining</h6>
                    <p className="fw-bold">
                      {isEnded || auctionData.auction_status === "ended"
                        ? "Auction Ended"
                        : calculateTimeLeft(auctionData.end_time)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-md-4 mb-3">
                <div className="card h-100 text-center">
                  <div className="card-body">
                    <FontAwesomeIcon
                      icon={faUsers}
                      className="text-success mb-2"
                      size="2x"
                    />
                    <h6>Bidders</h6>
                    <p className="fw-bold">
                      {auctionData.stats?.unique_bidders || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-md-4 mb-3">
                <div className="card h-100 text-center">
                  <div className="card-body">
                    <FontAwesomeIcon
                      icon={faArrowTrendUp}
                      className="text-info mb-2"
                      size="2x"
                    />
                    <h6>Total Bids</h6>
                    <p className="fw-bold">
                      {auctionData.stats?.total_bids || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {auctionData.preview_items?.length > 0 && (
              <div className="mb-3">
                <h5>
                  <FontAwesomeIcon icon={faTag} className="me-2" />
                  Preview Items ({auctionData.preview_items.length})
                  {auctionData.has_more_items && " (More Available)"}
                </h5>
                <div className="row row-cols-1 row-cols-md-2 g-3">
                  {auctionData.preview_items.map((item, index) => (
                    <div key={item._id || index} className="col">
                      <div className="card h-100">
                        <div className="row g-0">
                          <div className="col-md-4">
                            <img
                              src={
                                item.images?.find((img) => img.is_primary)
                                  ?.image_url ||
                                item.images?.[0]?.image_url ||
                                "/default-item.jpg"
                              }
                              className="img-fluid rounded-start h-100"
                              alt={item.name || "Auction item"}
                              style={{
                                objectFit: "cover",
                                minHeight: "120px",
                              }}
                              onError={(e) => {
                                e.target.src = "/default-item.jpg";
                              }}
                            />
                          </div>
                          <div className="col-md-8">
                            <div className="card-body">
                              <h6 className="card-title">
                                {item.name || "Unnamed Item"}
                              </h6>
                              <p className="text-muted">
                                {item.description?.slice(0, 100) || "No description available"}
                                {item.description?.length > 100 && "..."}
                              </p>
                              <div className="d-flex justify-content-between">
                                <div>
                                  <small className="text-muted">
                                    Starting
                                  </small>
                                  <p className="mb-0">
                                    $
                                    {item.starting_bid?.toLocaleString() ||
                                      "0"}
                                  </p>
                                </div>
                                <div className="text-end">
                                  <small className="text-muted">
                                    Current
                                  </small>
                                  <p className="mb-0 text-success fw-bold">
                                    $
                                    {(
                                      item.current_bid ||
                                      item.starting_bid ||
                                      0
                                    ).toLocaleString()}
                                  </p>
                                </div>
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

      <Modal.Footer>
        <button
          className="btn btn-secondary"
          onClick={() => setShowPreview(false)}
        >
          Close
        </button>
        {auctionData?.auction_status === "active" && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowPreview(false);
              navigate(
                `/joinAuction/${auctionData.auction_type?.toLowerCase()}/${
                  auctionData.auction_id
                }`
              );
            }}
          >
            <FontAwesomeIcon icon={faGavel} className="me-2" />
            Join Auction
          </button>
        )}
        {auctionData?.auction_id && (
          <button
            className="btn btn-outline-primary"
            onClick={() => toggleFavorite(auctionData.auction_id)}
          >
            <FontAwesomeIcon
              icon={faHeart}
              className={`me-2 ${
                favorites.includes(auctionData.auction_id) ? "text-danger" : ""
              }`}
            />
            {favorites.includes(auctionData.auction_id)
              ? "Remove from"
              : "Add to"}{" "}
            Favorites
          </button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default AuctionPreviewModal;