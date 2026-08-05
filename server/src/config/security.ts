/**
 * Central place for security-sensitive config that must never silently
 * fall back to a guessable default (e.g. `process.env.JWT_SECRET || "secret"`).
 *
 * If JWT_SECRET is missing:
 *  - in production, the process refuses to start (fail closed).
 *  - outside production, we generate a random per-process secret and warn
 *    loudly, so local dev still works but nobody mistakes it for a real key
 *    (and every restart invalidates previously issued tokens, which is the
 *    point — it stops a fixed fallback secret from being relied upon).
 */
import crypto from 'crypto'

function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET

  if (fromEnv && fromEnv.trim().length >= 32) {
    return fromEnv
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET is missing or too short (< 32 chars). Refusing to start in production. ' +
      'Set a strong, random JWT_SECRET in the environment (e.g. `openssl rand -hex 32`).'
    )
  }

  if (fromEnv) {
    console.warn(
      '⚠️  JWT_SECRET is set but shorter than 32 characters. Using it for now (non-production), ' +
      'but generate a stronger secret before deploying.'
    )
    return fromEnv
  }

  const generated = crypto.randomBytes(32).toString('hex')
  console.warn(
    '⚠️  JWT_SECRET is not set. Generated a random secret for this process only — ' +
    'tokens will NOT survive a restart. Set JWT_SECRET in server/.env for stable local dev, ' +
    'and as a real secret in your deployment platform for production.'
  )
  return generated
}

export const JWT_SECRET = resolveJwtSecret()
