import mongoose, { Document, Schema } from 'mongoose'

export interface IAIContext {
  messageCount: number
  failedAttempts: number
  topics: string[]
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated'
}

export interface ISupportConversation extends Document {
  userId?: mongoose.Types.ObjectId
  userEmail?: string
  userName?: string
  sessionId: string
  status: 'active' | 'waiting_agent' | 'with_agent' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  /** Premium members get priority support: their conversations are answered first. */
  premium?: boolean
  category?: 'billing' | 'technical' | 'account' | 'general' | 'feedback'
  assignedAgentId?: mongoose.Types.ObjectId
  assignedAt?: Date
  escalatedFromAI: boolean
  escalationReason?: string
  escalationTimestamp?: Date
  aiContext: IAIContext
  platform: 'web' | 'ios' | 'android'
  userAgent?: string
  lastActivityAt: Date
  closedAt?: Date
  satisfactionRating?: 1 | 2 | 3 | 4 | 5
  feedbackComment?: string
  createdAt: Date
  updatedAt: Date
}

const AIContextSchema = new Schema<IAIContext>({
  messageCount: { type: Number, default: 0 },
  failedAttempts: { type: Number, default: 0 },
  topics: [{ type: String }],
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative', 'frustrated'],
    default: 'neutral'
  }
}, { _id: false })

const SupportConversationSchema = new Schema<ISupportConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userEmail: { type: String, trim: true, lowercase: true },
    userName: { type: String, trim: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['active', 'waiting_agent', 'with_agent', 'resolved', 'closed'],
      default: 'active',
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    category: {
      type: String,
      enum: ['billing', 'technical', 'account', 'general', 'feedback']
    },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: 'SupportAgent' },
    assignedAt: { type: Date },
    escalatedFromAI: { type: Boolean, default: false },
    escalationReason: { type: String },
    escalationTimestamp: { type: Date },
    aiContext: { type: AIContextSchema, default: () => ({}) },
    platform: {
      type: String,
      enum: ['web', 'ios', 'android'],
      required: true
    },
    userAgent: { type: String },
    lastActivityAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    satisfactionRating: { type: Number, min: 1, max: 5 },
    feedbackComment: { type: String }
  },
  {
    timestamps: true
  }
)

// Index for finding conversations waiting for agents
SupportConversationSchema.index({ status: 1, priority: -1, createdAt: 1 })
SupportConversationSchema.add({ premium: { type: Boolean, default: false } })

// Index for finding user's conversations
SupportConversationSchema.index({ userId: 1, createdAt: -1 })

export const SupportConversation = mongoose.model<ISupportConversation>(
  'SupportConversation',
  SupportConversationSchema
)
