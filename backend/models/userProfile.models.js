import mongoose, { Schema } from "mongoose";

const userProfileSchema = new Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    minLength: 10,
  },
  avatarUrl: {
    type: String,
  },
  isAnonymous: {
    type: Boolean,
    default: false,
  },
  anonymousUsername: {
    type: String,
    trim: true,
  },
  anonymousAvatar: {
    type: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  }
}, {
  timestamps: true,
});

const UserProfile = mongoose.model("UserProfile", userProfileSchema);

export default UserProfile;
