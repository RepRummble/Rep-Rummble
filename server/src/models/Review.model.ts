import mongoose, { Document, Schema } from 'mongoose'

export interface IReview extends Document {
  name: string
  rating: number
  text: string
  source: 'web' | 'in-app' | 'google'
  approved: boolean
  userId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ReviewSchema = new Schema<IReview>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    source: { type: String, enum: ['web', 'in-app', 'google'], default: 'web' },
    approved: { type: Boolean, default: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

ReviewSchema.index({ approved: 1, createdAt: -1 })

export const Review = mongoose.model<IReview>('Review', ReviewSchema)
