import mongoose, { Document, Schema } from 'mongoose'

/** A status that disappears after 24 hours. It is a text card, or a card made from a real workout, meal or streak. */
export interface IStory extends Document {
  author: mongoose.Types.ObjectId
  kind: 'text' | 'workout' | 'meal' | 'streak'
  text: string
  theme: number
  snapshot?: Record<string, unknown>
  viewers: mongoose.Types.ObjectId[]
  hidden: boolean
  expiresAt: Date
  createdAt: Date
}

const StorySchema = new Schema<IStory>({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['text', 'workout', 'meal', 'streak'], default: 'text' },
  text: { type: String, trim: true, maxlength: 200, default: '' },
  theme: { type: Number, min: 0, max: 5, default: 0 },
  snapshot: { type: Schema.Types.Mixed },
  viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  hidden: { type: Boolean, default: false },
  // MongoDB removes the document itself once this time passes.
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, default: Date.now },
})

export const Story = mongoose.model<IStory>('Story', StorySchema)
