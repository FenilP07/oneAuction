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
import mongoose from "mongoose";  // Added mongoose import
import jwt from "jsonwebtoken";  // Added jwt import
import { apiError } from "./utils/apiError.js"; // Added apiError import

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

const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  },
});

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => logger.error("Redis Client Error", err));
redisClient
  .connect()
  .then(() => logger.info("Connected to Redis"))
  .catch((err) => {
    logger.error("Redis connection failed", err);
    process.exit(1); // stop process if Redis not connected
  });

// Make redis client accessible in requests if needed
app.use((req, res, next) => {
  req.redis = redisClient;
  next();
});

app.use(
  cors({
    origin: allowedOrigin,
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

io.use((socket, next) => {
  const token = socket.handshake.auth.token?.split(" ")[1];
  if (!token) {
    return next(new apiError(401, "Authentication token required"));
  }
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new apiError(403, "Invalid or expired token"));
  }
});


const auctionNamespace = io.of("/auctions");
auctionNamespace.on("connection", (socket) => {
  logger.info(`User ${socket.user._id} connected to auction namespace`);

  socket.on("joinSession", async ({ session_id }) => {
    try {
      const session = await mongoose.model("AuctionSession").findById(session_id);
      if (!session || session.status !== "active") {
        socket.emit("error", { message: "Session not found or not active" });
        return;
      }
      socket.join(session_id);
      logger.info(`User ${socket.user._id} joined session ${session_id}`);
    } catch (err) {
      logger.error("Error in joinSession event", err);
      socket.emit("error", { message: "Internal server error" });
    }
  });

  socket.on("disconnect", () => {
    logger.info(`User ${socket.user._id} disconnected`);
  });
});

app.use(errorHandler);

export { app, auctionNamespace, redisClient, server };
