import User from "../models/users.models.js";
import UserProfile from "../models/userProfile.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponse.js";
import { generateRandomUsername } from "../utils/randomUsername.js";
import logger from "../utils/logger.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import { sendPasswordResetEmail } from "../utils/emailService.js";
import RevokedToken from "../models/revokedTokens.models.js";
import jwt from "jsonwebtoken";

/**
 * @desc Registers a new user with profile creation
 * @route POST /api/user/register
 */
const registerUser = asyncHandler(async (req, res) => {
  logger.info("Register request received", { body: req.body });

  const { firstName, lastName, email, username, password, confirmPassword } =
    req.body;

  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    logger.warn("Registration failed: Missing fields");
    throw new apiError(400, "All required fields must be provided.");
  }

  if (password !== confirmPassword) {
    logger.warn("Registration failed: Passwords do not match");
    throw new apiError(400, "Passwords do not match.");
  }

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    logger.warn("Registration failed: Password does not meet complexity");
    throw new apiError(
      400,
      "Password must contain uppercase, lowercase, number, special character and be at least 8 characters long."
    );
  }

  const finalUsername =
    username || (await generateRandomUsername(firstName, lastName));

  const existingUser = await User.findOne({
    $or: [{ email }, { username: finalUsername }],
  });

  if (existingUser) {
    logger.warn("Registration failed: Email or username already in use", {
      email,
      finalUsername,
    });
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

  logger.info("New user registered", {
    userId: newUser._id,
    email: newUser.email,
    username: newUser.username,
  });

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
  logger.info("Login request received", { identifier: req.body.identifier });

  const { identifier, password } = req.body;

  if (!identifier || !password) {
    logger.warn("Login failed: Missing identifier or password");
    throw new apiError(400, "Identifier and password are required.");
  }

  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  });

  if (!user || !(await user.comparePassword(password))) {
    logger.warn("Login failed: Invalid credentials", { identifier });
    throw new apiError(401, "Invalid email/username or password.");
  }

  if (user.status !== "active") {
    logger.warn("Login blocked: User not active", { userId: user._id });
    throw new apiError(403, "Account is not active.");
  }

  const profile = await UserProfile.findOne({ user: user._id });
  if (!profile) {
    logger.error("Login error: Profile not found", { userId: user._id });
    throw new apiError(500, "User profile not found.");
  }

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  logger.info("User logged in successfully", {
    userId: user._id,
    username: user.username,
  });

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
const logoutUser = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const accessToken = req.headers.authorization?.split(" ")[1];

  if (!userId || !accessToken) {
    throw new apiError(401, "Unauthorized: No user found or no token provided");
  }

  
  const decoded = jwt.decode(accessToken);
  const expiryDate = new Date(decoded.exp * 1000);

  await RevokedToken.create({
    token: accessToken,
    expiresAt: expiryDate,
  });

  // Remove refresh token from user DB
  const user = await User.findByIdAndUpdate(
    userId,
    { $unset: { refreshToken: "" } },
    { new: false }
  );

  if (!user) {
    throw new apiError(404, "User not found");
  }

  // Clear refresh token cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    path: "/",
  });

  return res
    .status(200)
    .json(new APIResponse(200, {}, "User logged out successfully"));
});


/**
 * @desc Get user by ID (includes profile)
 * @route GET /api/user/:id
 */
const getUserById = asyncHandler(async (req, res) => {
  logger.info("Get user by ID request", { userId: req.params.id });

  const userId = req.params.id;
  if (!userId) {
    logger.warn("Get user failed: Missing userId param");
    throw new apiError(400, "userId is required");
  }

  const user = await User.findById(userId);
  if (!user) {
    logger.warn("User not found", { userId });
    throw new apiError(404, "User not found");
  }

  const profile = await UserProfile.findOne({ user: user._id });
  if (!profile) {
    logger.warn("User profile not found", { userId });
    throw new apiError(404, "User profile not found");
  }

  logger.info("User data fetched successfully", {
    userId: user._id,
    username: user.username,
  });

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { user: { user, profile } },
        "User data fetched successfully"
      )
    );
});

/**
 * @desc Request password reset by sending reset link via email
 * @route POST /api/user/request-password-reset
 */
const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new apiError(400, "Email is required.");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new apiError(404, "No account registered with this email.");
  }

  const resetToken = generateAccessToken(user._id, user.role);
  const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

  // Store token & expiry in DB
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes expiry
  await user.save({ validateBeforeSave: false });

  // Send email
  await sendPasswordResetEmail({
    email: user.email,
    name: user.username,
    resetToken,
    resetUrl,
  });

  logger.info("Password reset email sent", { userId: user._id, email });

  return res
    .status(200)
    .json(
      new APIResponse(200, null, "Password reset email sent successfully.")
    );
});

/**
 * @desc Reset password using reset token
 * @route POST /api/user/reset-password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword, confirmNewPassword } = req.body;

  if (!resetToken || !newPassword || !confirmNewPassword) {
    throw new apiError(400, "All fields are required.");
  }

  if (newPassword !== confirmNewPassword) {
    throw new apiError(400, "Passwords do not match.");
  }

  const user = await User.findOne({
    passwordResetToken: resetToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new apiError(400, "Invalid or expired reset token.");
  }

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    throw new apiError(
      400,
      "Password must contain uppercase, lowercase, number, special character and be at least 8 characters long."
    );
  }

  if (await user.comparePassword(newPassword)) {
    throw new apiError(
      400,
      "New password cannot be the same as the current password."
    );
  }

  // Update password
  user.password = newPassword;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  logger.info("Password reset successful", { userId: user._id });

  return res
    .status(200)
    .json(new APIResponse(200, null, "Password has been reset successfully."));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getUserById,
  requestPasswordReset,
  resetPassword,
};
