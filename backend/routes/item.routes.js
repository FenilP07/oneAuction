import { Router } from "express";
import { createItem, updateItem, getAllItems, getMyItems } from "../controllers/item.controllers.js";
import { authenticatedMiddleware } from "../middlewares/auth.middlewares.js";

const router = Router();

// Protected — Auctioneer must be logged in
router.post("/create", authenticatedMiddleware, createItem);
router.put("/:id", authenticatedMiddleware, updateItem);
router.get("/my-items", authenticatedMiddleware, getMyItems);

// Public route for users to fetch available items with filters
router.get("/all", getAllItems);

export default router;
