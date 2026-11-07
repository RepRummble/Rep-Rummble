import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth.middleware";
import { SocialPost } from "../models/SocialPost.model";
import { cleanText, friendIdsOf, blockedWith, isId, streaksFor } from "../services/social.service";
import { clampTz, localDay } from "../services/progress.service";
import { mealSnapshot, workoutSnapshot } from "../services/share.service";

const POST_TYPES = ["general", "workout", "meal", "achievement", "milestone", "daily", "challenge"] as const;

/** One question a day for the "post of the day". The same for everyone, so friends answer the same thing. */
const DAILY_PROMPTS = [
  "What is one win from today?", "What did you eat that made you feel good?", "What is today's workout in one sentence?",
  "What are you grateful your body did today?", "What is the hardest thing you did today?", "Who inspired you today?",
  "What will you do tomorrow to keep your streak?", "Show your best meal of the day.", "How did you move today?",
  "What did you learn about your training this week?", "What are you proud of this week?", "What is your goal for the weekend?",
  "What is a small habit that is working for you?", "How are you feeling after today's session?",
];
export const promptFor = (dayKey: string) => DAILY_PROMPTS[Math.floor(Date.parse(dayKey) / 86400000) % DAILY_PROMPTS.length];

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const sid = req.user?.supabaseId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { postType = "general", workoutId, mealId, challengeId } = req.body || {};
    if (!(POST_TYPES as readonly string[]).includes(postType)) return res.status(400).json({ success: false, message: "Unknown kind of post." });
    const content = cleanText(req.body?.content, 500);

    // Photos and videos are not supported yet, so nothing a client sends as a media link is stored.
    let snapshot: Record<string, unknown> | undefined;
    let dayKey: string | undefined;
    const data: Record<string, unknown> = { author: userId, content, postType, mediaUrls: [] };

    if (postType === "workout") {
      if (!isId(workoutId) || !sid) return res.status(400).json({ success: false, message: "Pick a workout to share." });
      snapshot = (await workoutSnapshot(workoutId, sid)) as any;
      if (!snapshot) return res.status(404).json({ success: false, message: "That workout was not found in your log." });
      if (await SocialPost.exists({ author: userId, workoutId })) return res.status(409).json({ success: false, message: "You already shared this workout." });
      data.workoutId = workoutId;
    } else if (postType === "meal") {
      if (!isId(mealId) || !sid) return res.status(400).json({ success: false, message: "Pick a meal to share." });
      snapshot = (await mealSnapshot(mealId, sid)) as any;
      if (!snapshot) return res.status(404).json({ success: false, message: "That meal was not found in your log." });
      if (await SocialPost.exists({ author: userId, "snapshot.mealId": mealId })) return res.status(409).json({ success: false, message: "You already shared this meal." });
      snapshot = { ...snapshot, mealId };
    } else if (postType === "daily") {
      if (!content) return res.status(400).json({ success: false, message: "Write your post of the day." });
      dayKey = localDay(new Date(), clampTz(req.body?.tz));
      data.dayKey = dayKey;
      snapshot = { prompt: promptFor(dayKey) };
    } else if (!content) {
      return res.status(400).json({ success: false, message: "Write something first." });
    }
    if (postType === "challenge" && isId(challengeId)) data.challengeId = challengeId;
    if (snapshot) data.snapshot = snapshot;

    let post;
    try {
      post = await SocialPost.create(data);
    } catch (e) {
      if ((e as { code?: number }).code === 11000) return res.status(409).json({ success: false, message: "You have already posted your post of the day. Come back tomorrow." });
      throw e;
    }
    await post.populate("author", "displayName");
    res.status(201).json({ success: true, post: await shapePost(post.toObject(), userId, new Map()) });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ success: false, message: "Could not post that. Please try again." });
  }
};

/** What the app receives for a post: who wrote it, whether you liked it, and the counts, but not the lists behind them. */
async function shapePost(p: any, me: string, streaks: Map<string, number>) {
  const authorId = String(p.author?._id ?? p.author);
  return {
    _id: String(p._id),
    author: { _id: authorId, displayName: p.author?.displayName || "Member" },
    authorStreak: streaks.get(authorId) ?? 0,
    postType: p.postType,
    content: p.content,
    snapshot: p.snapshot ?? null,
    createdAt: p.createdAt,
    likeCount: (p.likes ?? []).length,
    liked: (p.likes ?? []).some((l: any) => String(l) === me),
    commentCount: (p.comments ?? []).length,
    mine: authorId === me,
  };
}

