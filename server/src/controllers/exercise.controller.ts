import { Request, Response } from 'express'
import { Exercise } from '../models/Exercise.model'
import { WorkoutPlan } from '../models/WorkoutPlan.model'
import { WorkoutSession } from '../models/WorkoutSession.model'
import { seedExercises } from '../services/exercise.service'
import { analyzeForm, generateFormFeedback } from '../services/pose.service'

/**
 * @route   GET /api/exercises
 * @desc    Get all exercises with optional filters
 * @access  Private
 */
export const getExercises = async (req: Request, res: Response) => {
  try {
    const { category, difficulty, muscleGroup, equipment, search } = req.query

    const filter: any = { isActive: true }

    if (category) filter.category = category
    if (difficulty) filter.difficulty = difficulty
    if (muscleGroup) filter.muscleGroups = { $in: [muscleGroup] }
    if (equipment) filter.equipment = { $in: [equipment] }
    if (search) {
      filter.$text = { $search: search as string }
    }

    const exercises = await Exercise.find(filter)
      .select('-poseKeypoints -animationData')
      .sort({ name: 1 })

    res.status(200).json({
      success: true,
      count: exercises.length,
      data: exercises
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch exercises'
    })
  }
}

/**
 * @route   GET /api/exercises/:id
 * @desc    Get single exercise with full details
 * @access  Private
 */
export const getExercise = async (req: Request, res: Response) => {
  try {
    const exercise = await Exercise.findById(req.params.id)

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found'
      })
    }

    return res.status(200).json({
      success: true,
      data: exercise
    })
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch exercise'
    })
  }
}

export const NOT_AVAILABLE = (_req: Request, res: Response) =>
  res.status(501).json({ success: false, code: 'not_available', message: 'Automatic plan and exercise generation is not available yet.' })

/**
 * @route   POST /api/exercises/seed
 * @desc    Seed default exercises into database
 * @access  Private (Admin)
 */
export const seedDefaultExercises = async (_req: Request, res: Response) => {
  try {
    await seedExercises()

    const count = await Exercise.countDocuments()

    res.status(200).json({
      success: true,
      message: `Database seeded with exercises`,
      count
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to seed exercises'
    })
  }
}

/**
 * @route   GET /api/workout-plans
 * @desc    Get user's workout plans
 * @access  Private
 */
export const getWorkoutPlans = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id

    const plans = await WorkoutPlan.find({ userId })
      .select('-schedule.exercises.repsAnalysis')
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch workout plans'
    })
  }
}

/**
 * @route   GET /api/workout-plans/:id
 * @desc    Get single workout plan with full details
 * @access  Private
 */
export const getWorkoutPlan = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id
    const plan = await WorkoutPlan.findOne({
      _id: req.params.id,
      userId
    })

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Workout plan not found'
      })
    }

    return res.status(200).json({
      success: true,
      data: plan
    })
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch workout plan'
    })
  }
}

export const generateWorkoutPlanController = NOT_AVAILABLE

/**
 * @route   DELETE /api/workout-plans/:id
 * @desc    Delete a workout plan
 * @access  Private
 */
export const deleteWorkoutPlan = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id
    const plan = await WorkoutPlan.findOneAndDelete({
      _id: req.params.id,
      userId
    })

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Workout plan not found'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Workout plan deleted'
    })
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete workout plan'
    })
  }
}

/**
 * @route   POST /api/workout-sessions
 * @desc    Start a new workout session
 * @access  Private
 */
export const startWorkoutSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id
    const { workoutPlanId, name, exercises } = req.body

    const session = new WorkoutSession({
      userId,
      workoutPlanId,
      name: name || 'Quick Workout',
      type: workoutPlanId ? 'planned' : 'quick',
      exercises: exercises || [],
      status: 'in_progress',
      startTime: new Date()
    })

    await session.save()

    res.status(201).json({
      success: true,
      data: session
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to start workout session'
    })
  }
}

/**
 * @route   PUT /api/workout-sessions/:id
 * @desc    Update workout session (add exercise, complete session)
 * @access  Private
 */
export const updateWorkoutSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id
    const { exercises, status, userNotes } = req.body

    const session = await WorkoutSession.findOne({
      _id: req.params.id,
      userId
    })

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Workout session not found'
      })
    }

    if (exercises) {
      session.exercises = exercises
    }

    if (status) {
      session.status = status
      if (status === 'completed') {
        session.endTime = new Date()
        session.totalDuration = Math.round(
          (session.endTime.getTime() - session.startTime.getTime()) / 60000
        )
      }
    }

    if (userNotes) {
      session.userNotes = userNotes
    }

    await session.save()

    return res.status(200).json({
      success: true,
      data: session
    })
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update workout session'
    })
  }
}

/**
 * @route   GET /api/workout-sessions
 * @desc    Get user's workout session history
 * @access  Private
 */
export const getWorkoutSessions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id
    const { status, limit = 20 } = req.query

    const filter: any = { userId }
    if (status) filter.status = status

    const sessions = await WorkoutSession.find(filter)
      .select('-exercises.repsAnalysis')
      .sort({ startTime: -1 })
      .limit(Number(limit))

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch workout sessions'
    })
  }
}

/**
 * @route   POST /api/exercises/analyze-form
 * @desc    Analyze exercise form from pose keypoints
 * @access  Private
 */
export const analyzeExerciseForm = async (req: Request, res: Response) => {
  try {
    const { exerciseSlug, keypoints, phase } = req.body

    if (!exerciseSlug || !keypoints) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: exerciseSlug, keypoints'
      })
    }

    const analysis = analyzeForm(exerciseSlug, keypoints, phase || 'middle')

    return res.status(200).json({
      success: true,
      data: analysis
    })
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to analyze form'
    })
  }
}

/**
 * @route   POST /api/exercises/form-feedback
 * @desc    Generate form feedback summary from multiple rep analyses
 * @access  Private
 */
export const getFormFeedback = async (req: Request, res: Response) => {
  try {
    const { analyses } = req.body

    if (!analyses || !Array.isArray(analyses)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: analyses (array)'
      })
    }

    const feedback = generateFormFeedback(analyses)

    return res.status(200).json({
      success: true,
      data: feedback
    })
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate feedback'
    })
  }
}
