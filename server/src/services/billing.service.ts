import type Stripe from 'stripe'
import { PLANS, PLAN_RANK, PlanId, TRIAL_DAYS, isBillingConfigured, planForPrice, priceIdFor, stripeSettings } from '../config/billing'
import { ISubscription, Subscription } from '../models/Subscription.model'
import { Business, BusinessMember } from '../models/Business.model'
import { getAvailableDiscountPercent, markDiscountUsed } from './referral.service'
import { getStripe } from './stripe-client'

/** An expected problem with a billing request, with a message that is safe to show the person. */
export class BillingError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message)
  }
}

const stripe = (): Stripe => {
  if (!isBillingConfigured()) throw new BillingError('billing_unavailable', 'Online billing is not available yet. Please check back soon.', 503)
  return getStripe()
}

const dateFromUnix = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000) : undefined)

/** Stripe now reports the billing period on each subscription item (older versions: on the subscription). */
function periodEnd(sub: Stripe.Subscription): Date | undefined {
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined
  return dateFromUnix(item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end)
}

async function getDoc(userId: string): Promise<ISubscription | null> {
  return Subscription.findOne({ userId: { $eq: userId } })
}

async function ensureDoc(userId: string): Promise<ISubscription> {
  const doc = await Subscription.findOneAndUpdate({ userId: { $eq: userId } }, { $setOnInsert: { userId, plan: 'free' } }, { upsert: true, new: true })
  return doc as ISubscription
}

// ── keeping our record in step with Stripe ───────────────────────────────────────────
export function applyStripeSubscription(doc: ISubscription, sub: Stripe.Subscription): void {
  const plan = planForPrice(sub.items?.data?.[0]?.price?.id)
  const ended = sub.status === 'canceled' || sub.status === 'incomplete_expired' || !plan
  if (ended) {
    doc.plan = 'free'
    doc.status = 'active'
    doc.currentPeriodEnd = undefined
    doc.trialEnd = undefined
    doc.autoRenew = true
    doc.scheduledPlan = null
    doc.scheduleId = null
    doc.stripeSubscriptionId = undefined
    return
  }
  doc.plan = plan
  doc.status = sub.status === 'trialing' ? 'trialing' : sub.status === 'active' ? 'active' : 'past_due'
  doc.currentPeriodEnd = periodEnd(sub)
  doc.trialEnd = dateFromUnix(sub.trial_end)
  if (sub.status === 'trialing' || sub.trial_end) doc.trialUsed = true
  doc.autoRenew = !sub.cancel_at_period_end
  doc.stripeSubscriptionId = sub.id
  const schedule = sub.schedule
  doc.scheduleId = typeof schedule === 'string' ? schedule : schedule?.id ?? null
  if (doc.scheduledPlan && doc.scheduledPlan === plan) {
    // The scheduled change has now happened.
    doc.scheduledPlan = null
    doc.scheduleId = null
  }
  if (sub.cancel_at_period_end) doc.scheduledPlan = 'free'
  else if (doc.scheduledPlan === 'free') doc.scheduledPlan = null
}

function cardSummary(pm: Stripe.PaymentMethod) {
  const card = pm.card
  return card ? { brand: card.brand, last4: card.last4, expMonth: card.exp_month, expYear: card.exp_year } : null
}

// ── what the Billing page shows ──────────────────────────────────────────────────────
/** A partner gym that includes Pro for this person, if they belong to one. */
async function includedByBusiness(userId: string): Promise<string | null> {
  const members = await BusinessMember.find({ userId: { $eq: userId } }).select('businessId')
  if (!members.length) return null
  const business = await Business.findOne({ _id: { $in: members.map((m) => m.businessId) }, status: 'approved' }).select('name')
  return business?.name ?? null
}

