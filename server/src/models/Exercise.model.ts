import mongoose, { Document, Schema } from 'mongoose'

// Body angle reference for pose detection
export interface IBodyAngle {
  joint: string
  minAngle: number
  maxAngle: number
  description: string
}

// Key pose points for each phase of the exercise
export interface IPoseKeypoint {
  phase: 'start' | 'middle' | 'end'
  bodyAngles: IBodyAngle[]
  description: string
}

// Exercise modifications
export interface IExerciseModification {
  easier: string
  harder: string
}

export interface IExercise extends Document {
  name: string
  slug: string
  category: 'strength' | 'cardio' | 'flexibility' | 'balance' | 'hiit' | 'core'
  muscleGroups: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  equipment: string[]

  // AI-Generated Content
  description: string
  instructions: string[]
  commonMistakes: string[]
  breathingPattern: string
  safetyTips: string[]
  benefits: string[]
  modifications: IExerciseModification

  // Pose Detection Reference
  poseKeypoints: IPoseKeypoint[]
  repCountMethod: 'angle_threshold' | 'position_threshold' | 'time_based'

  // Metrics
  caloriesPerMinute: number
  defaultDuration: number // seconds for time-based, reps for rep-based
  defaultSets: number
  defaultReps: number
  restBetweenSets: number // seconds

  // Media
  thumbnailUrl?: string
  videoUrl?: string
  animationData?: object

  // Metadata
  isAIGenerated: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const ExerciseSchema = new Schema<IExercise>({
  name: {
    type: String,
    required: [true, 'Exercise name is required'],
    trim: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  category: {
    type: String,
    required: true,
    enum: ['strength', 'cardio', 'flexibility', 'balance', 'hiit', 'core']
  },
  muscleGroups: [{
    type: String,
    enum: [
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
      'core', 'abs', 'obliques', 'lower_back',
      'glutes', 'quads', 'hamstrings', 'calves', 'hip_flexors',
      'full_body', 'cardio'
    ]
  }],
  difficulty: {
    type: String,
    required: true,
    enum: ['beginner', 'intermediate', 'advanced']
  },
  equipment: [{
    type: String,
    default: ['bodyweight']
  }],

  // AI-Generated Content
  description: {
    type: String,
    required: true
  },
  instructions: [{
    type: String,
    required: true
  }],
  commonMistakes: [String],
  breathingPattern: String,
  safetyTips: [String],
  benefits: [String],
  modifications: {
    easier: String,
    harder: String
  },

  // Pose Detection Reference
  poseKeypoints: [{
    phase: {
      type: String,
      enum: ['start', 'middle', 'end'],
      required: true
    },
    bodyAngles: [{
      joint: { type: String, required: true },
      minAngle: { type: Number, required: true },
      maxAngle: { type: Number, required: true },
      description: String
    }],
    description: String
  }],
  repCountMethod: {
    type: String,
    enum: ['angle_threshold', 'position_threshold', 'time_based'],
    default: 'angle_threshold'
  },

  // Metrics
  caloriesPerMinute: {
    type: Number,
    default: 5
  },
  defaultDuration: {
    type: Number,
    default: 30
  },
  defaultSets: {
    type: Number,
    default: 3
  },
  defaultReps: {
    type: Number,
    default: 10
  },
  restBetweenSets: {
    type: Number,
    default: 60
  },

  // Media
  thumbnailUrl: String,
  videoUrl: String,
  animationData: Schema.Types.Mixed,

  // Metadata
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Indexes
ExerciseSchema.index({ category: 1 })
ExerciseSchema.index({ difficulty: 1 })
ExerciseSchema.index({ muscleGroups: 1 })
ExerciseSchema.index({ name: 'text', description: 'text' })

// Generate the slug from the name. This runs before validation, because `slug` is required and
// validation happens before any pre('save') hook.
ExerciseSchema.pre('validate', function() {
  if (this.isModified('name') && this.name) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }
})

export const Exercise = mongoose.model<IExercise>('Exercise', ExerciseSchema)
