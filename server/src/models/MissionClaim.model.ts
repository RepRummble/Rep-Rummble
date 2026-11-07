import mongoose, { Document, Schema } from 'mongoose'

/** One collected daily mission. The unique key means a mission pays out once per person per day, however many times it is asked. */
export interface IMissionClaim extends Document {
  userId: string // Supabase user id
  day: string // the person's local calendar day, YYYY-MM-DD
  missionId: string
  xp: number
  createdAt: Date
}

const MissionClaimSchema = new Schema<IMissionClaim>({
  userId: { type: String, required: true },
  day: { type: String, required: true },
  missionId: { type: String, required: true },
  xp: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now },
})
MissionClaimSchema.index({ userId: 1, day: 1, missionId: 1 }, { unique: true })

export const MissionClaim = mongoose.model<IMissionClaim>('MissionClaim', MissionClaimSchema)
