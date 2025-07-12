import mongoose from "mongoose";
import AuctionType from "./auctionTypes.models.js";

const auctionSchema = new mongoose.Schema(
  {
    auctioneer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    auction_description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
      validate: {
        validator: (v) => !v || v.length > 0,
        message: "Description cannot be empty if provided",
      },
    },
    auctionType_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuctionType",
      required: true,
      index: true,
    },
    auction_title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      validate: {
        validator: (v) => v.length > 0,
        message: "Title cannot be empty",
      },
    },
    auction_status: {
      type: String,
      enum: ["upcoming", "active","paused", "completed", "cancelled"],
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
    banner_image: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: (v) =>
          !v || /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(v),
        message: "Banner image must be a valid URL ending in .jpg, .jpeg, .png, or .webp",
      },
    },
    is_invite_only: {
      type: Boolean,
      default: false, 
      index: true, 
    },
     invite_code: {
      type: String,
      default: () => uuidv4().slice(0, 8).toUpperCase(),
      index: true,
      sparse: true,
    },
    settings: {
      item_ids: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "Item",
        index: true,
      },
      current_item_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        index: true,
      },
      min_bid_increment: {
        type: Number,
        default: 1,
        validate: {
          validator: (v) => v > 0,
          message: "Minimum bid increment must be positive",
        },
      },
       reserve_price: {
        type: Number,
        default: 0,
        min: 0,
      },
       bid_count: {
        type: Number,
        default: 0,
      },
      unique_bidders: {
        type: Number,
        default: 0,
      },
      // sealed_bid_deadline: {
      //   type: Date,
      //   default: null,
      // },
      // auto_extend_duration: {
      //   type: Number,
      //   default: 0,
      // },
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for overlapping auction checks
auctionSchema.index(
  { auctioneer_id: 1, auction_start_time: 1, auction_end_time: 1, deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } }
);

// Pre-save validation
auctionSchema.pre("save", async function (next) {
  const auctionType = await AuctionType.findById(this.auctionType_id);
  if (!auctionType) throw new Error("Invalid auction type");

  // Time validation
  if (this.auction_start_time >= this.auction_end_time) {
    throw new Error("End time must be after start time");
  }

  // Check for overlapping auctions
  const overlappingAuctions = await mongoose.model("Auction").countDocuments({
    auctioneer_id: this.auctioneer_id,
    deletedAt: null,
    $or: [
      {
        auction_start_time: { $lte: this.auction_end_time },
        auction_end_time: { $gte: this.auction_start_time },
      },
    ],
    _id: { $ne: this._id },
  });
  if (overlappingAuctions > 0) {
    throw new Error("Auctioneer has conflicting auction times");
  }

  // Type-specific validations
  if (auctionType.type_name === "live") {
    if (!this.settings.item_ids?.length) {
      throw new Error("Live auctions require at least one item");
    }
    const itemsCount = await mongoose.model("Item").countDocuments({
      _id: { $in: this.settings.item_ids },
      status: "available",
    });
    if (itemsCount !== this.settings.item_ids.length) {
      throw new Error("One or more items are unavailable");
    }
    if (!this.settings.current_item_id) {
      this.settings.current_item_id = this.settings.item_ids[0];
    }
  } else if (auctionType.type_name === "sealed_bid") {
    if (!this.settings.sealed_bid_deadline) {
      this.settings.sealed_bid_deadline = this.auction_end_time;
    }
    if (this.settings.item_ids?.length !== 1) {
      throw new Error("Sealed bid auctions require exactly one item");
    }
  } else if (auctionType.type_name === "single_timed_item") {
    if (this.settings.item_ids?.length !== 1) {
      throw new Error("Single timed item auctions require exactly one item");
    }
  }

  next();
});

// Query helper for active auctions
auctionSchema.query.active = function () {
  return this.where({ auction_status: "active", deletedAt: null });
};

export default mongoose.model("Auction", auctionSchema);