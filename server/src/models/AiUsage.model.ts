import mongoose, { Document, Schema } from 'mongoose'

/** How many AI calls one person has made today, per kind. One row per person per UTC day. */
export interface IAiUsage extends Document {
  userId: string
  day: string
  counts: Record<string, number>
  createdAt: Date
}

const AiUsageSchema = new Schema<IAiUsage>({
  userId: { type: String, required: true },
  day: { type: String, required: true },
  counts: { type: Schema.Types.Mixed, default: {} },
  // Old rows clean themselves up after three days.
  createdAt: { type: Date, default: Date.now, expires: 3 * 24 * 3600 },
})
AiUsageSchema.index({ userId: 1, day: 1 }, { unique: true })

export const AiUsage = mongoose.model<IAiUsage>('AiUsage', AiUsageSchema)
