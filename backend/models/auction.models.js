import mongoose, { Schema } from "mongoose";
import AuctionTypes from "./auctionTypes.models.js";

const auctionSchema = new Schema(
  {
    auctioneer_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    auctionType_id: {
      type: Schema.Types.ObjectId,
      ref: "AuctionType", // Correct ref to match your AuctionType model
      required: true,
    },
    auction_title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    auction_status: {
      type: String,
      enum: ["upcoming", "active", "completed", "cancelled"],
      default: "upcoming",
      index: true,
    },
    auction_start_time: {
      type: Date,
      required: true,
      index: true,
    },
    auction_end_time: {
      type: Date,
      required: true,
    },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    auction_description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save validation middleware
auctionSchema.pre("save", async function (next) {
  // Use imported model directly and correct field name
  const auctionType = await AuctionTypes.findById(this.auctionType_id);
  if (!auctionType) {
    return next(new Error("Invalid auction type"));
  }

  const { type_name } = auctionType;

  if (type_name === "live") {
    if (
      !this.settings.item_ids ||
      !Array.isArray(this.settings.item_ids) ||
      this.settings.item_ids.length === 0
    ) {
      return next(new Error("item_ids required for live auctions"));
    }

    // Fixed: Use _id instead of item_id
    const itemsCount = await mongoose
      .model("Item")
      .countDocuments({ 
        _id: { $in: this.settings.item_ids },
        status: "available" // Also validate status
      });

    if (itemsCount !== this.settings.item_ids.length) {
      return next(new Error("Invalid item_ids"));
    }

    this.settings.current_item_id =
      this.settings.current_item_id || this.settings.item_ids[0];
  } else if (["sealed_bid", "single_timed_item"].includes(type_name)) {
    if (!this.settings.item_id) {
      return next(
        new Error("item_id required for sealed bid or single timed item auctions")
      );
    }

    // Fixed: Use _id instead of item_id
    const item = await mongoose
      .model("Item")
      .findOne({ 
        _id: this.settings.item_id,
        status: "available" // Also validate status
      });
    if (!item) {
      return next(new Error("Invalid item_id"));
    }
  }

  if (this.auction_start_time >= this.auction_end_time) {
    return next(new Error("Start time must be before end time"));
  }

  next();
});

const Auction = mongoose.model("Auction", auctionSchema);

export default Auction;