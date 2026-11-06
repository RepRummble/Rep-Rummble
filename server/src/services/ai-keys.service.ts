import type { KeyStatus } from './supabase.service'

let cached: { at: number; result: { gemini: KeyStatus; usda: KeyStatus } } | null = null

async function probe(url: string): Promise<KeyStatus> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (res.ok) return 'valid'
    // Google answers 400 API_KEY_INVALID for a wrong key; USDA answers 403.
    return [400, 401, 403].includes(res.status) ? 'rejected' : 'unreachable'
  } catch {
    return 'unreachable'
  }
}

/**
 * Whether Google and the USDA food database actually accept the keys this server holds. A key that is
 * set but wrong still shows as "configured", then breaks food search, photo analysis and the support
 * chat. Checked at most once a minute; the keys themselves are never reported.
 */
export async function checkAiKeys(): Promise<{ gemini: KeyStatus; usda: KeyStatus }> {
  if (cached && Date.now() - cached.at < 60_000) return cached.result
  const gemini = process.env.GEMINI_API_KEY
  const usda = process.env.USDA_API_KEY
  const [g, u] = await Promise.all([
    gemini ? probe(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(gemini)}`) : ('missing' as KeyStatus),
    usda ? probe(`https://api.nal.usda.gov/fdc/v1/foods/search?query=rice&pageSize=1&api_key=${encodeURIComponent(usda)}`) : ('missing' as KeyStatus),
  ])
  cached = { at: Date.now(), result: { gemini: g, usda: u } }
  return cached.result
}
