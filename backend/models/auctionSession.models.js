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
      required: true,
      unique: true,
      default: () => {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        for (let i = 0; i < 6; i++) {
          code += characters.charAt(
            Math.floor(Math.random() * characters.length)
          );
        }
        return code;
      },
    },
    status: {
      type: String,
      enum: ["pending", "active", "completed", "cancelled"],
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
  },
  {
    timestamps: true,
  }
);

auctionSessionSchema.pre("save", async function (next) {
  try {
    const auction = await mongoose.model("Auction").findOne({
      _id: this.auction_id,
      auctionType_id: await mongoose.model("AuctionType").findOne({ type_name: "live" }).select("_id"),
      auction_status: { $in: ["upcoming", "active"] },
    });
    if (!auction) throw new Error("Invalid or non-live auction");

    if (this.start_time >= this.end_time) {
      throw new Error("Start time must be before end time");
    }

    if (this.end_time > auction.auction_end_time) {
      throw new Error("Session end time cannot exceed auction end time");
    }

    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("AuctionSession", auctionSessionSchema);