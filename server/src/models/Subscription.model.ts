import mongoose, { Document, Schema } from 'mongoose'
import type { PlanId } from '../config/billing'

export interface IPaymentMethodSummary {
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

// One row per person. A person with no row is on the Free plan.
// We never store card numbers: Stripe holds the card, and this is only the summary we display.
export interface ISubscription extends Document {
  userId: string
  plan: PlanId
  status: 'active' | 'trialing' | 'past_due'
  currentPeriodEnd?: Date
  trialEnd?: Date
  autoRenew: boolean
  /** A lower plan that starts when the current period ends (or 'free' when the plan is ending). */
  scheduledPlan?: PlanId | null
  scheduleId?: string | null
  trialUsed: boolean
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  paymentMethod?: IPaymentMethodSummary | null
}

const SubscriptionSchema = new Schema<ISubscription>({
  userId: { type: String, required: true, unique: true },
  plan: { type: String, enum: ['free', 'pro', 'premium'], default: 'free' },
  status: { type: String, enum: ['active', 'trialing', 'past_due'], default: 'active' },
  currentPeriodEnd: Date,
  trialEnd: Date,
  autoRenew: { type: Boolean, default: true },
  scheduledPlan: { type: String, enum: ['free', 'pro', 'premium', null], default: null },
  scheduleId: { type: String, default: null },
  trialUsed: { type: Boolean, default: false },
  stripeCustomerId: { type: String, index: true },
  stripeSubscriptionId: { type: String, index: true },
  paymentMethod: {
    type: new Schema({ brand: String, last4: String, expMonth: Number, expYear: Number }, { _id: false }),
    default: null,
  },
}, { timestamps: true })

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema)
