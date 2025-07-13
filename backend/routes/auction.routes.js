import { Router } from "express";
import {
  createAuction,
  getAllAuctions,
  getAuctionById,
  getAuctionPreview,
  getMyAuctions,
} from "../controllers/auction.controller.js";
import { authenticatedMiddleware } from "../middlewares/auth.middlewares.js";
import upload from "../utils/cloudinary.js";

const router = Router();

router.post("/", authenticatedMiddleware,upload.single("banner_image"), createAuction);
router.get("/", getAllAuctions);
router.get("/:auction_id/preview", authenticatedMiddleware, getAuctionPreview);
router.get("/:id", getAuctionById);
router.get("/my-auctions",authenticatedMiddleware,getMyAuctions)

export default router;
