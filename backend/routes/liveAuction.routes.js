import Router from "express";
import {
  moveToNextItemWithTransaction,
  placeBid,
} from "../controllers/liveAuction.controllers.js";

const router = Router();

router.post("/live/:sessionId/bid", placeBid);
router.post("/live/:sessionId/next-item", moveToNextItemWithTransaction);

export default router;
