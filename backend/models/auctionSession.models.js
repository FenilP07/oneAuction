import mongoose, { Schema } from "mongoose";

const auctionSessionSchema = new Schema(
  {
    auction_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
      index: true,
    },
     session_code: {
      type: String,
      default: () => uuidv4().slice(0, 8).toUpperCase(),
      index: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "paused", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    start_time: {
      type: Date,
      required: true,
    },
    end_time: {
      type: Date,
      required: true,
    },
    actual_start_time: {
      type: Date,
    },
    actual_end_time: {
      type: Date,
    },
     participant_count: {
      type: Number,
      default: 0,
    },
    bidding_window: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

auctionSessionSchema.pre("save", async function (next) {
  try {
    const auction = await mongoose
      .model("Auction")
      .findById(this.auction_id)
      .populate("auctionType_id");
    if (!auction) throw new Error("Invalid auction");
    if (auction.auctionType_id.type_name !== "live") {
      throw new Error("Only live auctions can have sessions");
    }
    if (auction.auction_status === "completed" || auction.auction_status === "cancelled") {
      throw new Error("Cannot create sessions for completed or cancelled auctions");
    }

    if (this.start_time >= this.end_time) {
      throw new Error("Start time must be before end time");
    }

    if (this.end_time > auction.auction_end_time) {
      throw new Error("Session end time cannot exceed auction end time");
    }

    // Require session_code for invite-only auctions
    if (auction.is_invite_only && !this.session_code) {
      throw new Error("Invite-only auctions require a session code");
    }

    // Clear session_code for public auctions
    if (!auction.is_invite_only) {
      this.session_code = null;
    }

    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("AuctionSession", auctionSessionSchema);