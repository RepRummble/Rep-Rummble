import mongoose, { Document, Schema } from 'mongoose'

// One shareable code per user (created the first time they open the referral page).
export interface IReferralProfile extends Document {
  userId: string
  code: string
}

const ReferralProfileSchema = new Schema<IReferralProfile>({
  userId: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true, uppercase: true },
}, { timestamps: true })

// A person can be referred only once, so the unique referredId also blocks double-claim races.
export interface IReferral extends Document {
  referrerId: string
  referredId: string
  code: string
  referrerRewarded: boolean
  createdAt: Date
}

const ReferralSchema = new Schema<IReferral>({
  referrerId: { type: String, required: true, index: true },
  referredId: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  referrerRewarded: { type: Boolean, default: true },
}, { timestamps: true })

// A discount earned toward a future subscription. `usedAt` is set when checkout applies it.
export interface IReferralCredit extends Document {
  userId: string
  percent: number
  reason: 'referred' | 'referral'
  usedAt?: Date
  createdAt: Date
}

const ReferralCreditSchema = new Schema<IReferralCredit>({
  userId: { type: String, required: true, index: true },
  percent: { type: Number, required: true, min: 1, max: 100 },
  reason: { type: String, enum: ['referred', 'referral'], required: true },
  usedAt: { type: Date },
}, { timestamps: true })

export const ReferralProfile = mongoose.model<IReferralProfile>('ReferralProfile', ReferralProfileSchema)
export const Referral = mongoose.model<IReferral>('Referral', ReferralSchema)
export const ReferralCredit = mongoose.model<IReferralCredit>('ReferralCredit', ReferralCreditSchema)
