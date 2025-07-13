import React, { useState, useEffect, useCallback } from "react";
import { Modal, Button, Form, Alert, Spinner, Card, Badge, OverlayTrigger, Tooltip } from "react-bootstrap";
import getAllAuctionTypes from "../services/auctioTypeService";
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
    auction_title: "",
    auction_description: "",
    startDate: "",
    startTime: "",
    timePeriod: "",
    agreement: false,
    items: [],
    sequence: [],
    banner_image: null,
    is_invite_only: false,
  });
  const [bannerPreview, setBannerPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState(null);
  const itemsPerPage = 10;

  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];
  const currentTime = now
    .toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })
    .slice(0, 5);

  useEffect(() => {
    setAuctionData((prev) => ({
      ...prev,
      startDate: currentDate,
      startTime: currentTime,
    }));
  }, []);

  useEffect(() => {
    if (showModal) {
      getAllAuctionTypes()
        .then((types) => {
          setAuctionTypes(types);
          setError(null);
        })
        .catch((err) => setError(err.message));
    }
  }, [showModal]);

  useEffect(() => {
    if (selectedAuctionType) {
      fetchItems(1);
    }
  }, [selectedAuctionType]);

  const fetchItems = useCallback(async (page = 1) => {
    setLoadingItems(true);
    setError(null);
    try {
      const data = await getMyAvailableItems({ page, limit: itemsPerPage });
      setItemsData(data);
    } catch (err) {
      setError(err.message || "Failed to fetch items");
    } finally {
      setLoadingItems(false);
    }
  }, []);

  const handleItemSelect = useCallback((item) => {
    setAuctionData((prev) => {
      const typeName = selectedAuctionType.type_name;
      if (typeName === "live") {
        const isSelected = prev.items.includes(item._id);
        const updatedItems = isSelected
          ? prev.items.filter((id) => id !== item._id)
          : [...prev.items, item._id];
        const updatedSequence = isSelected
          ? prev.sequence.filter((_, i) => prev.items[i] !== item._id)
          : [...prev.sequence, prev.items.length + 1];
        return { ...prev, items: updatedItems, sequence: updatedSequence };
      } else {
        return { ...prev, items: prev.items.includes(item._id) ? [] : [item._id], sequence: [] };
      }
    });
    setError(null);
  }, [selectedAuctionType]);

  const handleSequenceChange = useCallback((itemId, direction) => {
    setAuctionData((prev) => {
      const index = prev.items.indexOf(itemId);
      if (index === -1) return prev;
      const newSequence = [...prev.sequence];
      const newItems = [...prev.items];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex >= 0 && targetIndex < newItems.length) {
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        newSequence[index] = index + 1;
        newSequence[targetIndex] = targetIndex + 1;
      }

      return { ...prev, items: newItems, sequence: newSequence };
    });
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setAuctionData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError(null);
  }, []);

  const handleBannerChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Banner image must be less than 5MB");
        return;
      }
      setAuctionData((prev) => ({ ...prev, banner_image: file }));
      setBannerPreview(URL.createObjectURL(file));
    }
  }, []);

  const validateForm = useCallback(() => {
    if (!auctionData.auction_title.trim()) return "Auction title is required";
    if (auctionData.auction_title.length > 100) return "Auction title must be 100 characters or less";
    if (auctionData.auction_description.length > 500) return "Description must be 500 characters or less";
    if (!auctionData.startDate) return "Start date is required";
    if (!auctionData.startTime) return "Start time is required";
    const startDateTime = new Date(`${auctionData.startDate}T${auctionData.startTime}`);
    if (startDateTime < now) return "Start time must be in the future";
    if (!auctionData.timePeriod || auctionData.timePeriod <= 0) return "Duration must be a positive number";
    if (auctionData.timePeriod > 1440) return "Duration cannot exceed 24 hours";
    if (!auctionData.agreement) return "You must agree to the terms and conditions";
    if (auctionData.items.length === 0) return "At least one item is required";
    if (selectedAuctionType.type_name === "live" && auctionData.items.length < 3) {
      return "Live auctions require at least three items";
    }
    if (
      (selectedAuctionType.type_name === "single_timed_item" || selectedAuctionType.type_name === "sealed_bid") &&
      auctionData.items.length > 1
    ) {
      return "Timed and sealed bid auctions can only have one item";
    }
    return null;
  }, [auctionData, selectedAuctionType]);

  const submitAuction = useCallback(async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const {
      startDate,
      startTime,
      timePeriod,
      items,
      auction_title,
      auction_description,
      banner_image,
      is_invite_only,
    } = auctionData;

    const auction_start_time = new Date(`${startDate}T${startTime}`).toISOString();
    const auction_end_time = new Date(
      new Date(`${startDate}T${startTime}`).getTime() + timePeriod * 60000
    ).toISOString();

    const payload = {
      auctionType_id: selectedAuctionType._id,
      auction_title: auction_title.trim(),
      auction_description: auction_description.trim(),
      auction_start_time,
      auction_end_time,
      is_invite_only,
      banner_image,
      settings:
        selectedAuctionType.type_name === "live"
          ? { item_ids: items }
          : { item_id: items[0] },
    };

    try {
      const created = await createAuction(payload);
      console.log('submitAuction: Created auction:', created);
      onAuctionCreate(created);
      setShowModal(false);
    } catch (err) {
      console.error('submitAuction: Error:', err);
      setError(err.message || "Failed to create auction");
    } finally {
      setIsSubmitting(false);
    }
  }, [auctionData, selectedAuctionType, onAuctionCreate]);

  const resetModal = useCallback(() => {
    setShowModal(false);
    setSelectedAuctionType(null);
    setItemsData({ items: [], totalItems: 0, currentPage: 1, totalPages: 1 });
    setAuctionData({
      auction_title: "",
      auction_description: "",
      startDate: currentDate,
      startTime: currentTime,
      timePeriod: "",
      agreement: false,
      items: [],
      sequence: [],
      banner_image: null,
      is_invite_only: false,
    });
    setBannerPreview(null);
    setError(null);
  }, [currentDate, currentTime]);

  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= itemsData.totalPages) {
      fetchItems(newPage);
    }
  }, [itemsData.totalPages, fetchItems]);

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
        <i className="bi bi-plus me-1"></i>Create Auction
      </Button>

      <Modal
        show={showModal}
        onHide={resetModal}
        size="lg"
        aria-labelledby="auctionModalLabel"
        centered
        backdrop="static"
        keyboard={!isSubmitting}
      >
        <Modal.Header closeButton className="bg-primary text-white py-2">
          <Modal.Title id="auctionModalLabel" className="fs-6">
            <i className="bi bi-hammer me-1"></i>Create Auction
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-3">
          {error && (
            <Alert
              variant="danger"
              className="py-2 px-3 mb-3"
              dismissible
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {!selectedAuctionType ? (
            <div className="text-center py-3">
              <h6 className="mb-3">Select Auction Type</h6>
              {auctionTypes.length === 0 ? (
                <Alert variant="info" className="py-2 px-3">
                  No auction types available
                </Alert>
              ) : (
                <div className="d-flex flex-wrap justify-content-center gap-2">
                  {auctionTypes.map((type) => (
                    <Button
                      key={type._id}
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setSelectedAuctionType(type)}
                      className="text-capitalize"
                    >
                      {type.type_name === "live" && <i className="bi bi-lightning me-1"></i>}
                      {type.type_name === "single_timed_item" && <i className="bi bi-clock me-1"></i>}
                      {type.type_name === "sealed_bid" && <i className="bi bi-lock me-1"></i>}
                      {type.type_name === "live" ? "Live" : type.type_name === "single_timed_item" ? "Timed" : "Sealed Bid"}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Form onSubmit={(e) => { e.preventDefault(); submitAuction(); }}>
              <div className="row g-3">
                <div className="col-md-8">
                  <div className="d-flex align-items-center mb-2">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="me-2"
                      onClick={() => setSelectedAuctionType(null)}
                      aria-label="Back to auction type selection"
                    >
                      <i className="bi bi-arrow-left"></i>
                    </Button>
                    <h6 className="m-0 text-capitalize">
                      {selectedAuctionType.type_name === "live"
                        ? "Live"
                        : selectedAuctionType.type_name === "single_timed_item"
                        ? "Timed"
                        : "Sealed Bid"} Auction
                    </h6>
                  </div>

                  <Card className="shadow-sm">
                    <Card.Body className="p-3">
                      <h6 className="mb-2 fs-6">
                        Select Items
                        {selectedAuctionType.type_name === "live" && (
                          <OverlayTrigger
                            placement="top"
                            overlay={
                              <Tooltip id="items-tooltip">
                                Select at least 3 items for live auctions
                              </Tooltip>
                            }
                          >
                            <i className="bi bi-info-circle ms-1"></i>
                          </OverlayTrigger>
                        )}
                      </h6>
                      {loadingItems ? (
                        <div className="text-center py-3">
                          <Spinner animation="border" variant="primary" />
                        </div>
                      ) : itemsData.items.length === 0 ? (
                        <Alert variant="info" className="py-2 px-3">
                          No available items. Please add items first.
                        </Alert>
                      ) : (
                        <>
                          <div className="row row-cols-2 row-cols-md-3 g-2">
                            {itemsData.items.map((item) => (
                              <div className="col" key={item._id}>
                                <Card
                                  className={`h-100 ${
                                    auctionData.items.includes(item._id) ? "border-success" : ""
                                  }`}
                                  style={{ cursor: "pointer" }}
                                  onClick={() => handleItemSelect(item)}
                                  role="button"
                                  aria-pressed={auctionData.items.includes(item._id)}
                                >
                                  <Card.Img
                                    variant="top"
                                    src={
                                      item.images?.find((img) => img.is_primary)?.image_url ||
                                      item.images?.[0]?.image_url ||
                                      "https://via.placeholder.com/150x100?text=No+Image"
                                    }
                                    style={{ height: "100px", objectFit: "cover" }}
                                    alt={item.name}
                                  />
                                  <Card.Body className="p-2">
                                    <Card.Title className="fs-6 mb-0 text-truncate">
                                      {item.name}
                                    </Card.Title>
                                  </Card.Body>
                                  <Card.Footer className="p-1 bg-transparent">
                                    <Button
                                      variant={
                                        auctionData.items.includes(item._id)
                                          ? "success"
                                          : "outline-primary"
                                      }
                                      size="sm"
                                      className="w-100"
                                    >
                                      {auctionData.items.includes(item._id) ? "✓ Selected" : "Select"}
                                    </Button>
                                  </Card.Footer>
                                </Card>
                              </div>
                            ))}
                          </div>
                          {itemsData.totalPages > 1 && (
                            <nav aria-label="Items pagination" className="mt-3">
                              <ul className="pagination pagination-sm justify-content-center mb-0">
                                <li className={`page-item ${itemsData.currentPage === 1 ? "disabled" : ""}`}>
                                  <Button
                                    variant="link"
                                    className="page-link"
                                    onClick={() => handlePageChange(itemsData.currentPage - 1)}
                                    disabled={itemsData.currentPage === 1}
                                    aria-label="Previous page"
                                  >
                                    Previous
                                  </Button>
                                </li>
                                {[...Array(itemsData.totalPages).keys()].map((page) => (
                                  <li
                                    key={page + 1}
                                    className={`page-item ${itemsData.currentPage === page + 1 ? "active" : ""}`}
                                  >
                                    <Button
                                      variant="link"
                                      className="page-link"
                                      onClick={() => handlePageChange(page + 1)}
                                    >
                                      {page + 1}
                                    </Button>
                                  </li>
                                ))}
                                <li
                                  className={`page-item ${
                                    itemsData.currentPage === itemsData.totalPages ? "disabled" : ""
                                  }`}
                                >
                                  <Button
                                    variant="link"
                                    className="page-link"
                                    onClick={() => handlePageChange(itemsData.currentPage + 1)}
                                    disabled={itemsData.currentPage === itemsData.totalPages}
                                    aria-label="Next page"
                                  >
                                    Next
                                  </Button>
                                </li>
                              </ul>
                            </nav>
                          )}
                        </>
                      )}
                    </Card.Body>
                  </Card>

                  {selectedAuctionType.type_name === "live" && auctionData.items.length > 0 && (
                    <Card className="shadow-sm mt-3">
                      <Card.Body className="p-3">
                        <h6 className="mb-2 fs-6">Item Sequence</h6>
                        <ul className="list-group list-group-flush">
                          {auctionData.items.map((itemId, index) => {
                            const item = itemsData.items.find((i) => i._id === itemId);
                            return (
                              <li
                                key={itemId}
                                className="list-group-item d-flex align-items-center p-2"
                              >
                                <Badge bg="secondary" className="me-2">
                                  {index + 1}
                                </Badge>
                                <span className="flex-grow-1 text-truncate">
                                  {item?.name || "Unknown Item"}
                                </span>
                                <div>
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="me-1"
                                    onClick={() => handleSequenceChange(itemId, "up")}
                                    disabled={index === 0}
                                    aria-label={`Move ${item?.name} up`}
                                  >
                                    <i className="bi bi-arrow-up"></i>
                                  </Button>
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleSequenceChange(itemId, "down")}
                                    disabled={index === auctionData.items.length - 1}
                                    aria-label={`Move ${item?.name} down`}
                                  >
                                    <i className="bi bi-arrow-down"></i>
                                  </Button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </Card.Body>
                    </Card>
                  )}
                </div>

                <div className="col-md-4">
                  <Card className="shadow-sm">
                    <Card.Header className="p-2 bg-light">
                      <h6 className="m-0 fs-6">Auction Details</h6>
                    </Card.Header>
                    <Card.Body className="p-3">
                      <Form.Group className="mb-2" controlId="auction_title">
                        <Form.Label className="mb-0 fs-6">Title*</Form.Label>
                        <Form.Control
                          type="text"
                          name="auction_title"
                          value={auctionData.auction_title}
                          onChange={handleInputChange}
                          size="sm"
                          required
                          maxLength={100}
                          placeholder="Enter auction title"
                          aria-describedby="auction_title_help"
                        />
                        <Form.Text id="auction_title_help" muted>
                          Max 100 characters
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-2" controlId="auction_description">
                        <Form.Label className="mb-0 fs-6">Description</Form.Label>
                        <Form.Control
                          as="textarea"
                          name="auction_description"
                          value={auctionData.auction_description}
                          onChange={handleInputChange}
                          size="sm"
                          rows={3}
                          maxLength={500}
                          placeholder="Describe your auction"
                          aria-describedby="auction_description_help"
                        />
                        <Form.Text id="auction_description_help" muted>
                          Max 500 characters
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-2" controlId="banner_image">
                        <Form.Label className="mb-0 fs-6">Banner Image</Form.Label>
                        <Form.Control
                          type="file"
                          name="banner_image"
                          size="sm"
                          accept="image/*"
                          onChange={handleBannerChange}
                          aria-describedby="banner_image_help"
                        />
                        <Form.Text id="banner_image_help" muted>
                          Optional, max 5MB
                        </Form.Text>
                        {bannerPreview && (
                          <img
                            src={bannerPreview}
                            alt="Banner Preview"
                            className="img-fluid rounded mt-2"
                            style={{ maxHeight: "100px" }}
                          />
                        )}
                      </Form.Group>

                      <Form.Group className="mb-2" controlId="startDate">
                        <Form.Label className="mb-0 fs-6">Start Date*</Form.Label>
                        <Form.Control
                          type="date"
                          name="startDate"
                          value={auctionData.startDate}
                          min={currentDate}
                          onChange={handleInputChange}
                          size="sm"
                          required
                        />
                      </Form.Group>

                      <Form.Group className="mb-2" controlId="startTime">
                        <Form.Label className="mb-0 fs-6">Start Time*</Form.Label>
                        <Form.Control
                          type="time"
                          name="startTime"
                          value={auctionData.startTime}
                          min={auctionData.startDate === currentDate ? currentTime : "00:00"}
                          onChange={handleInputChange}
                          size="sm"
                          required
                        />
                      </Form.Group>

                      <Form.Group className="mb-2" controlId="timePeriod">
                        <Form.Label className="mb-0 fs-6">Duration (min)*</Form.Label>
                        <Form.Control
                          type="number"
                          name="timePeriod"
                          value={auctionData.timePeriod}
                          onChange={handleInputChange}
                          size="sm"
                          min="1"
                          max="1440"
                          required
                          placeholder="e.g., 60"
                          aria-describedby="timePeriod_help"
                        />
                        <Form.Text id="timePeriod_help" muted>
                          Max 24 hours (1440 minutes)
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-2" controlId="is_invite_only">
                        <Form.Check
                          type="checkbox"
                          label="Invite-only auction"
                          name="is_invite_only"
                          checked={auctionData.is_invite_only}
                          onChange={handleInputChange}
                          id="is_invite_only"
                        />
                      </Form.Group>

                      <Form.Group
                        className={`mb-2 ${error === "You must agree to the terms and conditions" ? "text-danger" : ""}`}
                        controlId="agreementCheck"
                      >
                        <Form.Check
                          type="checkbox"
                          label="I agree to the auction terms and conditions"
                          name="agreement"
                          checked={auctionData.agreement}
                          onChange={handleInputChange}
                          required
                          id="agreementCheck"
                          aria-describedby="agreement_help"
                        />
                        {error === "You must agree to the terms and conditions" && (
                          <Form.Text id="agreement_help" className="text-danger">
                            Please check this box to proceed
                          </Form.Text>
                        )}
                      </Form.Group>
                    </Card.Body>
                  </Card>
                </div>
              </div>
            </Form>
          )}
        </Modal.Body>

        <Modal.Footer className="p-2">
          <Button
            variant="outline-danger"
            size="sm"
            onClick={resetModal}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {selectedAuctionType && auctionData.items.length > 0 && (
            <OverlayTrigger
              placement="top"
              overlay={
                !auctionData.agreement ? (
                  <Tooltip id="create-auction-tooltip">
                    Please agree to the terms and conditions
                  </Tooltip>
                ) : auctionData.items.length < 3 && selectedAuctionType.type_name === "live" ? (
                  <Tooltip id="create-auction-tooltip">
                    Please select at least 3 items for live auctions
                  </Tooltip>
                ) : (
                  <Tooltip id="create-auction-tooltip">Create the auction</Tooltip>
                )
              }
            >
              <span>
                <Button
                  variant="success"
                  size="sm"
                  onClick={submitAuction}
                  disabled={
                    isSubmitting ||
                    !auctionData.agreement ||
                    (selectedAuctionType.type_name === "live" && auctionData.items.length < 3)
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Spinner
                        animation="border"
                        size="sm"
                        className="me-1"
                        aria-hidden="true"
                      />
                      Creating
                    </>
                  ) : (
                    "Create Auction"
                  )}
                </Button>
              </span>
            </OverlayTrigger>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AuctionModal;