import { Router } from "express";
import {
  createChallenge,
  getChallenges,
  joinChallenge,
  getChallengeProgress,
  getChallengeLeaderboard,
} from "../controllers/challenge.controller";
import { protect, withLegacyUser } from "../middleware/auth.middleware";

const router = Router();

// All challenge routes require authentication
router.use(protect);
router.use(withLegacyUser);

// Create a new challenge
router.post("/", createChallenge);

// Get challenges (with filtering)
router.get("/", getChallenges);

// Join a challenge
router.post("/:challengeId/join", joinChallenge);

// Get challenge progress for current user
router.get("/:challengeId/progress", getChallengeProgress);

// Get challenge leaderboard
router.get("/:challengeId/leaderboard", getChallengeLeaderboard);

export default router;
