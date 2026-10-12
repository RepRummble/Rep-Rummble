import rateLimit from 'express-rate-limit'

/**
 * Throttles the auth endpoints most attractive to credential stuffing /
 * brute-force attacks. Keyed on IP by default (express-rate-limit's
 * standard behavior), which is enough to stop naive automated attacks
 * without needing extra infra (e.g. Redis) for a single-instance deploy.
 *
 * If the server is ever scaled to multiple instances, swap the default
 * memory store for a shared store (e.g. `rate-limit-redis`) so limits are
 * enforced across all instances, not per-instance.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // 20 attempts per IP per window across register+login
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many auth attempts from this IP. Please try again later.',
  },
})

/**
 * A tighter limiter specifically for login, since it's the most valuable
 * target for credential stuffing against real user accounts.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again later.',
  },
})

export const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
})

// Public form submissions (reviews, contact, waitlist) — stops spam floods.
export const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many submissions. Please try again later.' },
})

export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
})

// Each chat message costs an AI call, so cap it tighter than general reads.
export const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'You are sending messages too quickly. Please wait a few minutes.' },
})

/** Referral claims are one-time per account, so a handful of tries per hour is plenty. */
export const referralClaimLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
})

/** Business applications: a few per hour per IP stops form spam. */
export const businessApplyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many applications. Please try again later.' },
})
