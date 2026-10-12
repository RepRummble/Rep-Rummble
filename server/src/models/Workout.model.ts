import mongoose, { Document, Schema } from 'mongoose'

export interface IWorkout extends Document {
  userId: string // Supabase user id (UUID)
  exercise: string
  duration: number
  calories?: number
  completed: boolean
  timestamp: Date
  createdAt: Date
  updatedAt: Date
}

const WorkoutSchema = new Schema<IWorkout>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  exercise: {
    type: String,
    required: [true, 'Exercise name is required'],
    trim: true
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute']
  },
  calories: {
    type: Number,
    min: 0
  },
  completed: {
    type: Boolean,
    default: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
})

// Compound index for user workouts by date
WorkoutSchema.index({ userId: 1, timestamp: -1 })

export const Workout = mongoose.model<IWorkout>('Workout', WorkoutSchema)
