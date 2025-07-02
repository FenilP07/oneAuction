import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getUserById,
  requestPasswordReset,
  resetPassword,
  refreshAccessToken,
} from "../controllers/user.controllers.js";
import { authenticatedMiddleware } from "../middlewares/auth.middlewares.js";

const router = Router();

// Unprotected routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/:id", authenticatedMiddleware, getUserById);

// Protected routes
router.post("/logout", authenticatedMiddleware, logoutUser);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

router.post("/refresh-token", refreshAccessToken);

export default router;
