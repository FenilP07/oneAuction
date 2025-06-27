import { Router } from "express";
import { getPendingApprovalItems, handleItemApproval } from "../controllers/admin.controllers.js";
import { authenticatedMiddleware } from "../middlewares/auth.middlewares.js";
import { adminMiddleware } from "../middlewares/admin.middleware.js";

const router = Router();

router.get("/pending", authenticatedMiddleware, adminMiddleware, getPendingApprovalItems);

// Approve or reject an item approval request
router.patch(
  "/:id",
  authenticatedMiddleware,
  adminMiddleware,
  handleItemApproval
);

export default router;
