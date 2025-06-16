import User from "../models/users.models.js";
import UserProfile from "../models/userProfile.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponse.js";
import { generateRandomUsername } from "../utils/randomUsername.js";
import logger from "../utils/logger.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";

/**
 * @desc Registers a new user with profile creation
 * @route POST /api/user/register
 */
const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, username, password, confirmPassword } =
    req.body;

  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    throw new apiError(400, "All required fields must be provided.");
  }

  if (password !== confirmPassword) {
    throw new apiError(400, "Passwords do not match.");
  }

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    throw new apiError(
      400,
      "Password must contain uppercase, lowercase, number, special character and be at least 8 characters long."
    );
  }

  // Generate username if not provided
  const finalUsername =
    username || (await generateRandomUsername(firstName, lastName));
  const existingUser = await User.findOne({
    $or: [{ email }, { username: finalUsername }],
  });

  if (existingUser) {
    throw new apiError(409, "Email or username already in use.");
  }

  const newUser = await User.create({
    email,
    username: finalUsername,
    password,
  });

  const newProfile = await UserProfile.create({
    firstName,
    lastName,
    user: newUser._id,
    avatarUrl: "https://example.com/default-avatar.png",
  });

  logger.info("New user registered", { userId: newUser._id });

  return res.status(201).json(
    new APIResponse(
      201,
      {
        user: {
          _id: newUser._id,
          email: newUser.email,
          username: newUser.username,
          role: newUser.role,
          profile: {
            firstName: newProfile.firstName,
            lastName: newProfile.lastName,
            avatarUrl: newProfile.avatarUrl,
          },
        },
      },
      "User registered successfully"
    )
  );
});

/**
 * @desc Logs in a user and returns access and refresh tokens
 * @route POST /api/user/login
 */

const loginUser = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    throw new apiError(400, "Identifier and password are required.");
  }

  // find user by email or username
  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  });

  if (!user || !(await user.comparePassword(password))) {
    throw new apiError(401, "Invalid email/username or password.");
  }

  if (user.status !== "active") {
    throw new apiError(403, "Account is not active.");
  }

  const profile = await UserProfile.findOne({ user: user._id });
  if (!profile) {
    throw new apiError(500, "User profile not found.");
  }
  // Generate JWT tokens for authentication
  // Access token: short-lived, used for API requests
  // Refresh token: long-lived, used to generate new access tokens
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Set refresh token as HTTP-only cookie for security
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  logger.info("User logged in", { userId: user._id, username: user.username });
  return res.status(200).json(
    new APIResponse(
      200,
      {
        user: {
          _id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          lastLogin: user.lastLogin,
          accessToken,
          profile: {
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatarUrl: profile.avatarUrl,
          },
        },
      },
      "Login successful"
    )
  );
});

/**
 * @desc Logs out a user by clearing the refresh token cookie
 * @route POST /api/user/logout
 */
const logOutUser = asyncHandler(async (req, res) => {
  // Check if refresh token exists in cookies
  const userId = req.user?._id;
  if (!userId) {
    throw new apiError(401, "Unauthorized: No user found in request");
  }
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $unset: { refreshToken: "" },
    },
    { new: true }
  );

  // Clear refresh token cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });

  logger.info("User logged out", { userId, username: user.username });

  return res
    .status(200)
    .json(new APIResponse(200, {}, "User logged out successfully."));
});

// get user data by id and populate profile
const getUserById = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  if (!userId) {
    throw new apiError(400, "userId is required");
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new apiError(404, "User not found");
  }
  const profile = await UserProfile.findOne({ user: user._id });
  if (!profile) {
    throw new apiError(404, "User profile not found");
  }
  const completeUserData = {
    user,
    profile: profile,
  };

  logger.info("User data fetrched", {
    userId: user._id,
    username: user.username,
  });

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { user: completeUserData },
        "User data fetched successfully"
      )
    );
});

export { registerUser, loginUser, logOutUser, getUserById };
