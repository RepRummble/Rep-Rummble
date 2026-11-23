import mongoose, { Document, Schema } from 'mongoose'

/** A Premium member's request for a custom nutrition plan, and the plan a coach wrote for it. */
export interface INutritionRequest extends Document {
  userId: string
  email?: string
  name?: string
  goal: string
  mealsPerDay: number
  dietPrefs: string
  allergies: string
  notes: string
  status: 'requested' | 'delivered' | 'declined'
  monthKey: string
  plan?: { calories: number; protein: number; carbs: number; fat: number; water: number; meals: { name: string; items: string }[]; notes: string }
  coachName?: string
  deliveredAt?: Date
  declineReason?: string
}

const NutritionRequestSchema = new Schema<INutritionRequest>({
  userId: { type: String, required: true, index: true },
  email: { type: String, maxlength: 200 },
  name: { type: String, maxlength: 80 },
  goal: { type: String, required: true, maxlength: 200 },
  mealsPerDay: { type: Number, min: 2, max: 8, default: 3 },
  dietPrefs: { type: String, default: '', maxlength: 400 },
  allergies: { type: String, default: '', maxlength: 400 },
  notes: { type: String, default: '', maxlength: 800 },
  status: { type: String, enum: ['requested', 'delivered', 'declined'], default: 'requested' },
  monthKey: { type: String, required: true },
  plan: {
    _id: false,
    calories: Number, protein: Number, carbs: Number, fat: Number, water: Number,
    meals: [{ _id: false, name: { type: String, maxlength: 40 }, items: { type: String, maxlength: 400 } }],
    notes: { type: String, maxlength: 1000 },
  },
  coachName: { type: String, maxlength: 80 },
  deliveredAt: Date,
  declineReason: { type: String, maxlength: 500 },
}, { timestamps: true })
NutritionRequestSchema.index({ status: 1, createdAt: 1 })

export const NutritionRequest = mongoose.model<INutritionRequest>('NutritionRequest', NutritionRequestSchema)
