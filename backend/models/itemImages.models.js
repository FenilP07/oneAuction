import mongoose, { Schema } from "mongoose";

// Define the ItemImages schema
const itemImagesSchema = new Schema(
  {
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
      index: true,
    },
    image_url: {
      type: String,
      required: true,
    },
    is_primary: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);


itemImagesSchema.pre("save", async function (next) {
  if (this.is_primary) {
    try {
      
      const existingPrimary = await this.constructor.findOne({
        item_id: this.item_id,
        is_primary: true,
        _id: { $ne: this._id },
      });

      if (existingPrimary) {
        existingPrimary.is_primary = false;
        await existingPrimary.save();
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

itemImagesSchema.index({ item_id: 1, is_primary: 1 });
itemImagesSchema.index({ order: 1 });

const ItemImages = mongoose.model("ItemImages", itemImagesSchema);

export default ItemImages;
