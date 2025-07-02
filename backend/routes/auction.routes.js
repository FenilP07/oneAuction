import { Router } from "express";
import { createAuction } from "../controllers/auction.controller.js";

const router = Router();

router.post("/", createAuction);

export default router;
