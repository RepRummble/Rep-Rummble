import mongoose, { Document, Schema } from 'mongoose'

// Exercise within a workout day
export interface IWorkoutExercise {
  exerciseId: mongoose.Types.ObjectId
  exerciseName: string
  sets: number
  reps: number | 'to_failure' | 'max'
  duration?: number // seconds for time-based exercises
  restSeconds: number
  notes?: string
  order: number
}

// Daily workout schedule
export interface IWorkoutDay {
  day: number // 1-7 for week, or day number in plan
  name: string // "Push Day", "Leg Day", etc.
  focus: string
  exercises: IWorkoutExercise[]
  estimatedDuration: number // minutes
  estimatedCalories: number
  isRestDay: boolean
}

// Weekly progression adjustments
export interface IProgression {
  week: number
  adjustments: string[]
  intensityMultiplier: number
}

export interface IWorkoutPlan extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  description: string

  // Plan Configuration
  goal: 'weight_loss' | 'muscle_gain' | 'endurance' | 'flexibility' | 'general_fitness' | 'strength'
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  durationWeeks: number
  daysPerWeek: number
  minutesPerWorkout: number

  // Equipment available
  availableEquipment: string[]

  // Schedule
  schedule: IWorkoutDay[]

  // Progressions
  progressions: IProgression[]

  // AI Generation metadata
  isAIGenerated: boolean
  aiPrompt?: string

  // User progress tracking
  currentWeek: number
  currentDay: number
  completedWorkouts: number
  totalWorkouts: number

  // Status
  isActive: boolean
  startDate?: Date
  endDate?: Date

  createdAt: Date
  updatedAt: Date
}

const WorkoutPlanSchema = new Schema<IWorkoutPlan>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },

  // Plan Configuration
  goal: {
    type: String,
    required: true,
    enum: ['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness', 'strength']
  },
  fitnessLevel: {
    type: String,
    required: true,
    enum: ['beginner', 'intermediate', 'advanced']
  },
  durationWeeks: {
    type: Number,
    required: true,
    min: 1,
    max: 52,
    default: 4
  },
  daysPerWeek: {
    type: Number,
    required: true,
    min: 1,
    max: 7,
    default: 3
  },
  minutesPerWorkout: {
    type: Number,
    default: 45,
    min: 10,
    max: 120
  },

  // Equipment
  availableEquipment: [{
    type: String,
    default: ['bodyweight']
  }],

  // Schedule
  schedule: [{
    day: { type: Number, required: true },
    name: { type: String, required: true },
    focus: { type: String, required: true },
    exercises: [{
      exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise' },
      exerciseName: { type: String, required: true },
      sets: { type: Number, required: true },
      reps: { type: Schema.Types.Mixed, required: true }, // number or string like 'to_failure'
      duration: Number,
      restSeconds: { type: Number, default: 60 },
      notes: String,
      order: { type: Number, required: true }
    }],
    estimatedDuration: { type: Number, default: 45 },
    estimatedCalories: { type: Number, default: 200 },
    isRestDay: { type: Boolean, default: false }
  }],

  // Progressions
  progressions: [{
    week: { type: Number, required: true },
    adjustments: [String],
    intensityMultiplier: { type: Number, default: 1.0 }
  }],

  // AI metadata
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  aiPrompt: String,

  // Progress tracking
  currentWeek: {
    type: Number,
    default: 1
  },
  currentDay: {
    type: Number,
    default: 1
  },
  completedWorkouts: {
    type: Number,
    default: 0
  },
  totalWorkouts: {
    type: Number,
    default: 0
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: Date,
  endDate: Date
}, {
  timestamps: true
})

// Indexes
WorkoutPlanSchema.index({ userId: 1, isActive: 1 })
WorkoutPlanSchema.index({ goal: 1, fitnessLevel: 1 })

// Calculate total workouts before saving
WorkoutPlanSchema.pre('save', function() {
  if (this.schedule) {
    const workoutDays = this.schedule.filter(day => !day.isRestDay).length
    this.totalWorkouts = workoutDays * this.durationWeeks
  }
})

export const WorkoutPlan = mongoose.model<IWorkoutPlan>('WorkoutPlan', WorkoutPlanSchema)