// @route GET /api/social/feed?before=<iso>&limit=20&tz=<minutes>
// You and your friends, newest first. People you have blocked (or who blocked you) and hidden posts are left out.
export const getFeed = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user?.id;
    if (!me) return res.status(401).json({ error: "Unauthorized" });
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 20));
    const before = req.query.before ? new Date(String(req.query.before)) : null;
    const tz = clampTz(req.query.tz);

    const [friends, blocked] = await Promise.all([friendIdsOf(me), blockedWith(me)]);
    const authors = [me, ...friends.filter((f) => !blocked.has(f))];
    const query: Record<string, unknown> = { author: { $in: authors }, hidden: { $ne: true } };
    if (before && !Number.isNaN(before.getTime())) query.createdAt = { $lt: before };
    if (req.query.type && req.query.type !== "all" && (POST_TYPES as readonly string[]).includes(String(req.query.type))) query.postType = String(req.query.type);

    const rows = await SocialPost.find(query).populate("author", "displayName").sort({ createdAt: -1 }).limit(limit).lean();
    const streaks = await streaksFor([...new Set(rows.map((r: any) => String(r.author?._id ?? r.author)))], tz);
    const posts = await Promise.all(rows.map((r) => shapePost(r, me, streaks)));

    const dayKey = localDay(new Date(), tz);
    const posted = !!(await SocialPost.exists({ author: me, dayKey }));
    res.json({
      success: true,
      posts,
      nextBefore: rows.length === limit ? rows[rows.length - 1].createdAt : null,
      daily: { dayKey, prompt: promptFor(dayKey), posted },
    });
  } catch (error) {
    console.error("Error getting feed:", error);
    res.status(500).json({ success: false, message: "Could not load your feed." });
  }
};

/** A post can be seen, liked or commented on by its author and their friends, unless it is hidden or someone blocked someone. */
async function canSeePost(me: string, post: any): Promise<boolean> {
  if (!post || post.hidden) return false;
  const author = String(post.author?._id ?? post.author);
  if (author === me) return true;
  if ((await blockedWith(me)).has(author)) return false;
  return (await friendIdsOf(me)).includes(author);
}

export const likePost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const post = await SocialPost.findById(postId);

    if (!post || !(await canSeePost(userId, post))) {
      return res.status(404).json({ error: "Post not found" });
    }

    const likeIndex = post.likes.indexOf(new mongoose.Types.ObjectId(userId));

    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
    } else {
      // Like
      post.likes.push(new mongoose.Types.ObjectId(userId));
    }

    await post.save();

    res.json({
      success: true,
      liked: likeIndex === -1,
      likesCount: post.likes.length,
    });
  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ error: "Failed to like post" });
  }
};

export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;
    const { content } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!content) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    const post = await SocialPost.findById(postId);

    if (!post || !(await canSeePost(userId, post))) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = {
      author: new mongoose.Types.ObjectId(userId),
      content,
      createdAt: new Date(),
    };

    post.comments.push(comment);
    await post.save();

    // Populate comment author
    await post.populate("comments.author", "displayName");

    const newComment = post.comments[post.comments.length - 1];

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment: newComment,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
};

export const getPostComments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const post = await SocialPost.findById(postId)
      .populate("comments.author", "displayName")
      .select("author hidden comments");

    if (!post || !(await canSeePost(userId, post))) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comments = post.comments
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(
        (parseInt(page as string) - 1) * parseInt(limit as string),
        parseInt(page as string) * parseInt(limit as string),
      );

    res.json({
      success: true,
      comments,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: post.comments.length,
        pages: Math.ceil(post.comments.length / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error("Error getting post comments:", error);
    res.status(500).json({ error: "Failed to get post comments" });
  }
};

export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const post = await SocialPost.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.author.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this post" });
    }

    await SocialPost.findByIdAndDelete(postId);

    res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
};
