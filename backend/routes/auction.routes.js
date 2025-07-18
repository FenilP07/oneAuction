import { Router } from "express";
import {
  createAuction,
  getAllAuctions,
  getAuctionById,
  getAuctionLeaderboard,
  getAuctionPreview,
  getAuctionSummary,
  getMyAuctions,
} from "../controllers/auction.controller.js";
import { authenticatedMiddleware } from "../middlewares/auth.middlewares.js";
import upload from "../utils/cloudinary.js";

const router = Router();

router.post("/", authenticatedMiddleware,upload.single("banner_image"), createAuction);
router.get("/my-auctions",authenticatedMiddleware,getMyAuctions)
router.get("/preview/:auction_id", getAuctionPreview);
router.get("/leaderboard/:auction_id",getAuctionLeaderboard);
router.get("/summary/:auction_id",getAuctionSummary)
router.get("/:auction_id", getAuctionById);
router.get("/", getAllAuctions);



export default router;
