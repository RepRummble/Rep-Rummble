import mongoose, { Document, Schema } from 'mongoose'

export interface IRoutineExercise {
  name: string
  muscle?: string
  sets: number
  reps: number
  /** 'sec' for holds such as planks: the number is then seconds. */
  unit: 'reps' | 'sec'
  restSec: number
  tip?: string
}

/** A workout the person has saved to their own plan. Optionally scheduled on weekdays (0 = Sunday ... 6 = Saturday). */
export interface IRoutine extends Document {
  userId: string
  name: string
  focus?: string
  exercises: IRoutineExercise[]
  weekdays: number[]
  source: 'coach' | 'template' | 'manual'
}

const RoutineSchema = new Schema<IRoutine>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true, maxlength: 60 },
  focus: { type: String, maxlength: 80 },
  exercises: [{
    _id: false,
    name: { type: String, required: true, maxlength: 60 },
    muscle: { type: String, maxlength: 30 },
    sets: { type: Number, min: 1, max: 10, default: 3 },
    reps: { type: Number, min: 1, max: 300, default: 10 },
    unit: { type: String, enum: ['reps', 'sec'], default: 'reps' },
    restSec: { type: Number, min: 0, max: 600, default: 60 },
    tip: { type: String, maxlength: 160 },
  }],
  weekdays: [{ type: Number, min: 0, max: 6 }],
  source: { type: String, enum: ['coach', 'template', 'manual'], default: 'manual' },
}, { timestamps: true })

export const Routine = mongoose.model<IRoutine>('Routine', RoutineSchema)
