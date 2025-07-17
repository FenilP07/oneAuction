import mongoose, { Schema } from "mongoose";

const auctionTypeSchema = new Schema(
  {
    type_name: {
      type: String,
      enum: ["live", "sealed_bid", "single_timed_item"],
      required: true,
      unique: true, // Prevent duplicate types
      index: true, // Optimize lookups
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      validate: {
        validator: (v) => !v || v.length > 0, // Ensure non-empty if provided
        message: "Description cannot be empty if provided",
      },
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true, // Optimize filtering by active status
    },
  },
  {
    timestamps: true,
  }
);

// Seed default auction types (run once during app initialization)
auctionTypeSchema.statics.seedDefaults = async function () {
  const defaultTypes = [
    { type_name: "live", description: "Real-time live auction with multiple items" },
    { type_name: "sealed_bid", description: "Bidders submit hidden bids" },
    { type_name: "single_timed_item", description: "Timed auction for a single item" },
  ];

  for (const type of defaultTypes) {
    await this.findOneAndUpdate(
      { type_name: type.type_name },
      { $setOnInsert: type },
      { upsert: true }
    );
  }
};

const AuctionType = mongoose.model("AuctionType", auctionTypeSchema);

export default AuctionType;