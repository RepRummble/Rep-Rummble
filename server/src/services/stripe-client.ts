import Stripe from 'stripe'
import { stripeSettings } from '../config/billing'

let client: Stripe | null = null

/** The Stripe client, created on first use from STRIPE_SECRET_KEY. */
export function getStripe(): Stripe {
  if (!client) {
    const { secretKey } = stripeSettings()
    if (!secretKey) throw new Error('Stripe is not configured')
    client = new Stripe(secretKey)
  }
  return client
}

/** Lets tests swap in a simulated Stripe. */
export function setStripeClient(replacement: Stripe | null) {
  client = replacement
}
