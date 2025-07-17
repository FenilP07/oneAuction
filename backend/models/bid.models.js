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
      min: 0,
    },

    encrypted_amount: {
      type: String,
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

// Indexes for faster queries
bidSchema.index({ auction_id: 1, item_id: 1 });
bidSchema.index({ bidder_id: 1 });
bidSchema.index({ item_id: 1, amount: -1 });

const Bid = mongoose.model("Bid", bidSchema);

export default Bid;
