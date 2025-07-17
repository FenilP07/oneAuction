// services/auctionService.js
import apiClient from "../utils/apiClient.js";

/**
 * Create a new auction
 */
const createAuction = async (auctionData) => {
  try {
    const formData = new FormData();
    formData.append("auctionType_id", auctionData.auctionType_id);
    formData.append("auction_title", auctionData.auction_title);
    formData.append(
      "auction_description",
      auctionData.auction_description || ""
    );
    formData.append("auction_start_time", auctionData.auction_start_time);
    formData.append("auction_end_time", auctionData.auction_end_time);
    formData.append("is_invite_only", String(auctionData.is_invite_only));

    if (auctionData.banner_image) {
      formData.append("banner_image", auctionData.banner_image);
    }

    formData.append("settings", JSON.stringify(auctionData.settings));

    console.log("createAuction: FormData entries:");
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value instanceof File ? value.name : value);
    }

    const response = await apiClient.post("/auction", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    console.log("createAuction: Response:", response.data);

    // ✅ Use proper conditional and throw if backend reports failure
    const { data, success, message } = response.data;

    if (!success) {
      throw new Error(message || "Auction creation failed");
    }

    return data ?? {}; // always return something structured
  } catch (error) {
    const errMsg =
      error.response?.data?.message ||
      error.message ||
      "Failed to create auction";

    console.error("Create auction error:", {
      message: errMsg,
      status: error.response?.status,
      backend: error.response?.data,
    });

    throw new Error(errMsg);
  }
};

/**
 * Get all auctions
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
 */

const getAuctionById = async (auction_id) => {
  try {
    // Validate auction_id before making request
    if (!auction_id) {
      throw new Error("Auction ID is required");
    }

    // Log the request for debugging
    console.log("Fetching auction details for ID:", auction_id);

    const response = await apiClient.get(`/auction/${auction_id}`);
    console.log("Auction details response:", response.data);

    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to fetch auction details.";
    console.error("Get auction details error:", message);
    console.error("Full error:", error);
    throw new Error(message);
  }
};

/**
 * Get auction summary
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
 */
const getAuctionPreview = async (auctionId) => {
  try {
    const response = await apiClient.get(`/auction/preview/${auctionId}`);
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
 */
const placeTimedBid = async (bidData) => {
  try {
    const response = await apiClient.post(`/auction/timed`, bidData);
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
 */
const getMyAuctions = async () => {
  try {
    const response = await apiClient.get("/auction/my-auctions");
    console.log("getMyAuctions response:", response.data);
    return response.data.data || response.data;
  } catch (error) {
    console.error("Get my auctions error:", {
      message: error.message,
      response: error.response,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw new Error(error.message || "Failed to fetch user auctions");
  }
};

export {
  createAuction,
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
