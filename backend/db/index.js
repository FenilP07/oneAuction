import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";
import logger from "../utils/logger.js";
import auctionCronJob from "../utils/cornJobs.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}/${DB_NAME}`,

    );
    logger.info(
      `\n mongo db connected !! db host: ${connectionInstance.connection.host}`,
    );
    auctionCronJob();
    logger.info("Auction cron job initialized successfully");
  } catch (error) {
    logger.warn("MOngoDB connection erroe", error);
    process.exit(1);
  }
};

export default connectDB;
