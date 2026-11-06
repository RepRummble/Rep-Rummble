import { Router } from "express";
import {
  createPost,
  getFeed,
  likePost,
  addComment,
  getPostComments,
  deletePost,
} from "../controllers/social.controller";
import { protect, withLegacyUser } from "../middleware/auth.middleware";

const router = Router();

// All social routes require authentication
router.use(protect);
router.use(withLegacyUser);

// Create a new post
router.post("/posts", createPost);

// Get social feed
router.get("/feed", getFeed);

// Like/unlike a post
router.post("/posts/:postId/like", likePost);

// Add comment to a post
router.post("/posts/:postId/comments", addComment);

// Get comments for a post
router.get("/posts/:postId/comments", getPostComments);

// Delete a post
router.delete("/posts/:postId", deletePost);

export default router;
