import { Router } from "express";
import {
  createAuctionType,
  getAllAuctionTypes,
} from "../controllers/auctionType.controllers.js";

const router = Router();
router.post("/", createAuctionType);
router.get("/", getAllAuctionTypes);

router.patch("/:id",updateAuctionType)

export default router;
