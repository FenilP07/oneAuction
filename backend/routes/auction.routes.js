import { Router } from "express";
import { createAuction } from "../controllers/auction.controller.js";
import { authenticatedMiddleware } from "../middlewares/auth.middlewares.js";

const router = Router();

router.post("/", authenticatedMiddleware,createAuction);

export default router;
