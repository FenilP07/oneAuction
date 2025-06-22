import mongoose,{Schema} from "mongoose";

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);
categorySchema.index({ category_name: 1 });
categorySchema.index({ is_active: 1 });

const Category = mongoose.model("Category", categorySchema);

export default Category;
