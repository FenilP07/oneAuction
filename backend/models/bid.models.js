import mongoose, { Schema } from "mongoose";

const bidSchema = new Schema(
  {
    auction_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
    },
    session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuctionSession",
      required: true,
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    bidder_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    is_winner: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);
bidSchema.index({ auction_id: 1, item_id: 1 });
bidSchema.index({ bidder_id: 1 });
bidSchema.index({ item_id: 1, amount: -1 });

const Bid = mongoose.model("Bid", bidSchema);

export default Bid;
