import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Friendship } from "../models/Friendship.model";
import { User } from "../models/User.model";
import { blockedWith, streaksFor } from "../services/social.service";

export const sendFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { friendId } = req.body;

    if (!userId || !friendId) {
      return res
        .status(400)
        .json({ error: "User ID and friend ID are required" });
    }

    if (userId === friendId) {
      return res
        .status(400)
        .json({ error: "Cannot send friend request to yourself" });
    }

    // Check if users exist
    const [user, friend] = await Promise.all([
      User.findById(userId),
      User.findById(friendId),
    ]);

    if (!user || !friend) {
      return res.status(404).json({ error: "User not found" });
    }

    if ((await blockedWith(userId)).has(friendId)) {
      return res.status(403).json({ error: "You cannot send a request to this person." });
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requester: userId, recipient: friendId },
        { requester: friendId, recipient: userId },
      ],
    });

    if (existingFriendship) {
      if (existingFriendship.status === "accepted") {
        return res.status(400).json({ error: "Users are already friends" });
      }
      if (existingFriendship.status === "pending") {
        return res.status(400).json({ error: "Friend request already sent" });
      }
    }

    // A request that was declined can be sent again.
    if (existingFriendship && existingFriendship.status === "declined") await Friendship.deleteOne({ _id: existingFriendship._id });

    // Create new friendship request
    const friendship = new Friendship({
      requester: userId,
      recipient: friendId,
      status: "pending",
    });

    await friendship.save();

    res.json({
      success: true,
      message: "Friend request sent successfully",
      friendship,
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ error: "Failed to send friend request" });
  }
};

export const acceptFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { friendshipId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    if (friendship.recipient !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to accept this request" });
    }

    if (friendship.status !== "pending") {
      return res.status(400).json({ error: "Request already processed" });
    }

    friendship.status = "accepted";
    await friendship.save();

    res.json({
      success: true,
      message: "Friend request accepted",
      friendship,
    });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ error: "Failed to accept friend request" });
  }
};

export const declineFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { friendshipId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    if (friendship.recipient !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to decline this request" });
    }

    friendship.status = "declined";
    await friendship.save();

    res.json({
      success: true,
      message: "Friend request declined",
      friendship,
    });
  } catch (error) {
    console.error("Error declining friend request:", error);
    res.status(500).json({ error: "Failed to decline friend request" });
  }
};

export const getFriends = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [rows, blocked] = await Promise.all([
      Friendship.find({ status: "accepted", $or: [{ requester: userId }, { recipient: userId }] }).lean(),
      blockedWith(userId),
    ]);
    const mine = rows
      .map((r) => ({ friendId: r.requester === userId ? r.recipient : r.requester, friendshipId: String(r._id) }))
      .filter((r) => !blocked.has(r.friendId));
    const ids = mine.map((m) => m.friendId);
    const [users, streaks] = await Promise.all([User.find({ _id: { $in: ids } }).select("displayName").lean(), streaksFor(ids)]);
    const nameOf = new Map(users.map((u) => [String(u._id), u.displayName || "Member"]));
    // Names only: other people's email addresses are never sent to the app.
    const friends = mine.map((m) => ({ id: m.friendId, displayName: nameOf.get(m.friendId) ?? "Member", friendshipId: m.friendshipId, streak: streaks.get(m.friendId) ?? 0 }));
    friends.sort((a, b) => a.displayName.localeCompare(b.displayName));
    res.json({ success: true, friends });
  } catch (error) {
    console.error("Error getting friends:", error);
    res.status(500).json({ error: "Failed to get friends" });
  }
};

export const getFriendRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [rows, blocked] = await Promise.all([
      Friendship.find({ status: "pending", $or: [{ recipient: userId }, { requester: userId }] }).sort({ createdAt: -1 }).lean(),
      blockedWith(userId),
    ]);
    const kept = rows.filter((r) => !blocked.has(r.requester === userId ? r.recipient : r.requester));
    const otherIds = kept.map((r) => (r.requester === userId ? r.recipient : r.requester));
    const names = new Map((await User.find({ _id: { $in: otherIds } }).select("displayName").lean()).map((u) => [String(u._id), u.displayName || "Member"]));
    const incoming = kept.filter((r) => r.recipient === userId).map((r) => ({ id: String(r._id), requester: { id: r.requester, displayName: names.get(r.requester) ?? "Member" }, createdAt: r.createdAt }));
    const sent = kept.filter((r) => r.requester === userId).map((r) => ({ id: String(r._id), recipient: { id: r.recipient, displayName: names.get(r.recipient) ?? "Member" }, createdAt: r.createdAt }));
    // `requests` stays the incoming list, as before.
    res.json({ success: true, requests: incoming, sent });
  } catch (error) {
    console.error("Error getting friend requests:", error);
    res.status(500).json({ error: "Failed to get friend requests" });
  }
};

export const removeFriend = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { friendshipId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Try finding by friendshipId first
    let friendship = await Friendship.findById(friendshipId);

    // If not found, try searching by friendId (friendshipId param could be the friend's user ID)
    if (!friendship) {
      friendship = await Friendship.findOne({
        $or: [
          { requester: userId, recipient: friendshipId, status: "accepted" },
          { requester: friendshipId, recipient: userId, status: "accepted" },
        ],
      });
    }

    if (!friendship) {
      return res.status(404).json({ error: "Friendship not found" });
    }

    if (
      friendship.requester.toString() !== userId.toString() &&
      friendship.recipient.toString() !== userId.toString()
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized to remove this friendship" });
    }

    await Friendship.findByIdAndDelete(friendship._id);

    res.json({
      success: true,
      message: "Friend removed successfully",
    });
  } catch (error) {
    console.error("Error removing friend:", error);
    res.status(500).json({ error: "Failed to remove friend" });
  }
};
