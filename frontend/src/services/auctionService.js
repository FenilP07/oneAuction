import apiClient from "../utils/apiClient";
import { APIResponse } from "../../../backend/utils/apiResponse"; // Adjust path as needed

/**
 * Create a new auction
 * @param {Object} auctionData - Auction data including:
 *   - auctionType_id
 *   - auction_title
 *   - auction_description
 *   - auction_start_time
 *   - auction_end_time
 *   - is_invite_only
 *   - settings (item_ids for live auctions or item_id for sealed/single)
 *   - banner_image (File object for image upload)
 * @returns {Promise<Object>} Created auction and session
 */
const createAuction = async (auctionData) => {
  try {
    const formData = new FormData();
    formData.append("auctionType_id", auctionData.auctionType_id);
    formData.append("auction_title", auctionData.auction_title);
    formData.append("auction_description", auctionData.auction_description);
    formData.append("auction_start_time", auctionData.auction_start_time);
    formData.append("auction_end_time", auctionData.auction_end_time);
    formData.append("is_invite_only", auctionData.is_invite_only);
    if (auctionData.banner_image) {
      formData.append("banner_image", auctionData.banner_image);
    }
    formData.append("settings", JSON.stringify(auctionData.settings));

    const response = await apiClient.post("/auction", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to create auction.";
    console.error("Create auction error:", message);
    throw new Error(message);
  }
};

/**
 * Create an auction session for a live auction
 * @param {Object} sessionData - Session data including:
 *   - auction_id
 *   - start_time
 *   - end_time
 * @returns {Promise<Object>} Created session
 */
const createAuctionSession = async (sessionData) => {
  try {
    const response = await apiClient.post("/auction/session", sessionData);
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to create auction session.";
    console.error("Create auction session error:", message);
    throw new Error(message);
  }
};

/**
 * Start an auction session
 * @param {string} sessionId
 * @returns {Promise<Object>} Started session
 */
const startAuctionSession = async (sessionId) => {
  try {
    const response = await apiClient.patch(`/auction/session/${sessionId}/start`);
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to start auction session.";
    console.error("Start auction session error:", message);
    throw new Error(message);
  }
};

/**
 * Join an auction session
 * @param {string} sessionId
 * @param {string} sessionCode
 * @returns {Promise<Object>} Participant data
 */
const joinAuctionSession = async (sessionId, sessionCode) => {
  try {
    const response = await apiClient.post(
      `/auction/session/${sessionId}/join`,
      { session_code: sessionCode }
    );
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to join auction session.";
    console.error("Join auction session error:", message);
    throw new Error(message);
  }
};

/**
 * End an auction session
 * @param {string} sessionId
 * @returns {Promise<Object>} Ended session
 */
const endAuctionSession = async (sessionId) => {
  try {
    const response = await apiClient.patch(`/auction/session/${sessionId}/end`);
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to end auction session.";
    console.error("End auction session error:", message);
    throw new Error(message);
  }
};

/**
 * Get auction session details
 * @param {string} sessionId
 * @returns {Promise<Object>} Session details
 */
const getAuctionSession = async (sessionId) => {
  try {
    const response = await apiClient.get(`/auction/session/${sessionId}`);
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to fetch auction session.";
    console.error("Get auction session error:", message);
    throw new Error(message);
  }
};

/**
 * Get session participants
 * @param {string} sessionId
 * @returns {Promise<Object>} Participants data
 */
const getSessionParticipants = async (sessionId) => {
  try {
    const response = await apiClient.get(
      `/auction/session/${sessionId}/participants`
    );
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to fetch session participants.";
    console.error("Get session participants error:", message);
    throw new Error(message);
  }
};

/**
 * Get all auctions
 * @param {Object} [queryParams] - Optional query parameters (e.g., filters)
 * @returns {Promise<Object>} List of auctions
 */
const getAllAuctions = async (queryParams = {}) => {
  try {
    const response = await apiClient.get("/auction", { params: queryParams });
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to fetch auctions.";
    console.error("Get all auctions error:", message);
    throw new Error(message);
  }
};

/**
 * Get auction details by ID
 * @param {string} auctionId
 * @returns {Promise<Object>} Auction details
 */
const getAuctionById = async (auctionId) => {
  try {
    const response = await apiClient.get(`/auction/${auctionId}`);
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to fetch auction details.";
    console.error("Get auction details error:", message);
    throw new Error(message);
  }
};

/**
 * Get auction summary
 * @param {string} auctionId
 * @returns {Promise<Object>} Auction summary
 */
const getAuctionSummary = async (auctionId) => {
  try {
    const response = await apiClient.get(`/auction/${auctionId}/summary`);
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to fetch auction summary.";
    console.error("Get auction summary error:", message);
    throw new Error(message);
  }
};

/**
 * Get auction preview
 * @param {string} auctionId
 * @returns {Promise<Object>} Auction preview
 */
const getAuctionPreview = async (auctionId) => {
  try {
    const response = await apiClient.get(`/auction/${auctionId}/preview`);
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to fetch auction preview.";
    console.error("Get auction preview error:", message);
    throw new Error(message);
  }
};

/**
 * Get auction leaderboard
 * @param {string} auctionId
 * @returns {Promise<Object>} Auction leaderboard
 */
const getAuctionLeaderboard = async (auctionId) => {
  try {
    const response = await apiClient.get(`/auction/${auctionId}/leaderboard`);
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to fetch auction leaderboard.";
    console.error("Get auction leaderboard error:", message);
    throw new Error(message);
  }
};

/**
 * Place a sealed bid
 * @param {Object} bidData - Bid data including:
 *   - auction_id
 *   - item_id
 *   - amount
 *   - invite_code (if applicable)
 * @returns {Promise<Object>} Placed bid
 */
const placeSealedBid = async (bidData) => {
  try {
    const response = await apiClient.post(`/auction/sealed-bid`, bidData);
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to place sealed bid.";
    console.error("Place sealed bid error:", message);
    throw new Error(message);
  }
};

/**
 * Reveal sealed bids
 * @param {string} auctionId
 * @returns {Promise<Object>} Revealed bids
 */
const revealSealedBids = async (auctionId) => {
  try {
    const response = await apiClient.post(`/auction/${auctionId}/reveal-bids`);
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to reveal sealed bids.";
    console.error("Reveal sealed bids error:", message);
    throw new Error(message);
  }
};

/**
 * Place a timed bid
 * @param {Object} bidData - Bid data including:
 *   - auction_id
 *   - item_id
 *   - amount
 *   - invite_code (if applicable)
 * @returns {Promise<Object>} Placed bid
 */
const placeTimedBid = async (bidData) => {
  try {
    const response = await apiClient.post(`/auction/timed-bid`, bidData);
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to place timed bid.";
    console.error("Place timed bid error:", message);
    throw new Error(message);
  }
};

/**
 * Get the current user's bids
 * @param {Object} [queryParams] - Optional query parameters (e.g., auction_id)
 * @returns {Promise<Object>} List of user's bids
 */
const getMyBids = async (queryParams = {}) => {
  try {
    const response = await apiClient.get("/auction/my-bids", {
      params: queryParams,
    });
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to fetch user bids.";
    console.error("Get my bids error:", message);
    throw new Error(message);
  }
};

/**
 * Get the current user's auctions
 * @param {Object} [queryParams] - Optional query parameters (e.g., status)
 * @returns {Promise<Object>} List of user's auctions
 */
const getMyAuctions = async (queryParams = {}) => {
  try {
    const response = await apiClient.get("/auction/my-auctions", {
      params: queryParams,
    });
    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to fetch user auctions.";
    console.error("Get my auctions error:", message);
    throw new Error(message);
  }
};

export {
  createAuction,
  createAuctionSession,
  startAuctionSession,
  joinAuctionSession,
  endAuctionSession,
  getAuctionSession,
  getSessionParticipants,
  getAllAuctions,
  getAuctionById,
  getAuctionSummary,
  getAuctionPreview,
  getAuctionLeaderboard,
  placeSealedBid,
  revealSealedBids,
  placeTimedBid,
  getMyBids,
  getMyAuctions,
};