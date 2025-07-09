import dotenv from "dotenv";
// Load environment variables FIRST
dotenv.config();

import express from "express";
import morgan from "morgan";
import logger from "./utils/logger.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { errorHandler } from "./middlewares/error.middlewares.js";
import userRoutes from "./routes/user.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import itemRoutes from "./routes/item.routes.js";
import adminItemRoutes from "./routes/admin.routes.js";
import auctionTypeRoutes from "./routes/auctionTypes.routes.js";
import auctionRoutes from "./routes/auction.routes.js";
import auctionSessionRoutes from "./routes/auctionSession.routes.js"
import liveAuctionRoutes from "./routes/liveAuction.routes.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use('/uploads', express.static('uploads')); 

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


app.use("/api/auctionType/", auctionTypeRoutes);
app.use("/api/auction/",auctionRoutes)
app.use("/api/auctionSession/", auctionSessionRoutes);
app.use("/api/liveAuction/", liveAuctionRoutes);

app.use(errorHandler);

export { app };
