import mongoose, { Document, Schema } from 'mongoose'

/** One person has blocked another. Neither can then see the other's posts or stories, or message them. */
export interface IBlock extends Document { blocker: mongoose.Types.ObjectId; blocked: mongoose.Types.ObjectId; createdAt: Date }

const BlockSchema = new Schema<IBlock>({
  blocker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  blocked: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
})
BlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true })
BlockSchema.index({ blocked: 1 })

export const Block = mongoose.model<IBlock>('Block', BlockSchema)
