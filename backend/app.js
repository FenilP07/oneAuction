import express from "express";
import morgan from "morgan";
import logger from "./utils/logger.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { errorHandler } from "./middlewares/error.middlewares.js";
import userRoutes from "./routes/user.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import dotenv from "dotenv";


const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

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

app.use("/api/user/", userRoutes);
app.use("/api/category/", categoryRoutes);

app.use(errorHandler);
export { app };
