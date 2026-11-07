import mongoose, { Document, Schema } from 'mongoose'

/** One device's numbers for one calendar day. Only what the device really reported is stored; a missing field means "no reading". */
export interface IDeviceReading extends Document {
  userId: string
  provider: string
  date: string // YYYY-MM-DD, the person's local day
  steps?: number
  activeCalories?: number
  sleepHours?: number
  restingHR?: number
  hrv?: number
  /** 0-100. WHOOP recovery, or Oura readiness. */
  recovery?: number
  /** 0-21. WHOOP strain. */
  strain?: number
  /** 0-100. Oura sleep score, or WHOOP sleep performance. */
  sleepScore?: number
  syncedAt: Date
}

const num = (max: number) => ({ type: Number, min: 0, max })
const DeviceReadingSchema = new Schema<IDeviceReading>({
  userId: { type: String, required: true },
  provider: { type: String, required: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  steps: num(500_000), activeCalories: num(50_000), sleepHours: num(24), restingHR: num(250), hrv: num(1000),
  recovery: num(100), strain: num(21), sleepScore: num(100),
  syncedAt: { type: Date, default: Date.now },
}, { timestamps: true })

DeviceReadingSchema.index({ userId: 1, provider: 1, date: 1 }, { unique: true })
DeviceReadingSchema.index({ userId: 1, date: -1 })

export const DeviceReading = mongoose.model<IDeviceReading>('DeviceReading', DeviceReadingSchema)
