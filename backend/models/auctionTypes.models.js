import mongoose, { Schema } from "mongoose";
const auctionTypeSchema = new Schema(
  {
    type_name: {
      type: String,
      enum: ["live", "sealed_bid", "single_timed_item"],
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    is_active:{
      type: Boolean,
      default: true,
    }
  },
  {
    timeStamps: true,
  }
);

const AuctionTypes = mongoose.model("AuctionType", auctionTypeSchema);

export default AuctionTypes;
