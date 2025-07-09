import Router from "express";
import {
  moveToNextItemWithTransaction,
  placeBid,
  getItemBidHistory
} from "../controllers/liveAuction.controllers.js";
import { authenticatedMiddleware } from "../middlewares/auth.middlewares.js";

const router = Router();

router.post("/live/:sessionId/bid", placeBid);
router.post("/live/:sessionId/next-item", moveToNextItemWithTransaction);
router.get("/live/:session_id/item/:item_id/bid-history", authenticatedMiddleware, getItemBidHistory);

export default router;
