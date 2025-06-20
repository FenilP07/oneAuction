import { Router } from "express";
import {
  registerUser,
  loginUser,
  logOutUser,
  getUserById,
  requestPasswordReset,
  resetPassword,
} from "../controllers/user.controllers.js";
import { refreshAccessTokenMiddleware } from "../middlewares/refreshToken.middlewares.js";
import { isLoggedIn } from "../middlewares/isLoggedIn.js"; 

const router = Router();

//  Unprotected routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/:id", getUserById);


// Protected routes
router.post("/logout", isLoggedIn, logOutUser);


//protected routes

router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

router.get("/refresh-token", refreshAccessTokenMiddleware, (req, res) => {
  return res.status(200).json({
    accessToken: req.newAccessToken,
  });
});

export default router;