export async function getBillingView(userId: string) {
  const doc = await getDoc(userId)
  const plan: PlanId = doc?.plan ?? 'free'
  const includedBy = await includedByBusiness(userId)
  const effectivePlan: PlanId = includedBy && PLAN_RANK[plan] < PLAN_RANK.pro ? 'pro' : plan
  const configured = isBillingConfigured()
  return {
    configured,
    publishableKey: configured ? stripeSettings().publishableKey : null,
    plan,
    effectivePlan,
    includedBy,
    status: doc?.status ?? 'active',
    trialEnd: doc?.trialEnd ?? null,
    currentPeriodEnd: doc?.currentPeriodEnd ?? null,
    autoRenew: doc?.autoRenew ?? true,
    scheduledPlan: doc?.scheduledPlan ?? null,
    scheduledFor: doc?.scheduledPlan ? doc.currentPeriodEnd ?? null : null,
    paymentMethod: doc?.paymentMethod ?? null,
    trialAvailable: !doc?.trialUsed,
    trialDays: TRIAL_DAYS,
    referralDiscountPercent: await getAvailableDiscountPercent(userId),
    plans: PLANS,
  }
}

// ── customers and cards ──────────────────────────────────────────────────────────────
async function ensureCustomer(doc: ISubscription, email?: string): Promise<string> {
  if (doc.stripeCustomerId) return doc.stripeCustomerId
  const customer = await stripe().customers.create({ email, metadata: { userId: doc.userId } })
  doc.stripeCustomerId = customer.id
  await doc.save()
  return customer.id
}

export async function createSetupIntent(userId: string, email?: string): Promise<{ clientSecret: string }> {
  const s = stripe()
  const doc = await ensureDoc(userId)
  const customer = await ensureCustomer(doc, email)
  const intent = await s.setupIntents.create({ customer, allowed_payment_method_types: ['card'], usage: 'off_session', metadata: { userId } })
  if (!intent.client_secret) throw new BillingError('billing_unavailable', 'Could not start adding a card. Please try again.', 502)
  return { clientSecret: intent.client_secret }
}

/** After a card is added in Stripe, make the newest card the one used for renewals and keep just that one. */
export async function syncPaymentMethod(userId: string): Promise<void> {
  const s = stripe()
  const doc = await getDoc(userId)
  if (!doc?.stripeCustomerId) return
  const cards = (await s.paymentMethods.list({ customer: doc.stripeCustomerId, type: 'card' })).data
    .sort((a, b) => b.created - a.created)
  const keep = cards[0]
  if (keep) {
    await s.customers.update(doc.stripeCustomerId, { invoice_settings: { default_payment_method: keep.id } })
    if (doc.stripeSubscriptionId) await s.subscriptions.update(doc.stripeSubscriptionId, { default_payment_method: keep.id })
    for (const old of cards.slice(1)) await s.paymentMethods.detach(old.id)
  }
  doc.paymentMethod = keep ? cardSummary(keep) : null
  await doc.save()
}

export async function removePaymentMethod(userId: string): Promise<void> {
  const s = stripe()
  const doc = await getDoc(userId)
  if (!doc?.stripeCustomerId) return
  if (doc.plan !== 'free' && doc.autoRenew) {
    throw new BillingError('payment_method_required', 'You need a payment method while auto-renew is on. Turn off auto-renew first, or add a new card instead.', 409)
  }
  const cards = (await s.paymentMethods.list({ customer: doc.stripeCustomerId, type: 'card' })).data
  for (const card of cards) await s.paymentMethods.detach(card.id)
  doc.paymentMethod = null
  await doc.save()
}

// ── changing plan ────────────────────────────────────────────────────────────────────
async function releaseSchedule(doc: ISubscription) {
  if (!doc.scheduleId) return
  try {
    await stripe().subscriptionSchedules.release(doc.scheduleId)
  } catch (error) {
    // Already released or finished: nothing left to release.
    if ((error as { code?: string }).code !== 'resource_missing') throw error
  }
  doc.scheduleId = null
}

async function singleItem(subscriptionId: string) {
  const sub = await stripe().subscriptions.retrieve(subscriptionId)
  const item = sub.items.data[0]
  if (!item) throw new BillingError('no_subscription', 'We could not find your subscription.', 409)
  return { sub, item }
}

const payFailure = (error: unknown) =>
  new BillingError('payment_failed', (error as { message?: string }).message || 'The payment did not go through. Please check your card and try again.', 402)

