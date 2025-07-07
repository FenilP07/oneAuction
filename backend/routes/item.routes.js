import { Router } from "express";
import {
  createItem,
  updateItem,
  getAllItems,
  getMyItems,
} from "../controllers/item.controllers.js";
import { authenticatedMiddleware } from "../middlewares/auth.middlewares.js";
import {
  getItemById,
  approveItem,
  rejectItem,
} from "../controllers/item.controllers.js";
import upload from "../utils/cloudinary.js";
const router = Router();

// Protected — Auctioneer must be logged in
router.post(
  "/create",
  authenticatedMiddleware,
  upload.array("images", 10),
  createItem
);
router.put("/:id", authenticatedMiddleware, updateItem);

router.get("/:id", authenticatedMiddleware, getItemById);
router.post("/:id/approve", authenticatedMiddleware, approveItem);
router.post("/:id/reject", authenticatedMiddleware, rejectItem);

router.get("/my-items", authenticatedMiddleware, getMyItems);

// Public route for users to fetch available items with filters
router.get("/all", getAllItems);

export default router;
