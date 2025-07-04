import { Router } from "express";
import { createItem, updateItem } from "../controllers/item.controllers.js";
import { authenticatedMiddleware } from "../middlewares/auth.middlewares.js";
import { getItemById, approveItem, rejectItem} from "../controllers/item.controllers.js";
const router = Router();

// Protected — Auctioneer must be logged in
router.post("/create", authenticatedMiddleware, createItem);
router.put("/:id", authenticatedMiddleware, updateItem);
router.get("/:id", authenticatedMiddleware, getItemById);
router.post("/:id/approve", authenticatedMiddleware, approveItem);
router.post("/:id/reject", authenticatedMiddleware, rejectItem);







export default router;
