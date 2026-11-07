import { Response } from 'express'
import { Workout } from '../models/Workout.model'
import { AuthRequest } from '../middleware/auth.middleware'
import { ApiError } from '../types'
import { isDBConnected } from '../config/database'

// @desc    Get all workouts for user
// @route   GET /api/workouts
// @access  Private
export const getWorkouts = async (req: AuthRequest, res: Response) => {
  try {
    const workouts = await Workout.find({ userId: req.user!.id })
      .sort({ timestamp: -1 })
      .limit(100)

    return res.json({
      success: true,
      count: workouts.length,
      data: workouts
    })
  } catch (error) {
    const err = error as ApiError
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    })
  }
}

// @desc    Create new workout
// @route   POST /api/workouts
// @access  Private
export const createWorkout = async (req: AuthRequest, res: Response) => {
  try {
    // Only these fields are taken from the request: a client cannot set anything else on the record.
    const { exercise, duration, calories, completed, timestamp, volume, sets } = req.body || {}
    const workoutData = {
      exercise, duration, calories, completed, volume, sets,
      ...(timestamp ? { timestamp } : {}),
      userId: req.user!.id
    }

    const workout = await Workout.create(workoutData)

    return res.status(201).json({
      success: true,
      data: workout
    })
  } catch (error) {
    if ((error as { name?: string }).name === 'ValidationError') {
      return res.status(400).json({ success: false, message: (error as Error).message })
    }
    const err = error as ApiError
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    })
  }
}

// @desc    Get single workout
// @route   GET /api/workouts/:id
// @access  Private
export const getWorkout = async (req: AuthRequest, res: Response) => {
  try {
    const workout = await Workout.findOne({
      _id: req.params.id,
      userId: req.user!.id
    })

    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found'
      })
    }

    return res.json({
      success: true,
      data: workout
    })
  } catch (error) {
    const err = error as ApiError
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    })
  }
}

// @desc    Delete workout
// @route   DELETE /api/workouts/:id
// @access  Private
export const deleteWorkout = async (req: AuthRequest, res: Response) => {
  try {
    const workout = await Workout.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!.id
    })

    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found'
      })
    }

    return res.json({
      success: true,
      data: {}
    })
  } catch (error) {
    const err = error as ApiError
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    })
  }
}

// @desc    Get workout stats for user
// @route   GET /api/workouts/stats
// @access  Private
export const getWorkoutStats = async (req: AuthRequest, res: Response) => {
  if (!isDBConnected()) {
    return res.json({
      success: true,
      data: {
        total: 0, thisWeek: 0, totalCalories: 0,
        avgDuration: 0, weeklyLoad: Array(7).fill(0), consistency: 0,
      },
    })
  }
  try {
    const userId = req.user!.id
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 6)
    weekStart.setHours(0, 0, 0, 0)

    const [total, thisWeek, recentWorkouts] = await Promise.all([
      Workout.countDocuments({ userId }),
      Workout.countDocuments({ userId, timestamp: { $gte: weekStart } }),
      Workout.find({ userId }).sort({ timestamp: -1 }).limit(7),
    ])

    const totalCalories = recentWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0)
    const avgDuration = recentWorkouts.length
      ? Math.round(recentWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0) / recentWorkouts.length)
      : 0

    // Build weekly load array (last 7 days)
    const weeklyLoad: number[] = Array(7).fill(0)
    recentWorkouts.forEach((w) => {
      const daysAgo = Math.floor((now.getTime() - new Date(w.timestamp).getTime()) / 86400000)
      if (daysAgo < 7) weeklyLoad[6 - daysAgo] += w.duration || 0
    })

    return res.json({
      success: true,
      data: {
        total,
        thisWeek,
        totalCalories,
        avgDuration,
        weeklyLoad,
        consistency: Math.min(100, Math.round((thisWeek / 5) * 100)),
      },
    })
  } catch (error) {
    const err = error as ApiError
    return res.status(500).json({ success: false, message: err.message || 'Server error' })
  }
}
