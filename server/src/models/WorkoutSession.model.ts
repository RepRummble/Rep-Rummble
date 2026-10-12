import mongoose, { Document, Schema } from 'mongoose'

// Form issue detected during exercise
export interface IFormIssue {
  bodyPart: string
  issue: string
  severity: 'minor' | 'moderate' | 'severe'
  correction: string
  timestamp: number // milliseconds into the rep
}

// Per-rep analysis from pose detection
export interface IRepAnalysis {
  repNumber: number
  formScore: number // 0-100
  issues: IFormIssue[]
  jointAngles: {
    joint: string
    angle: number
    targetMin: number
    targetMax: number
    inRange: boolean
  }[]
  rangeOfMotion: number // percentage of ideal ROM
  tempo: {
    eccentric: number // seconds
    concentric: number
    isControlled: boolean
  }
  timestamp: Date
}

// Exercise within a session
export interface ISessionExercise {
  exerciseId: mongoose.Types.ObjectId
  exerciseName: string
  targetSets: number
  targetReps: number
  completedSets: number
  completedReps: number

  // Pose detection data
  repsAnalysis: IRepAnalysis[]
  averageFormScore: number
  totalReps: number
  goodReps: number
  improvementTips: string[]

  // Timing
  startTime: Date
  endTime?: Date
  totalDuration: number // seconds

  // Was pose detection used?
  usedPoseDetection: boolean
}

export interface IWorkoutSession extends Document {
  userId: mongoose.Types.ObjectId
  workoutPlanId?: mongoose.Types.ObjectId

  // Session info
  name: string
  type: 'planned' | 'quick' | 'custom'

  // Exercises completed
  exercises: ISessionExercise[]

  // Overall metrics
  overallFormScore: number
  totalDuration: number // minutes
  caloriesBurned: number
  totalReps: number
  totalSets: number

  // Achievements earned this session
  achievements: string[]
  xpEarned: number

  // Session status
  status: 'in_progress' | 'completed' | 'abandoned'
  startTime: Date
  endTime?: Date

  // Notes
  userNotes?: string
  aiSummary?: string

  createdAt: Date
  updatedAt: Date
}

const WorkoutSessionSchema = new Schema<IWorkoutSession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  workoutPlanId: {
    type: Schema.Types.ObjectId,
    ref: 'WorkoutPlan'
  },

  name: {
    type: String,
    required: true,
    default: 'Quick Workout'
  },
  type: {
    type: String,
    enum: ['planned', 'quick', 'custom'],
    default: 'quick'
  },

  exercises: [{
    exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise' },
    exerciseName: { type: String, required: true },
    targetSets: { type: Number, default: 3 },
    targetReps: { type: Number, default: 10 },
    completedSets: { type: Number, default: 0 },
    completedReps: { type: Number, default: 0 },

    repsAnalysis: [{
      repNumber: Number,
      formScore: Number,
      issues: [{
        bodyPart: String,
        issue: String,
        severity: {
          type: String,
          enum: ['minor', 'moderate', 'severe']
        },
        correction: String,
        timestamp: Number
      }],
      jointAngles: [{
        joint: String,
        angle: Number,
        targetMin: Number,
        targetMax: Number,
        inRange: Boolean
      }],
      rangeOfMotion: Number,
      tempo: {
        eccentric: Number,
        concentric: Number,
        isControlled: Boolean
      },
      timestamp: Date
    }],
    averageFormScore: { type: Number, default: 0 },
    totalReps: { type: Number, default: 0 },
    goodReps: { type: Number, default: 0 },
    improvementTips: [String],

    startTime: Date,
    endTime: Date,
    totalDuration: { type: Number, default: 0 },
    usedPoseDetection: { type: Boolean, default: false }
  }],

  // Overall metrics
  overallFormScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  totalDuration: {
    type: Number,
    default: 0
  },
  caloriesBurned: {
    type: Number,
    default: 0
  },
  totalReps: {
    type: Number,
    default: 0
  },
  totalSets: {
    type: Number,
    default: 0
  },

  // Achievements
  achievements: [String],
  xpEarned: {
    type: Number,
    default: 0
  },

  // Status
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,

  // Notes
  userNotes: String,
  aiSummary: String
}, {
  timestamps: true
})

// Indexes
WorkoutSessionSchema.index({ userId: 1, startTime: -1 })
WorkoutSessionSchema.index({ userId: 1, status: 1 })

// Calculate metrics before saving
WorkoutSessionSchema.pre('save', function() {
  if (this.exercises && this.exercises.length > 0) {
    // Calculate totals
    this.totalReps = this.exercises.reduce((sum, ex) => sum + ex.completedReps, 0)
    this.totalSets = this.exercises.reduce((sum, ex) => sum + ex.completedSets, 0)

    // Calculate average form score
    const exercisesWithScores = this.exercises.filter(ex => ex.averageFormScore > 0)
    if (exercisesWithScores.length > 0) {
      this.overallFormScore = Math.round(
        exercisesWithScores.reduce((sum, ex) => sum + ex.averageFormScore, 0) / exercisesWithScores.length
      )
    }

    // Calculate XP (10 per exercise + bonus for good form)
    this.xpEarned = this.exercises.length * 10
    if (this.overallFormScore >= 80) {
      this.xpEarned += 20 // Perfect form bonus
    } else if (this.overallFormScore >= 60) {
      this.xpEarned += 10 // Good form bonus
    }
  }
})

export const WorkoutSession = mongoose.model<IWorkoutSession>('WorkoutSession', WorkoutSessionSchema)
