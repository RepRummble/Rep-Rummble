import { Request, Response } from 'express'
import type Stripe from 'stripe'
import { AuthRequest } from '../middleware/auth.middleware'
import { isPlanId, isBillingConfigured, stripeSettings } from '../config/billing'
import { isDBConnected } from '../config/database'
import { getStripe } from '../services/stripe-client'
import * as billing from '../services/billing.service'

/** Turns a billing problem into a response the Billing page can show. */
function fail(res: Response, error: unknown) {
  if (error instanceof billing.BillingError) {
    return res.status(error.status).json({ success: false, code: error.code, message: error.message })
  }
  console.error('[billing] unexpected error:', error)
  return res.status(500).json({ success: false, code: 'billing_error', message: 'Something went wrong with billing. Please try again.' })
}

/** Money actions need a real, verified email so receipts and renewal notices reach the owner. */
function requireVerified(req: AuthRequest, res: Response): string | null {
  const userId = req.user?.id
  if (!userId) {
    res.status(401).json({ success: false, message: 'Not authenticated' })
    return null
  }
  if (!req.user?.emailVerified) {
    res.status(403).json({ success: false, code: 'email_not_verified', message: 'Please verify your email address before changing your billing.' })
    return null
  }
  return userId
}

// @route GET /api/billing
export const getBilling = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })
  if (!isDBConnected()) return res.status(503).json({ success: false, code: 'unavailable', message: 'Service temporarily unavailable.' })
  try {
    return res.json({ success: true, data: await billing.getBillingView(userId) })
  } catch (error) {
    return fail(res, error)
  }
}

// @route POST /api/billing/plan   { plan }
export const changePlan = async (req: AuthRequest, res: Response) => {
  const userId = requireVerified(req, res)
  if (!userId) return
  const plan = req.body?.plan
  if (!isPlanId(plan)) return res.status(400).json({ success: false, code: 'invalid_plan', message: 'Choose Free, Pro or Premium.' })
  try {
    return res.json({ success: true, data: await billing.changePlan(userId, req.user?.email, plan) })
  } catch (error) {
    return fail(res, error)
  }
}

// @route POST /api/billing/auto-renew   { enabled }
export const setAutoRenew = async (req: AuthRequest, res: Response) => {
  const userId = requireVerified(req, res)
  if (!userId) return
  if (typeof req.body?.enabled !== 'boolean') return res.status(400).json({ success: false, code: 'invalid_request', message: 'Say whether auto-renew should be on or off.' })
  try {
    return res.json({ success: true, data: await billing.setAutoRenew(userId, req.body.enabled) })
  } catch (error) {
    return fail(res, error)
  }
}

// @route POST /api/billing/setup-intent
// Starts adding a card. The card number goes from the browser straight to Stripe, never to us.
export const createSetupIntent = async (req: AuthRequest, res: Response) => {
  const userId = requireVerified(req, res)
  if (!userId) return
  try {
    return res.json({ success: true, data: await billing.createSetupIntent(userId, req.user?.email) })
  } catch (error) {
    return fail(res, error)
  }
}

// @route POST /api/billing/payment-method/sync
// Called after Stripe confirms a new card, so the page shows it straight away.
export const syncPaymentMethod = async (req: AuthRequest, res: Response) => {
  const userId = requireVerified(req, res)
  if (!userId) return
  try {
    await billing.syncPaymentMethod(userId)
    return res.json({ success: true, data: await billing.getBillingView(userId) })
  } catch (error) {
    return fail(res, error)
  }
}

// @route DELETE /api/billing/payment-method
export const removePaymentMethod = async (req: AuthRequest, res: Response) => {
  const userId = requireVerified(req, res)
  if (!userId) return
  try {
    await billing.removePaymentMethod(userId)
    return res.json({ success: true, data: await billing.getBillingView(userId) })
  } catch (error) {
    return fail(res, error)
  }
}

// @route POST /api/billing/webhook   (raw body; signed by Stripe)
export const stripeWebhook = async (req: Request, res: Response) => {
  if (!isBillingConfigured() || !stripeSettings().webhookSecret) return res.status(503).json({ success: false, message: 'Billing is not set up.' })
  const signature = req.headers['stripe-signature']
  if (typeof signature !== 'string' || !Buffer.isBuffer(req.body)) return res.status(400).json({ success: false, message: 'Missing signature.' })
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(req.body, signature, stripeSettings().webhookSecret as string)
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid signature.' })
  }
  try {
    await billing.handleStripeEvent(event)
    return res.json({ received: true })
  } catch (error) {
    console.error(`[billing] webhook ${event.type} failed:`, error)
    // A non-2xx answer makes Stripe retry later.
    return res.status(500).json({ success: false })
  }
}
