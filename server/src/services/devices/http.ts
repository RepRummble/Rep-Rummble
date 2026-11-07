/** A failed call to a device provider. Carries the status so callers can tell "sign in again" from "try later". Never holds tokens. */
export class ProviderHttpError extends Error {
  constructor(public status: number, public detail: string) {
    super(`Provider responded ${status}`)
  }
}

const TIMEOUT_MS = 15_000

async function send(url: string, init: RequestInit): Promise<any> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  const text = await res.text()
  if (!res.ok) throw new ProviderHttpError(res.status, text.slice(0, 300))
  if (!text) return {}
  try { return JSON.parse(text) } catch { return {} }
}

export const getJson = (url: string, token: string, headers: Record<string, string> = {}) =>
  send(url, { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': 'Reprummble/1.0', ...headers } })

export const postJson = (url: string, token: string, body: unknown) =>
  send(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'Reprummble/1.0' }, body: JSON.stringify(body) })

export const postForm = (url: string, form: Record<string, string>) =>
  send(url, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Reprummble/1.0' }, body: new URLSearchParams(form).toString() })

export const del = (url: string, token: string) =>
  send(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Reprummble/1.0' } })
