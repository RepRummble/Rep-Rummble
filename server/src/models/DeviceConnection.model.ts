import mongoose, { Document, Schema } from 'mongoose'

export const CLOUD_DEVICES = ['fitbit', 'whoop', 'oura'] as const
export const PHONE_DEVICES = ['apple_watch', 'galaxy_watch'] as const
export const DEVICE_PROVIDERS = [...PHONE_DEVICES, ...CLOUD_DEVICES] as const
export type DeviceProvider = (typeof DEVICE_PROVIDERS)[number]
export type CloudDevice = (typeof CLOUD_DEVICES)[number]
export type PhoneDevice = (typeof PHONE_DEVICES)[number]

export interface IDeviceConnection extends Document {
  userId: string
  provider: string
  kind: 'cloud' | 'phone'
  status: 'connected' | 'needs_reauth' | 'error'
  /** What the person sees: "WHOOP · Sam", "Dilip's Apple Watch". Never an email. */
  label: string
  externalUserId?: string
  /** Encrypted at rest (AES-256-GCM). Never sent to any client. */
  accessTokenEnc?: string
  refreshTokenEnc?: string
  expiresAt?: Date
  scope?: string
  connectedAt: Date
  lastSyncAt?: Date
  lastError?: string
}

const DeviceConnectionSchema = new Schema<IDeviceConnection>({
  userId: { type: String, required: true, index: true },
  provider: { type: String, enum: DEVICE_PROVIDERS, required: true },
  kind: { type: String, enum: ['cloud', 'phone'], required: true },
  status: { type: String, enum: ['connected', 'needs_reauth', 'error'], default: 'connected' },
  label: { type: String, default: '', maxlength: 80 },
  externalUserId: { type: String, maxlength: 120 },
  accessTokenEnc: { type: String, select: false },
  refreshTokenEnc: { type: String, select: false },
  expiresAt: Date,
  scope: { type: String, maxlength: 600 },
  connectedAt: { type: Date, default: Date.now },
  lastSyncAt: Date,
  lastError: { type: String, maxlength: 200 },
}, { timestamps: true })

// One connection per person per device type.
DeviceConnectionSchema.index({ userId: 1, provider: 1 }, { unique: true })

export const DeviceConnection = mongoose.model<IDeviceConnection>('DeviceConnection', DeviceConnectionSchema)
