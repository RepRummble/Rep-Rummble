import mongoose, { Document, Schema } from 'mongoose'

export interface IDirectMessage extends Document { from: mongoose.Types.ObjectId; to: mongoose.Types.ObjectId; text: string; readAt?: Date; createdAt: Date }

const DirectMessageSchema = new Schema<IDirectMessage>({
  from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  readAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
})
DirectMessageSchema.index({ from: 1, to: 1, createdAt: -1 })
DirectMessageSchema.index({ to: 1, readAt: 1 })

export const DirectMessage = mongoose.model<IDirectMessage>('DirectMessage', DirectMessageSchema)