/** Starts a paid plan for someone on Free. Pro starts with a free trial the first time. */
async function startPaidPlan(doc: ISubscription, email: string | undefined, target: 'pro' | 'premium') {
  const s = stripe()
  const trial = target === 'pro' && !doc.trialUsed
  if (!trial && !doc.paymentMethod) {
    throw new BillingError('payment_method_required', 'Add a payment method in your Profile before choosing this plan.', 402)
  }
  const customer = await ensureCustomer(doc, email)
  const price = priceIdFor(target) as string

  const discountPercent = await getAvailableDiscountPercent(doc.userId)
  const params: Stripe.SubscriptionCreateParams = {
    customer,
    items: [{ price }],
    metadata: { userId: doc.userId },
    payment_behavior: 'error_if_incomplete',
  }
  if (trial) {
    params.trial_period_days = TRIAL_DAYS
    // With no card by the end of the trial the plan simply ends instead of failing to charge.
    params.trial_settings = { end_behavior: { missing_payment_method: 'cancel' } }
  }
  if (discountPercent > 0) {
    const coupon = await s.coupons.create({ percent_off: discountPercent, duration: 'once', name: 'Referral discount' })
    params.discounts = [{ coupon: coupon.id }]
  }

  let sub: Stripe.Subscription
  try {
    sub = await s.subscriptions.create(params)
  } catch (error) {
    throw payFailure(error)
  }
  applyStripeSubscription(doc, sub)
  if (discountPercent > 0) await markDiscountUsed(doc.userId)
}

async function upgradeNow(doc: ISubscription, target: 'premium') {
  const s = stripe()
  if (doc.status !== 'trialing' && !doc.paymentMethod) {
    throw new BillingError('payment_method_required', 'Add a payment method in your Profile before upgrading.', 402)
  }
  await releaseSchedule(doc)
  const { item } = await singleItem(doc.stripeSubscriptionId as string)
  try {
    const sub = await s.subscriptions.update(doc.stripeSubscriptionId as string, {
      items: [{ id: item.id, price: priceIdFor(target) as string }],
      cancel_at_period_end: false, // choosing a bigger plan means they want to keep going
      // Charge the difference for the rest of this period right away.
      proration_behavior: doc.status === 'trialing' ? 'none' : 'always_invoice',
      payment_behavior: 'error_if_incomplete',
    })
    applyStripeSubscription(doc, sub)
  } catch (error) {
    throw payFailure(error)
  }
  doc.scheduledPlan = null
}

/** Lower plans take effect when the current period ends, so the person keeps what they paid for. */
async function scheduleDowngrade(doc: ISubscription, target: PlanId) {
  const s = stripe()
  const subId = doc.stripeSubscriptionId as string
  await releaseSchedule(doc)

  if (target === 'free') {
    const sub = await s.subscriptions.update(subId, { cancel_at_period_end: true })
    applyStripeSubscription(doc, sub)
    doc.scheduledPlan = 'free'
    return
  }

  // Premium to Pro.
  if (doc.status === 'trialing') {
    // Nothing has been paid yet, so there is nothing to wait out.
    const { item } = await singleItem(subId)
    const sub = await s.subscriptions.update(subId, { items: [{ id: item.id, price: priceIdFor(target) as string }], proration_behavior: 'none', cancel_at_period_end: false })
    applyStripeSubscription(doc, sub)
    doc.scheduledPlan = null
    return
  }
  await s.subscriptions.update(subId, { cancel_at_period_end: false })
  const schedule = await s.subscriptionSchedules.create({ from_subscription: subId })
  const current = schedule.phases[0]
  await s.subscriptionSchedules.update(schedule.id, {
    end_behavior: 'release',
    phases: [
      {
        items: current.items.map((i) => ({ price: typeof i.price === 'string' ? i.price : i.price.id, quantity: i.quantity ?? 1 })),
        start_date: current.start_date,
        end_date: current.end_date,
      },
      { items: [{ price: priceIdFor(target) as string }], duration: { interval: 'month', interval_count: 1 } },
    ],
  })
  doc.scheduleId = schedule.id
  doc.scheduledPlan = target
  doc.autoRenew = true
}

/** Undoes a scheduled downgrade or a pending cancellation: the person stays on their current plan. */
async function keepCurrentPlan(doc: ISubscription) {
  await releaseSchedule(doc)
  if (doc.stripeSubscriptionId) {
    const sub = await stripe().subscriptions.update(doc.stripeSubscriptionId, { cancel_at_period_end: false })
    applyStripeSubscription(doc, sub)
  }
  doc.scheduledPlan = null
  doc.autoRenew = true
}

