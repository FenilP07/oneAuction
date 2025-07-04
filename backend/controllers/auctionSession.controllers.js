import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponse.js";
import Auction from "../models/auction.models.js";
import AuctionSession from "../models/auctionSession.models.js";
import AuctionParticipant from "../models/auctionParticipants.models.js";
import AuctionType from "../models/auctionTypes.models.js";
import mongoose from "mongoose";

const createAuctionSession = asyncHandler(async (req, res) => {
  const { auction_id, start_time, end_time } = req.body;

  if (!auction_id || !start_time || !end_time) {
    throw new apiError(400, "MISSING_FIELDS", "auction_id, start_time, and end_time are required");
  }

  // Debug logging
  console.log("req.user:", req.user);
  console.log("auction_id:", auction_id);

  // Check if req.user exists
  if (!req.user || !req.user._id) {
    throw new apiError(401, "UNAUTHORIZED", "User not authenticated");
  }

  // First get the live auction type ID
  const liveAuctionType = await AuctionType.findOne({ type_name: "live" });
  console.log("liveAuctionType:", liveAuctionType);
  
  if (!liveAuctionType) {
    throw new apiError(400, "AUCTION_TYPE_NOT_FOUND", "Live auction type not found");
  }

  const auction = await Auction.findOne({
    _id: auction_id,
    auctioneer_id: req.user._id,
    auctionType_id: liveAuctionType._id,
  });

  console.log("auction found:", auction);

  if (!auction) {
    throw new apiError(404, "INVALID_AUCTION", "Auction not found, not a live auction, or you don't have permission");
  }

  const sessionStartTime = new Date(start_time);
  const sessionEndTime = new Date(end_time);

  if (isNaN(sessionStartTime) || isNaN(sessionEndTime)) {
    throw new apiError(400, "INVALID_DATE_FORMAT", "Invalid date format");
  }

  if (sessionStartTime >= sessionEndTime) {
    throw new apiError(400, "INVALID_DATES", "Start time must be before end time");
  }

  if (sessionStartTime < auction.auction_start_time || sessionEndTime > auction.auction_end_time) {
    throw new apiError(400, "INVALID_SESSION_DATES", "Session dates must be within auction dates");
  }

  const session = new AuctionSession({
    auction_id,
    start_time: sessionStartTime,
    end_time: sessionEndTime,
    status: "pending",
  });

  await session.save();

  res.status(201).json(new APIResponse(201, { session }, "Session created successfully"));
});

const startAuctionSession = asyncHandler(async (req, res) => {
  const { session_id } = req.params;

  const session = await AuctionSession.findOne({
    _id: session_id,
    status: "pending",
  });

  if (!session) {
    throw new apiError(404, "INVALID_SESSION", "Session not found or already started");
  }

  // First get the live auction type ID
  const liveAuctionType = await AuctionType.findOne({ type_name: "live" });
  if (!liveAuctionType) {
    throw new apiError(400, "AUCTION_TYPE_NOT_FOUND", "Live auction type not found");
  }

  const auction = await Auction.findOne({
    _id: session.auction_id,
    auctioneer_id: req.user._id,
    auctionType_id: liveAuctionType._id,
  });

  if (!auction) {
    throw new apiError(403, "FORBIDDEN", "You don't have permission to start this session");
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();
  try {
    session.status = "active";
    session.actual_start_time = new Date();
    await session.save({ session: dbSession });

    if (auction.auction_status === "upcoming") {
      auction.auction_status = "active";
      await auction.save({ session: dbSession });
    }

    await dbSession.commitTransaction();
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }

  res.status(200).json(new APIResponse(200, { session }, "Auction session started successfully"));
});

const joinAuctionSession = asyncHandler(async (req, res) => {
  const { session_id } = req.params;
  const { session_code } = req.body;

  if (!session_code) {
    throw new apiError(400, "MISSING_SESSION_CODE", "Session code is required");
  }

  const session = await AuctionSession.findOne({
    _id: session_id,
    session_code: { $regex: `^${session_code}$`, $options: "i" },
    status: { $in: ["pending", "active"] },
  });

  if (!session) {
    throw new apiError(404, "INVALID_SESSION_CODE", "Session not found or invalid session code");
  }

  const existingParticipant = await AuctionParticipant.findOne({
    auctionId: session.auction_id,
    User_id: req.user._id,
  });

  if (existingParticipant) {
    throw new apiError(400, "ALREADY_JOINED", "User already joined this auction session");
  }

  const participant = new AuctionParticipant({
    auctionId: session.auction_id,
    session_id,
    User_id: req.user._id,
    joined_at: new Date(),
    status: "active",
    last_activity: new Date(),
  });

  await participant.save();
  res.status(200).json(new APIResponse(200, { participant }, "Joined auction session successfully"));
});

const getAuctionSession = asyncHandler(async (req, res) => {
  const { session_id } = req.params;

  const session = await AuctionSession.findById(session_id).populate(
    "auction_id",
    "auction_title auction_description"
  );

  if (!session) {
    throw new apiError(404, "SESSION_NOT_FOUND", "Session not found");
  }

  res.status(200).json(new APIResponse(200, { session }, "Session details retrieved successfully"));
});

const getSessionParticipants = asyncHandler(async (req, res) => {
  const { session_id } = req.params;

  const session = await AuctionSession.findById(session_id);
  if (!session) {
    throw new apiError(404, "SESSION_NOT_FOUND", "Session not found");
  }

  const auction = await Auction.findOne({
    _id: session.auction_id,
    auctioneer_id: req.user._id,
  });

  if (!auction) {
    throw new apiError(403, "FORBIDDEN", "You don't have permission to view participants");
  }

  const participants = await AuctionParticipant.find({
    session_id: session._id,
  }).populate("User_id", "username email");

  res.status(200).json(
    new APIResponse(
      200,
      { participants, count: participants.length },
      "Session participants retrieved successfully"
    )
  );
});

const endAuctionSession = asyncHandler(async (req, res) => {
  const { session_id } = req.params;

  const session = await AuctionSession.findOne({
    _id: session_id,
    status: "active",
  });

  if (!session) {
    throw new apiError(404, "INVALID_SESSION", "Active session not found");
  }

  const auction = await Auction.findOne({
    _id: session.auction_id,
    auctioneer_id: req.user._id,
  });

  if (!auction) {
    throw new apiError(403, "FORBIDDEN", "You don't have permission to end this session");
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();
  try {
    session.status = "completed";
    session.actual_end_time = new Date();
    await session.save({ session: dbSession });

    auction.auction_status = "completed";
    await auction.save({ session: dbSession });

    await AuctionParticipant.updateMany(
      { session_id: session._id, status: "active" },
      { status: "left", last_activity: new Date() },
      { session: dbSession }
    );

    await dbSession.commitTransaction();
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }

  res.status(200).json(new APIResponse(200, { session }, "Auction session ended successfully"));
});

export {
  createAuctionSession,
  startAuctionSession,
  joinAuctionSession,
  endAuctionSession,
  getAuctionSession,
  getSessionParticipants,
};