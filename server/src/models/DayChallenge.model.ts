import mongoose, { Document, Schema } from 'mongoose'

/** A 30, 60 or 90 day challenge between friends. The days are fixed when it starts. */
export interface IDayChallenge extends Document {
  creator: mongoose.Types.ObjectId
  title: string
  days: number
  perWeek: number
  target: number
  startKey: string // YYYY-MM-DD, the creator's local day
  endKey: string
  createdAt: Date
}

const DayChallengeSchema = new Schema<IDayChallenge>({
  creator: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, maxlength: 60 },
  days: { type: Number, required: true, enum: [30, 60, 90] },
  perWeek: { type: Number, required: true, enum: [3, 5, 7] },
  target: { type: Number, required: true },
  startKey: { type: String, required: true },
  endKey: { type: String, required: true },
}, { timestamps: true })

export const DayChallenge = mongoose.model<IDayChallenge>('DayChallenge', DayChallengeSchema)

export interface IDayChallengeMember extends Document {
  challenge: mongoose.Types.ObjectId
  user: mongoose.Types.ObjectId
  /** The Supabase id: workouts are stored against it. */
  supabaseId?: string
  /** Their timezone (minutes, as JavaScript's getTimezoneOffset), so "a day" is their own day. */
  tz: number
  status: 'invited' | 'joined' | 'declined'
  invitedBy?: mongoose.Types.ObjectId
}

const MemberSchema = new Schema<IDayChallengeMember>({
  challenge: { type: Schema.Types.ObjectId, ref: 'DayChallenge', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  supabaseId: { type: String },
  tz: { type: Number, default: 0 },
  status: { type: String, enum: ['invited', 'joined', 'declined'], default: 'invited' },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })
MemberSchema.index({ challenge: 1, user: 1 }, { unique: true })
MemberSchema.index({ user: 1, status: 1 })

export const DayChallengeMember = mongoose.model<IDayChallengeMember>('DayChallengeMember', MemberSchema)
