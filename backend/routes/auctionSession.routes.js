import { Router } from "express";
import {
  createAuctionSession,
  endAuctionSession,
  getAuctionSession,
  getSessionParticipants,
  joinAuctionSession,
  startAuctionSession,
  pauseAuctionSession,
  resumeAuctionSession,
  getCurrentItem
} from "../controllers/auctionSession.controllers.js";
import { authenticatedMiddleware } from "../middlewares/auth.middlewares.js";

const router = Router();

router.post("/session", authenticatedMiddleware,createAuctionSession);
router.patch("/session/:session_id/start", authenticatedMiddleware,startAuctionSession);
router.post("/session/:session_id/join", authenticatedMiddleware,joinAuctionSession);
router.get("/session/:session_id", authenticatedMiddleware,getAuctionSession);
router.get("/session/:session_id/participants", authenticatedMiddleware,getSessionParticipants);
router.patch("/session/:session_id/end", authenticatedMiddleware,endAuctionSession);
router.patch("/session/:session_id/pause", authenticatedMiddleware, pauseAuctionSession);
router.patch("/session/:session_id/resume", authenticatedMiddleware, resumeAuctionSession);
router.get("/session/:session_id/current-item", authenticatedMiddleware, getCurrentItem);

export default router;
