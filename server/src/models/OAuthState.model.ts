import mongoose, { Document, Schema } from 'mongoose'

/** A one-time "state" value handed to a provider's sign-in page and checked when the provider sends the person back. */
export interface IOAuthState extends Document {
  state: string
  userId: string
  provider: string
  expiresAt: Date
}

const OAuthStateSchema = new Schema<IOAuthState>({
  state: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  provider: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // removed by Mongo once expired
})

export const OAuthState = mongoose.model<IOAuthState>('OAuthState', OAuthStateSchema)
