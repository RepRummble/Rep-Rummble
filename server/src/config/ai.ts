// "gemini-flash-latest" always points at Google's current Flash model, so a
// retired model name can't silently break the app. Override with GEMINI_MODEL.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest'

// When the main model is overloaded (Google answers 503 "high demand" in spikes), we retry once and then
// fall back to this lighter model so a busy moment does not become an outage. Override with GEMINI_FALLBACK_MODEL.
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-flash-lite-latest'

/** True for "try again shortly" failures: Google is busy or rate limiting, not rejecting our request or key. */
export function isOverloaded(err: unknown): boolean {
  const e = err as { name?: string; status?: number; code?: number; message?: string } | undefined
  if (e?.name === 'AbortError') return true // our own timeout: Google took too long, so try the other model
  const status = e?.status ?? e?.code
  if (status === 503 || status === 429) return true
  return /\b(503|429)\b|high demand|overloaded|UNAVAILABLE|RESOURCE_EXHAUSTED|aborted|timed? ?out/i.test(e?.message || '')
}
