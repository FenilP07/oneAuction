import { Router } from "express";
import {
  registerUser,
  loginUser,
  logOutUser,
  getUserById,
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

router.get("/refresh-token", refreshAccessTokenMiddleware, (req, res) => {
  return res.status(200).json({
    accessToken: req.newAccessToken,
  });
});

export default router;
