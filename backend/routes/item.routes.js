import { Router } from "express";
import { createItem, updateItem } from "../controllers/item.controllers.js";
import { authenticatedMiddleware } from "../middlewares/auth.middlewares.js";

const router = Router();

// Protected — Auctioneer must be logged in
router.post("/create", authenticatedMiddleware, createItem);
router.put("/:id", authenticatedMiddleware, updateItem);

export default router;
