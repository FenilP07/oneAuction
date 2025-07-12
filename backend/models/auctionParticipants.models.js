import mongoose, { model, Schema } from "mongoose";


const auctionParticipantSchema = Schema(
  {
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
    },
    session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuctionSession",
      required: true,
    },
    User_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joined_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["pending", "active", "left", "banned"],
      default: "pending",
      index: true,
    },
    last_activity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

auctionParticipantSchema.pre("save", async function (next) {
  try {
    const session = await mongoose.model("AuctionSession").findOne({
      session_id: this.session_id,
      status: { $in: ["pending", "active"] },
    });
    if (!session) throw new Error("Invalid or inactive session");

    next();
  } catch (error) {
    next(error);
  }
});

const AuctionParticipant = mongoose.model(
  "AuctionParticipant",
  auctionParticipantSchema
);

export default AuctionParticipant;
