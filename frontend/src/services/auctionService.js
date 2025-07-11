import apiClient from "../utils/apiClient";
import { APIResponse } from "../../../backend/utils/apiResponse";

/**
 * Create a new auction
 * @param {Object} auctionData - Auction data including:
 *   - auctionType_id
 *   - auction_title
 *   - auction_description
 *   - auction_start_time
 *   - auction_end_time
 *   - settings (item_ids for live auctions or item_id for sealed/single)
 * @returns {Promise<Object>} Created auction
 */
const createAuction = async (auctionData) => {
  try {
    const response = await apiClient.post("/auction", auctionData);
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
    const response = await apiClient.patch(
      `/auction/session/${sessionId}/start`
    );
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
const getMyBids = async () => {};
const getMyAuctions = async () => {
  
};
export {
  createAuction,
  createAuctionSession,
  startAuctionSession,
  joinAuctionSession,
  endAuctionSession,
  getAuctionSession,
  getSessionParticipants,
  getMyBids,
  getMyAuctions,
  
};
