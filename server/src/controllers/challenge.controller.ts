import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth.middleware";
import { Challenge } from "../models/Challenge.model";
import { ChallengeParticipant } from "../models/ChallengeParticipant.model";
import { User } from "../models/User.model";

export const createChallenge = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      title,
      description,
      challengeType,
      targetValue,
      targetUnit,
      duration,
      isPublic,
      maxParticipants,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate required fields
    if (!title || !challengeType || !targetValue || !targetUnit || !duration) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + duration);

    const challenge = new Challenge({
      creator: userId,
      title,
      description,
      challengeType,
      targetValue,
      targetUnit,
      duration,
      startDate,
      endDate,
      isPublic: isPublic !== false,
      maxParticipants,
      participants: [userId], // Creator automatically joins
      status: "active",
    });

    await challenge.save();

    // Create participant record for creator
    const participant = new ChallengeParticipant({
      challenge: challenge._id,
      user: userId,
      targetProgress: targetValue,
    });

    await participant.save();

    res.status(201).json({
      success: true,
      message: "Challenge created successfully",
      challenge,
    });
  } catch (error) {
    console.error("Error creating challenge:", error);
    res.status(500).json({ error: "Failed to create challenge" });
  }
};

export const getChallenges = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { type, status = "active", page = 1, limit = 20, joined } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const query: any = { status };

    if (type && type !== "all") {
      query.challengeType = type;
    }

    let filterQuery: any = {};
    if (joined === "true") {
      // Only challenges where the user is a participant
      filterQuery = { participants: userId, ...query };
    } else if (joined === "false") {
      // Only public challenges where the user is NOT a participant
      filterQuery = {
        participants: { $ne: userId },
        isPublic: true,
        ...query,
      };
    } else {
      // Default: either joined, or public challenges not created by user
      filterQuery = {
        $or: [
          { participants: userId },
          { isPublic: true, creator: { $ne: userId } },
        ],
        ...query,
      };
    }

    const challenges = await Challenge.find(filterQuery)
      .populate("creator", "displayName")
      .populate("participants", "displayName")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .skip((parseInt(page as string) - 1) * parseInt(limit as string));

    const total = await Challenge.countDocuments(filterQuery);

    res.json({
      success: true,
      challenges,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error("Error getting challenges:", error);
    res.status(500).json({ error: "Failed to get challenges" });
  }
};

export const joinChallenge = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { challengeId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    if (challenge.status !== "active") {
      return res.status(400).json({ error: "Challenge is not active" });
    }

    if (challenge.participants.includes(userId)) {
      return res
        .status(400)
        .json({ error: "Already participating in this challenge" });
    }

    if (
      challenge.maxParticipants &&
      challenge.participants.length >= challenge.maxParticipants
    ) {
      return res.status(400).json({ error: "Challenge is full" });
    }

    // Check if user is already a participant
    const existingParticipant = await ChallengeParticipant.findOne({
      challenge: challengeId,
      user: userId,
    });

    if (existingParticipant) {
      return res
        .status(400)
        .json({ error: "Already participating in this challenge" });
    }

    // Add user to challenge
    challenge.participants.push(userId);
    await challenge.save();

    // Create participant record
    const participant = new ChallengeParticipant({
      challenge: challengeId,
      user: userId,
      targetProgress: challenge.targetValue,
    });

    await participant.save();

    res.json({
      success: true,
      message: "Successfully joined challenge",
      challenge,
      participant,
    });
  } catch (error) {
    console.error("Error joining challenge:", error);
    res.status(500).json({ error: "Failed to join challenge" });
  }
};

export const getChallengeProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { challengeId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const participant = await ChallengeParticipant.findOne({
      challenge: challengeId,
      user: userId,
    });

    if (!participant) {
      return res
        .status(404)
        .json({ error: "Not participating in this challenge" });
    }

    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    // Calculate progress based on challenge type
    let currentProgress = 0;

    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      switch (challenge.challengeType) {
        case "workout":
          // Count completed workouts in challenge period
          const workoutCount = await mongoose.connection.db
            .collection("workouts")
            .countDocuments({
              userId,
              completed: true,
              timestamp: {
                $gte: challenge.startDate,
                $lte: challenge.endDate,
              },
            });
          currentProgress = workoutCount;
          break;

        case "calories":
          // Sum calories burned in challenge period
          const caloriesResult = await mongoose.connection.db
            .collection("workouts")
            .aggregate([
              {
                $match: {
                  userId,
                  timestamp: {
                    $gte: challenge.startDate,
                    $lte: challenge.endDate,
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  totalCalories: { $sum: "$calories" },
                },
              },
            ])
            .toArray();
          currentProgress = caloriesResult[0]?.totalCalories || 0;
          break;

        case "steps":
          // Sum steps from wearable data
          const stepsResult = await mongoose.connection.db
            .collection("wearabledata")
            .aggregate([
              {
                $match: {
                  userId,
                  date: {
                    $gte: challenge.startDate.toISOString().split("T")[0],
                    $lte: challenge.endDate.toISOString().split("T")[0],
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  totalSteps: { $sum: "$steps" },
                },
              },
            ])
            .toArray();
          currentProgress = stepsResult[0]?.totalSteps || 0;
          break;

        default:
          currentProgress = participant.currentProgress;
      }
    } else {
      currentProgress = participant.currentProgress;
    }

    // Update participant progress
    participant.currentProgress = currentProgress;
    participant.lastUpdated = new Date();
    await participant.save();

    const progressPercentage = Math.min(
      (currentProgress / challenge.targetValue) * 100,
      100,
    );

    res.json({
      success: true,
      progress: {
        current: currentProgress,
        target: challenge.targetValue,
        percentage: progressPercentage,
        completed: currentProgress >= challenge.targetValue,
        challenge: {
          id: challenge._id,
          title: challenge.title,
          type: challenge.challengeType,
          unit: challenge.targetUnit,
          endDate: challenge.endDate,
        },
      },
    });
  } catch (error) {
    console.error("Error getting challenge progress:", error);
    res.status(500).json({ error: "Failed to get challenge progress" });
  }
};

export const getChallengeLeaderboard = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { challengeId } = req.params;

    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    const participants = await ChallengeParticipant.find({
      challenge: challengeId,
    })
      .populate("user", "displayName")
      .sort({ currentProgress: -1 });

    const leaderboard = participants.map((participant, index) => {
      const user = participant.user as any; // Type assertion for populated user
      return {
        rank: index + 1,
        user: {
          id: user._id,
          displayName: user.displayName || "Member",
        },
        progress: participant.currentProgress,
        target: participant.targetProgress,
        percentage: Math.min(
          (participant.currentProgress / participant.targetProgress) * 100,
          100,
        ),
        completed: participant.completed,
      };
    });

    res.json({
      success: true,
      challenge: {
        id: challenge._id,
        title: challenge.title,
        type: challenge.challengeType,
        unit: challenge.targetUnit,
      },
      leaderboard,
    });
  } catch (error) {
    console.error("Error getting challenge leaderboard:", error);
    res.status(500).json({ error: "Failed to get challenge leaderboard" });
  }
};