export async function changePlan(userId: string, email: string | undefined, target: PlanId) {
  const doc = await ensureDoc(userId)
  const current = doc.plan

  if (target === current) {
    if (!doc.scheduledPlan && doc.autoRenew) throw new BillingError('already_on_plan', 'You are already on this plan.')
    await keepCurrentPlan(doc)
  } else if (PLAN_RANK[target] > PLAN_RANK[current]) {
    if (current === 'free') await startPaidPlan(doc, email, target as 'pro' | 'premium')
    else await upgradeNow(doc, target as 'premium')
  } else {
    // A lower plan. From Free there is nothing lower, so this is always a paid plan.
    if (!doc.stripeSubscriptionId) throw new BillingError('no_subscription', 'We could not find your subscription.', 409)
    await scheduleDowngrade(doc, target)
  }
  await doc.save()
  return getBillingView(userId)
}

export async function setAutoRenew(userId: string, enabled: boolean) {
  const doc = await getDoc(userId)
  if (!doc || doc.plan === 'free' || !doc.stripeSubscriptionId) {
    throw new BillingError('no_subscription', 'Auto-renew only applies to a paid plan.', 409)
  }
  if (enabled) {
    await keepCurrentPlan(doc)
  } else {
    // Turning renewal off means the plan ends when the period does, so any lower plan scheduled instead is dropped.
    await releaseSchedule(doc)
    const sub = await stripe().subscriptions.update(doc.stripeSubscriptionId, { cancel_at_period_end: true })
    applyStripeSubscription(doc, sub)
    doc.scheduledPlan = 'free'
    doc.autoRenew = false
  }
  await doc.save()
  return getBillingView(userId)
}

// ── Stripe webhooks ──────────────────────────────────────────────────────────────────
async function docForCustomer(customerId: string | undefined | null, metadataUserId?: string): Promise<ISubscription | null> {
  if (customerId) {
    const byCustomer = await Subscription.findOne({ stripeCustomerId: { $eq: customerId } })
    if (byCustomer) return byCustomer
  }
  return metadataUserId ? getDoc(metadataUserId) : null
}

const idOf = (value: string | { id: string } | null | undefined) => (typeof value === 'string' ? value : value?.id)

/** Applies one Stripe event. Everything is derived from Stripe's current state, so repeats are harmless. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const doc = await docForCustomer(idOf(sub.customer), sub.metadata?.userId)
      if (!doc) return
      applyStripeSubscription(doc, event.type === 'customer.subscription.deleted' ? ({ ...sub, status: 'canceled' } as Stripe.Subscription) : sub)
      await doc.save()
      return
    }
    case 'invoice.payment_failed':
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const doc = await docForCustomer(idOf(invoice.customer as string | { id: string } | null))
      if (!doc?.stripeSubscriptionId) return
      applyStripeSubscription(doc, await stripe().subscriptions.retrieve(doc.stripeSubscriptionId))
      await doc.save()
      return
    }
    case 'payment_method.attached':
    case 'payment_method.detached':
    case 'setup_intent.succeeded': {
      const object = event.data.object as { customer?: string | { id: string } | null; metadata?: { userId?: string } }
      const doc = await docForCustomer(idOf(object.customer), object.metadata?.userId)
      if (doc) await syncPaymentMethod(doc.userId)
      return
    }
    default:
      return
  }
}

// ── closing an account ──────────────────────────────────────────────────────────────
/** Cancels the subscription and deletes the Stripe customer, then our record. Safe to repeat. */
export async function removeBilling(userId: string): Promise<void> {
  const doc = await getDoc(userId)
  if (!doc) return
  if (isBillingConfigured()) {
    const s = getStripe()
    const gone = (error: unknown) => (error as { code?: string }).code === 'resource_missing'
    if (doc.stripeSubscriptionId) await s.subscriptions.cancel(doc.stripeSubscriptionId).catch((e) => { if (!gone(e)) throw e })
    if (doc.stripeCustomerId) await s.customers.del(doc.stripeCustomerId).catch((e) => { if (!gone(e)) throw e })
  }
  await Subscription.deleteOne({ _id: doc._id })
}
