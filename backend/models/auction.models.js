import mongoose, { Schema } from "mongoose";

const auctionSchema = new Schema(
  {
    auctioneer_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    auctionType_id: {
      type: Schema.Types.ObjectId,
      ref: "AuctionTypes",
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
// Pre-save validation
auctionSchema.pre("save", async function (next) {
  const auctionType = await mongoose
    .model("AuctionTypes")
    .findOne({ auction_type_id: this.auction_type_id });
  if (!auctionType) throw new Error("Invalid auction type");

  // Validate settings based on auction type
  const { type_name } = auctionType;
  if (type_name === "live") {
    if (
      !this.settings.item_ids ||
      !Array.isArray(this.settings.item_ids) ||
      this.settings.item_ids.length === 0
    ) {
      throw new Error("item_ids required for live auctions");
    }
    // Validate item_ids exist
    const items = await mongoose
      .model("Item")
      .countDocuments({ item_id: { $in: this.settings.item_ids } });
    if (items !== this.settings.item_ids.length)
      throw new Error("Invalid item_ids");
    this.settings.current_item_id =
      this.settings.current_item_id || this.settings.item_ids[0];
  } else if (["sealed_bid", "single_timed_item"].includes(type_name)) {
    if (!this.settings.item_id)
      throw new Error(
        "item_id required for sealed bid or single timed item auctions"
      );
    const item = await mongoose
      .model("Item")
      .findOne({ item_id: this.settings.item_id });
    if (!item) throw new Error("Invalid item_id");
  }

  // Ensure start time is before end time
  if (this.auction_start_time >= this.auction_end_time) {
    throw new Error("Start time must be before end time");
  }

  next();
});

const Auction = mongoose.model("Auction", auctionSchema);

export default Auction;
