// middlewares/authenticatedMiddleware.js

import jwt from "jsonwebtoken";
import User from "../models/users.models.js";
import { APIResponse } from "../utils/apiResponse.js";
import RevokedToken from "../models/revokedTokens.models.js"

const authenticatedMiddleware = async (req, res, next) => {
  const accessToken = req.headers.authorization?.split(" ")[1];

  if (!accessToken) {
    return res
      .status(401)
      .json(new APIResponse(401, null, "Access token is required"));
  }

  try {
    // Check if token is revoked
    const revoked = await RevokedToken.findOne({ token: accessToken });
    if (revoked) {
      return res
        .status(401)
        .json(new APIResponse(401, null, "Access token has been revoked"));
    }

    // Verify token
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    // Verify user status
    const user = await User.findById(decoded._id);
    if (!user) {
      return res
        .status(401)
        .json(new APIResponse(401, null, "User not found"));
    }

    if (user.status !== "active") {
      return res
        .status(403)
        .json(new APIResponse(403, null, "Account is not active"));
    }

    req.user = user;
    next();

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json(new APIResponse(401, null, "Access token has expired"));
    }
    return res
      .status(403)
      .json(new APIResponse(403, null, "Invalid access token"));
  }
};

export { authenticatedMiddleware };
