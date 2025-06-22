import { APIResponse } from "../utils/apiResponse.js";

const adminMiddleware = async (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json(new APIResponse(403, null, "Admin access required"));
  }
  next();
};

export { adminMiddleware };
