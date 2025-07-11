import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import getAllAuctionTypes from "../services/auctioTypeService"; // Note: Typo in 'auctioTypeService'
import { getMyAvailableItems } from "../services/itemService";
import { createAuction } from "../services/auctionService";

const AuctionModal = ({ onAuctionCreate }) => {
  const [showModal, setShowModal] = useState(false);
  const [auctionTypes, setAuctionTypes] = useState([]);
  const [selectedAuctionType, setSelectedAuctionType] = useState(null);
  const [itemsData, setItemsData] = useState({
    items: [],
    totalItems: 0,
    currentPage: 1,
    totalPages: 1,
  });
  const [auctionData, setAuctionData] = useState({
    startDate: "",
    startTime: "",
    timePeriod: "",
    agreement: false,
    items: [],
    sequence: [],
    auction_title: "",
    auction_description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState(null);
  const itemsPerPage = 10; // Matches backend limit

  // Get current date and time
  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];
  const currentTime = now
    .toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })
    .slice(0, 5);

  const handleAuctionCreate = (data) => {
    onAuctionCreate(data);
    resetModal();
  };

  const resetModal = () => {
    setShowModal(false);
    setSelectedAuctionType(null);
    setItemsData({ items: [], totalItems: 0, currentPage: 1, totalPages: 1 });
    setAuctionData({
      startDate: currentDate,
      startTime: currentTime,
      timePeriod: "",
      agreement: false,
      items: [],
      sequence: [],
      auction_title: "",
      auction_description: "",
    });
    setIsSubmitting(false);
    setError(null);
  };

  const handleItemSelect = (item) => {
    if (selectedAuctionType.type_name === "live") {
      setAuctionData((prev) => {
        const isSelected = prev.items.includes(item._id);
        const updatedItems = isSelected
          ? prev.items.filter((id) => id !== item._id)
          : [...prev.items, item._id];
        const updatedSequence = isSelected
          ? prev.sequence.filter((_, i) => prev.items[i] !== item._id)
          : [...prev.sequence, prev.sequence.length + 1];
        return { ...prev, items: updatedItems, sequence: updatedSequence };
      });
    } else {
      setAuctionData((prev) => ({ ...prev, items: [item._id] }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAuctionData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError(null); // Clear error on input change
  };

  const validateForm = () => {
    if (!auctionData.auction_title) return "Auction title is required.";
    if (!auctionData.startDate) return "Start date is required.";
    if (!auctionData.startTime) return "Start time is required.";
    if (!auctionData.timePeriod || auctionData.timePeriod <= 0) return "Valid duration is required.";
    if (!auctionData.agreement) return "You must agree to the terms.";
    if (auctionData.items.length === 0) return "At least one item must be selected.";
    return null;
  };

  const submitAuction = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { startDate, startTime, timePeriod, items, auction_title, auction_description } = auctionData;
    const auction_start_time = new Date(`${startDate}T${startTime}`);
    const auction_end_time = new Date(auction_start_time.getTime() + timePeriod * 60000);

    const payload = {
      auctionType_id: selectedAuctionType._id,
      auction_title,
      auction_description,
      auction_start_time,
      auction_end_time,
      settings: selectedAuctionType.type_name === "live" ? { item_ids: items } : { item_id: items[0] },
    };

    try {
      const created = await createAuction(payload);
      handleAuctionCreate(created);
    } catch (err) {
      setError(err.message || "Auction creation failed.");
      setIsSubmitting(false);
    }
  };

  const fetchItems = async (page = 1) => {
    setLoadingItems(true);
    setError(null);
    try {
      const data = await getMyAvailableItems({ page, limit: itemsPerPage });
      setItemsData(data);
    } catch (err) {
      setError(err.message || "Failed to fetch items.");
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (showModal) {
      const modal = document.querySelector(".modal");
      modal.classList.add("show");
      modal.style.display = "block";
      document.body.classList.add("modal-open");

      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop fade show";
      document.body.appendChild(backdrop);

      getAllAuctionTypes()
        .then(setAuctionTypes)
        .catch((err) => setError("Failed to fetch auction types."));

      return () => {
        modal.classList.remove("show");
        modal.style.display = "none";
        document.body.classList.remove("modal-open");
        if (document.body.contains(backdrop)) document.body.removeChild(backdrop);
      };
    }
  }, [showModal]);

  useEffect(() => {
    if (selectedAuctionType) {
      fetchItems(1); // Fetch first page when auction type is selected
    }
  }, [selectedAuctionType]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= itemsData.totalPages) {
      fetchItems(newPage);
    }
  };

  return (
    <>
      <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
        <i className="bi bi-plus me-1"></i>
        Create Auction
      </button>

      <div className="modal fade" tabIndex="-1" role="dialog" aria-labelledby="auctionModalLabel" aria-hidden={!showModal}>
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white py-2">
              <h5 className="modal-title fs-6" id="auctionModalLabel">
                <i className="bi bi-hammer me-1"></i>
                Create Auction
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white m-0"
                onClick={resetModal}
                disabled={isSubmitting}
                aria-label="Close"
              ></button>
            </div>

            <div className="modal-body p-3">
              {error && (
                <div className="alert alert-danger py-2 px-3 mb-2" role="alert">
                  {error}
                </div>
              )}

              {!selectedAuctionType ? (
                <div className="text-center py-2">
                  <h6 className="mb-3">Select Auction Type</h6>
                  <div className="d-flex justify-content-center gap-2">
                    {auctionTypes.length === 0 ? (
                      <div className="alert alert-info py-2 px-3">No auction types available</div>
                    ) : (
                      auctionTypes.map((type) => (
                        <button
                          key={type._id}
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => setSelectedAuctionType(type)}
                        >
                          {type.type_name === "live" ? (
                            <i className="bi bi-lightning me-1"></i>
                          ) : (
                            <i className="bi bi-clock me-1"></i>
                          )}
                          {type.type_name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="d-flex align-items-center mb-2">
                    <button
                      className="btn btn-sm btn-outline-secondary me-2"
                      onClick={() => setSelectedAuctionType(null)}
                    >
                      <i className="bi bi-arrow-left"></i>
                    </button>
                    <h6 className="m-0 text-capitalize">{selectedAuctionType.type_name} Auction</h6>
                  </div>

                  <div className="row g-2">
                    <div className="col-md-8">
                      <h6 className="mb-2 fs-6">Select Items</h6>
                      {loadingItems ? (
                        <div className="text-center py-2">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </div>
                      ) : itemsData.items.length === 0 ? (
                        <div className="alert alert-info py-2 px-3 mb-2">No items available</div>
                      ) : (
                        <>
                          <div className="row row-cols-2 row-cols-md-3 g-2">
                            {itemsData.items.map((item) => (
                              <div className="col" key={item._id}>
                                <div
                                  className={`card h-100 ${auctionData.items.includes(item._id) ? "border-success" : ""}`}
                                  style={{ cursor: "pointer" }}
                                  onClick={() => handleItemSelect(item)}
                                >
                                  <div className="card-img-top overflow-hidden" style={{ height: "100px" }}>
                                    <img
                                      src={
                                        item.images?.find((img) => img.is_primary)?.image_url ||
                                        item.images?.[0]?.image_url ||
                                        "https://via.placeholder.com/150x100?text=No+Image"
                                      }
                                      className="w-100 h-100 object-fit-cover"
                                      alt={item.name}
                                    />
                                  </div>
                                  <div className="card-body p-2">
                                    <h6 className="card-title mb-0 fs-6 text-truncate">{item.name}</h6>
                                  </div>
                                  <div className="card-footer p-1 bg-transparent">
                                    <button
                                      className={`btn btn-sm w-100 ${
                                        auctionData.items.includes(item._id) ? "btn-success" : "btn-outline-primary"
                                      }`}
                                    >
                                      {auctionData.items.includes(item._id) ? "✓" : "Select"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {itemsData.totalPages > 1 && (
                            <nav aria-label="Items pagination" className="mt-3">
                              <ul className="pagination pagination-sm justify-content-center">
                                <li className={`page-item ${itemsData.currentPage === 1 ? "disabled" : ""}`}>
                                  <button
                                    className="page-link"
                                    onClick={() => handlePageChange(itemsData.currentPage - 1)}
                                  >
                                    Previous
                                  </button>
                                </li>
                                {[...Array(itemsData.totalPages).keys()].map((page) => (
                                  <li
                                    key={page + 1}
                                    className={`page-item ${itemsData.currentPage === page + 1 ? "active" : ""}`}
                                  >
                                    <button className="page-link" onClick={() => handlePageChange(page + 1)}>
                                      {page + 1}
                                    </button>
                                  </li>
                                ))}
                                <li
                                  className={`page-item ${
                                    itemsData.currentPage === itemsData.totalPages ? "disabled" : ""
                                  }`}
                                >
                                  <button
                                    className="page-link"
                                    onClick={() => handlePageChange(itemsData.currentPage + 1)}
                                  >
                                    Next
                                  </button>
                                </li>
                              </ul>
                            </nav>
                          )}
                        </>
                      )}
                    </div>

                    <div className="col-md-4">
                      <div className="card">
                        <div className="card-header p-2 bg-light">
                          <h6 className="m-0 fs-6">Auction Details</h6>
                        </div>
                        <div className="card-body p-2">
                          <div className="mb-2">
                            <label className="form-label mb-0 fs-6" htmlFor="auction_title">
                              Title*
                            </label>
                            <input
                              type="text"
                              id="auction_title"
                              name="auction_title"
                              value={auctionData.auction_title}
                              onChange={handleInputChange}
                              className="form-control form-control-sm"
                              required
                              aria-describedby="auction_title_help"
                            />
                            <div id="auction_title_help" className="form-text">
                              Enter a concise title for the auction.
                            </div>
                          </div>

                          <div className="mb-2">
                            <label className="form-label mb-0 fs-6" htmlFor="auction_description">
                              Description
                            </label>
                            <textarea
                              id="auction_description"
                              name="auction_description"
                              value={auctionData.auction_description}
                              onChange={handleInputChange}
                              className="form-control form-control-sm"
                              rows="2"
                              aria-describedby="auction_description_help"
                            />
                            <div id="auction_description_help" className="form-text">
                              Provide details about the auction (optional).
                            </div>
                          </div>

                          <div className="mb-2">
                            <label className="form-label mb-0 fs-6" htmlFor="startDate">
                              Start Date*
                            </label>
                            <input
                              type="date"
                              id="startDate"
                              name="startDate"
                              value={auctionData.startDate || currentDate}
                              min={currentDate}
                              onChange={handleInputChange}
                              className="form-control form-control-sm"
                              required
                            />
                          </div>

                          <div className="mb-2">
                            <label className="form-label mb-0 fs-6" htmlFor="startTime">
                              Start Time*
                            </label>
                            <input
                              type="time"
                              id="startTime"
                              name="startTime"
                              value={auctionData.startTime || currentTime}
                              min={auctionData.startDate === currentDate ? currentTime : "00:00"}
                              onChange={handleInputChange}
                              className="form-control form-control-sm"
                              required
                            />
                          </div>

                          <div className="mb-2">
                            <label className="form-label mb-0 fs-6" htmlFor="timePeriod">
                              Duration (min)*
                            </label>
                            <input
                              type="number"
                              id="timePeriod"
                              name="timePeriod"
                              value={auctionData.timePeriod}
                              onChange={handleInputChange}
                              className="form-control form-control-sm"
                              min="1"
                              required
                              aria-describedby="timePeriod_help"
                            />
                            <div id="timePeriod_help" className="form-text">
                              Duration of the auction in minutes.
                            </div>
                          </div>

                          <div className="form-check mb-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="agreementCheck"
                              checked={auctionData.agreement}
                              onChange={(e) => setAuctionData({ ...auctionData, agreement: e.target.checked })}
                              required
                            />
                            <label className="form-check-label small" htmlFor="agreementCheck">
                              I agree to the auction terms and conditions
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer p-2">
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={resetModal}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              {selectedAuctionType && auctionData.items.length > 0 && (
                <button
                  className="btn btn-sm btn-success"
                  onClick={submitAuction}
                  disabled={isSubmitting || !auctionData.agreement}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Creating
                    </>
                  ) : (
                    "Create Auction"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuctionModal;