import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./db/index.js";
import logger from "./utils/logger.js";

dotenv.config({});

const PORT = process.env.PORT || 7001;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.warn(`MongoDB connection error:`, err);
  });
