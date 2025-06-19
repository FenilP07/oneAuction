import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import UserProfile from "./userProfile.models.js";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "banned"],
      default: "active",
    },
    lastLogin: { type: Date, default: Date.now },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    refreshToken: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

//pre save hook to hash password
userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

//pre findOneAndDelete hook to delete userProfile along with user(cascade delete)
userSchema.pre("findOneAndDelete", async function (next) {
  const user = await this.model.findOne(this.getFilter());
  if (user) {
    await UserProfile.deleteOne({
      user: user._id,
    });
  }
  next();
});

const User = mongoose.model("User", userSchema);

export default User;
