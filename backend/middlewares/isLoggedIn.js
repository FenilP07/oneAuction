import jwt from "jsonwebtoken";
import User from "../models/users.models.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const isLoggedIn = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new apiError(401, "Unauthorized: No access token provided");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded._id);

    if (!user) {
      throw new apiError(401, "Unauthorized: User not found");
    }

    req.user = user; //  Attach user to the request object
    next(); //  Proceed to controller
  } catch (err) {
    throw new apiError(401, "Invalid or expired access token");
  }
});
