import mongoose, { Document, Schema } from 'mongoose'

/** A Premium member's 1-on-1 check-in with a coach. Two a month. */
export interface ICheckIn extends Document {
  userId: string
  email?: string
  name?: string
  topic: string
  preferredTimes: string
  status: 'requested' | 'scheduled' | 'done' | 'cancelled' | 'declined'
  monthKey: string
  /** Whether it uses one of the month's two. A request cancelled before it was scheduled, or declined, does not. */
  counts: boolean
  scheduledFor?: Date
  meetingLink?: string
  coachName?: string
  summary?: string
  actionItems: string[]
  declineReason?: string
}

const CheckInSchema = new Schema<ICheckIn>({
  userId: { type: String, required: true, index: true },
  email: { type: String, maxlength: 200 },
  name: { type: String, maxlength: 80 },
  topic: { type: String, required: true, maxlength: 600 },
  preferredTimes: { type: String, default: '', maxlength: 300 },
  status: { type: String, enum: ['requested', 'scheduled', 'done', 'cancelled', 'declined'], default: 'requested' },
  monthKey: { type: String, required: true },
  counts: { type: Boolean, default: true },
  scheduledFor: Date,
  meetingLink: { type: String, maxlength: 300 },
  coachName: { type: String, maxlength: 80 },
  summary: { type: String, maxlength: 3000 },
  actionItems: [{ type: String, maxlength: 300 }],
  declineReason: { type: String, maxlength: 500 },
}, { timestamps: true })
CheckInSchema.index({ userId: 1, monthKey: 1 })
CheckInSchema.index({ status: 1, createdAt: 1 })

export const CheckIn = mongoose.model<ICheckIn>('CheckIn', CheckInSchema)
