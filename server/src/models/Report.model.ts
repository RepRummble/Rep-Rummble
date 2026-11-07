import mongoose, { Document, Schema } from 'mongoose'

export const REPORT_REASONS = ['spam', 'harassment', 'inappropriate', 'self_harm', 'impersonation', 'other'] as const
export const REPORT_TARGETS = ['post', 'comment', 'story', 'message', 'user'] as const

/** A report of something in the community. The wording is copied at the time, so it is kept even if the original is deleted. */
export interface IReport extends Document {
  reporter: mongoose.Types.ObjectId
  targetType: (typeof REPORT_TARGETS)[number]
  targetId: string
  targetUser?: mongoose.Types.ObjectId
  reason: (typeof REPORT_REASONS)[number]
  details?: string
  snippet?: string
  status: 'open' | 'reviewed' | 'actioned'
  createdAt: Date
}

const ReportSchema = new Schema<IReport>({
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: REPORT_TARGETS, required: true },
  targetId: { type: String, required: true, maxlength: 80 },
  targetUser: { type: Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String, enum: REPORT_REASONS, required: true },
  details: { type: String, maxlength: 500 },
  snippet: { type: String, maxlength: 300 },
  status: { type: String, enum: ['open', 'reviewed', 'actioned'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
})
// One report per person per thing: reporting twice changes nothing.
ReportSchema.index({ reporter: 1, targetType: 1, targetId: 1 }, { unique: true })
ReportSchema.index({ targetType: 1, targetId: 1 })
ReportSchema.index({ status: 1, createdAt: -1 })

export const Report = mongoose.model<IReport>('Report', ReportSchema)
