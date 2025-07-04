import { Router } from "express";
import { getPendingApprovalItems, handleItemApproval } from "../controllers/admin.controllers.js";
import { getItemById, approveItem, rejectItem} from "../controllers/item.controllers.js";



import { authenticatedMiddleware } from "../middlewares/auth.middlewares.js";
import { adminMiddleware } from "../middlewares/admin.middleware.js";


const router = Router();

router.get("/pending", authenticatedMiddleware, adminMiddleware, getPendingApprovalItems);
router.get("/item/:id", authenticatedMiddleware, adminMiddleware, getItemById);
router.post("/item/:id/approve", authenticatedMiddleware, adminMiddleware, approveItem);
router.post("/item/:id/reject", authenticatedMiddleware, adminMiddleware, rejectItem);





// Approve or reject an item approval request
router.patch(
  "/:id",
  authenticatedMiddleware,
  adminMiddleware,
  handleItemApproval
);

export default router;
