import mongoose from "mongoose";
import { apiError } from "../utils/apiError.js";
import logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Log the raw error
  logger.error({
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
  });

  // Handle Mongoose-specific errors
  if (err instanceof mongoose.Error.ValidationError) {
    error = new apiError(400, "Validation failed", err.errors);
  } else if (err instanceof mongoose.Error.CastError) {
    error = new apiError(400, `Invalid value for ${err.path}`);
  } else if (err.code === 11000) {
    error = new apiError(409, "Duplicate key error");
  } else if (!(error instanceof apiError)) {
    // Catch-all for unknown errors
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";
    error = new apiError(statusCode, message, [], err.stack);
  }

  // Build response payload
  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message, // Always show meaningful message
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  };

  return res.status(error.statusCode).json(response);
};

export { errorHandler };
