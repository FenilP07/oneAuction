import mongoose, { Schema } from "mongoose";

const itemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["available", "sold", "pending_approval", "rejected"],
      default: "pending_approval",
    },
    starting_bid: {
      type: Number,
      required: true,
      min: 0,
    },
    current_bid: {
      type: Number,
      default: function () {
        return this.starting_bid;
      },
      min: 0,
    },
    approver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    winner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    auctioneer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    auction_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
    },
  },
  {
    timestamps: true,
  }
);

itemSchema.index({ category_id: 1 });
itemSchema.index({ auction_id: 1 });
itemSchema.index({ status: 1 });

const Item = mongoose.model("Item", itemSchema);

export default Item;
