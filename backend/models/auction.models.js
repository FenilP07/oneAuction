import mongoose from "mongoose";
import AuctionType from "./auctionTypes.models.js";

const auctionSchema = new mongoose.Schema({
  auctioneer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  auctionType_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AuctionType",
    required: true
  },
  auction_title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  auction_status: {
    type: String,
    enum: ["upcoming", "active", "completed", "cancelled"],
    default: "upcoming",
    index: true
  },
  auction_start_time: {
    type: Date,
    required: true,
    index: true
  },
  auction_end_time: {
    type: Date,
    required: true
  },
  settings: {
    item_ids: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Item",
      validate: {
        validator: function(v) {
          return this.auctionType_id?.type_name === "live" ? v.length > 0 : true;
        },
        message: "Live auctions require at least one item"
      }
    },
    current_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item"
    },
    min_bid_increment: {
      type: Number,
      default: 1
    }
  }
}, { timestamps: true, strict: "throw" });

// Pre-save validation
auctionSchema.pre("save", async function(next) {
  const auctionType = await AuctionType.findById(this.auctionType_id);
  if (!auctionType) throw new Error("Invalid auction type");

  // Time validation
  if (this.auction_start_time >= this.auction_end_time) {
    throw new Error("End time must be after start time");
  }

  // Live auction specific checks
  if (auctionType.type_name === "live") {
    if (!this.settings.item_ids?.length) {
      throw new Error("Live auctions require items");
    }

    // Verify all items exist and are available
    const itemsCount = await mongoose.model("Item").countDocuments({
      _id: { $in: this.settings.item_ids },
      status: "available"
    });
    if (itemsCount !== this.settings.item_ids.length) {
      throw new Error("One or more items are unavailable");
    }

    // Set first item as current if not set
    if (!this.settings.current_item_id) {
      this.settings.current_item_id = this.settings.item_ids[0];
    }
  }

  next();
});

export default mongoose.model("Auction", auctionSchema);