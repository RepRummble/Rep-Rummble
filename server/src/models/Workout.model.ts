import mongoose, { Document, Schema } from 'mongoose'

export interface IWorkout extends Document {
  userId: string // Supabase user id (UUID)
  exercise: string
  duration: number
  calories?: number
  completed: boolean
  /** Total weight lifted in kilograms (sets × reps × weight), when the workout was logged with the guided player. */
  volume?: number
  /** Every set that was logged: what was lifted, for how many reps. Used for personal records. */
  sets?: { exercise: string; reps: number; weight: number }[]
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
  volume: { type: Number, min: 0, max: 1_000_000 },
  sets: {
    type: [{ _id: false, exercise: { type: String, required: true, maxlength: 60 }, reps: { type: Number, required: true, min: 1, max: 200 }, weight: { type: Number, required: true, min: 0, max: 1000 } }],
    default: undefined,
    validate: { validator: (v: unknown[]) => v.length <= 200, message: 'Too many sets in one workout.' }
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
