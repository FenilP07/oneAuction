import dotenv from "dotenv";
// Load environment variables FIRST
dotenv.config();

import express from "express";
import morgan from "morgan";
import logger from "./utils/logger.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import redis from "redis";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { apiError } from "./utils/apiError.js";

import { errorHandler } from "./middlewares/error.middlewares.js";
import userRoutes from "./routes/user.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import itemRoutes from "./routes/item.routes.js";
import adminItemRoutes from "./routes/admin.routes.js";
import auctionTypeRoutes from "./routes/auctionTypes.routes.js";
import auctionRoutes from "./routes/auction.routes.js";
import auctionSessionRoutes from "./routes/auctionSession.routes.js";
import liveAuctionRoutes from "./routes/liveAuction.routes.js";

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:3000", // Add other origins as needed
];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps) or allowed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  },
  pingTimeout: 20000,
  pingInterval: 25000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => logger.error("Redis Client Error", err));

// Retry Redis connection with fallback
const connectRedisWithRetry = async (retries = 5, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await redisClient.connect();
      logger.info("Connected to Redis");
      return;
    } catch (err) {
      logger.error(`Redis connection attempt ${i + 1} failed: ${err.message}`);
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  logger.warn("Redis connection failed after retries; proceeding without cache");
};

// Connect to Redis
connectRedisWithRetry();

// Make redis client accessible in requests
app.use((req, res, next) => {
  req.redis = redisClient;
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use("/uploads", express.static("uploads"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

const morganFormat = ":method :url :status :response-time ms";
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const parts = message.trim().split(" ");
        const logObject = {
          method: parts[0],
          url: parts[1],
          status: parts[2],
          responseTime: parseFloat(parts[3]),
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);

// Routes
app.use("/api/user/", userRoutes);
app.use("/api/category/", categoryRoutes);
app.use("/api/item/", itemRoutes);
app.use("/api/admin/item/", adminItemRoutes);
app.use("/api/auction/auctionType/", auctionTypeRoutes);
app.use("/api/auction/", auctionRoutes);
app.use("/api/auctionSession/", auctionSessionRoutes);
app.use("/api/liveAuction/", liveAuctionRoutes);

// Main Socket.IO connection (without auth for basic connection)
io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on("join_auction_room", (auction_id) => {
    socket.join(auction_id);
    logger.info(`Client ${socket.id} joined auction room: ${auction_id}`);
  });

  socket.on("leave_auction_room", (auction_id) => {
    socket.leave(auction_id);
    logger.info(`Client ${socket.id} left auction room: ${auction_id}`);
  });

  socket.on("disconnect", () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Socket.IO Authentication Middleware
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      logger.error("Authentication token missing");
      return next(new Error("Authentication token missing"));
    }

    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;

    const decoded = jwt.verify(cleanToken, process.env.ACCESS_TOKEN_SECRET);
    
    const RevokedToken = mongoose.model("RevokedToken");
    const revoked = await RevokedToken.findOne({ token: cleanToken });
    if (revoked) {
      logger.error("Access token has been revoked");
      return next(new Error("Access token has been revoked"));
    }
    
    const userId = decoded._id;
    if (!userId) {
      logger.error("No user ID found in decoded token");
      return next(new Error("Invalid token structure"));
    }
    
    const User = mongoose.model("User");
    const user = await User.findById(userId).select("-password -refreshToken");
    
    if (!user) {
      logger.error(`User not found with ID: ${userId}`);
      return next(new Error("User not found"));
    }

    if (user.status !== "active") {
      logger.error(`User account not active for ID: ${userId}`);
      return next(new Error("User account is not active"));
    }

    socket.user = user;
    next();
  } catch (error) {
    logger.error("Socket authentication error:", error.message);
    return next(new Error(`Authentication failed: ${error.message}`));
  }
};

// Create auction namespace and apply authentication middleware
const auctionNamespace = io.of("/auctions");
auctionNamespace.use(socketAuthMiddleware);

auctionNamespace.on("connection", (socket) => {
  try {
    logger.info(`User ${socket.user._id} (${socket.user.username || "Unknown"}) connected to auction namespace`);

    // Emit userJoined event on connection
    auctionNamespace.emit("userJoined", {
      user_id: socket.user._id,
      username: socket.user.username || "Anonymous",
      timestamp: new Date(),
    });

    socket.join(socket.user._id.toString());

    socket.on("join_auction_room", (auction_id) => {
      try {
        socket.join(auction_id);
        logger.info(`User ${socket.user._id} joined auction room: ${auction_id}`);
        // Emit userJoined event to the specific auction room
        auctionNamespace.to(auction_id).emit("userJoined", {
          user_id: socket.user._id,
          username: socket.user.username || "Anonymous",
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error(`Error joining auction room ${auction_id}: ${error.message}`);
        socket.emit("error", { message: "Failed to join auction room" });
      }
    });

    socket.on("leave_auction_room", (auction_id) => {
      try {
        socket.leave(auction_id);
        logger.info(`User ${socket.user._id} left auction room: ${auction_id}`);
      } catch (error) {
        logger.error(`Error leaving auction room ${auction_id}: ${error.message}`);
        socket.emit("error", { message: "Failed to leave auction room" });
      }
    });

    socket.on("joinSession", async ({ session_id }) => {
      try {
        const session = await mongoose
          .model("AuctionSession")
          .findById(session_id);
        if (!session || session.status !== "active") {
          socket.emit("error", { message: "Session not found or not active" });
          return;
        }
        socket.join(session_id);
        logger.info(`User ${socket.user._id} joined session ${session_id}`);
      } catch (err) {
        logger.error(`Error in joinSession event for session ${session_id}: ${err.message}`);
        socket.emit("error", { message: "Internal server error" });
      }
    });

    socket.on("disconnect", (reason) => {
      logger.info(`User ${socket.user._id} disconnected from auction namespace. Reason: ${reason}`);
    });

    socket.on("error", (error) => {
      logger.error(`Socket error for user ${socket.user._id}: ${error.message}`);
    });

  } catch (error) {
    logger.error(`Error in auction namespace connection for user ${socket.user?._id || "unknown"}: ${error.message}`);
    socket.emit("error", { message: "Connection error" });
    socket.disconnect();
  }
});

app.use(errorHandler);

export { app, auctionNamespace, redisClient, server, io };
