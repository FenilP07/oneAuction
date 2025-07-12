import { Router } from "express";
import {
  createAuction,
  getAllAuctions,
  getAuctionById,
  getAuctionPreview,
} from "../controllers/auction.controller.js";
import { authenticatedMiddleware } from "../middlewares/auth.middlewares.js";

const router = Router();

router.post("/", authenticatedMiddleware, createAuction);
router.get("/", getAllAuctions);
router.get("/:auction_id/preview", authenticatedMiddleware, getAuctionPreview);
router.get("/:id", getAuctionById);

export default router;
