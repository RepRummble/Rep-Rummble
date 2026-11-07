import { randomBytes } from 'crypto'
import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { CLOUD_DEVICES, CloudDevice, DEVICE_PROVIDERS, DeviceConnection, PHONE_DEVICES, PhoneDevice } from '../models/DeviceConnection.model'
import { DeviceReading } from '../models/DeviceReading.model'
import { OAuthState } from '../models/OAuthState.model'
import { CLOUD_PROVIDERS, DISPLAY_NAMES, clean, credsFor } from '../services/devices/providers'
import { ProviderHttpError } from '../services/devices/http'
import { cloudAvailable, revokeUpstream, saveTokens, syncAllForUser, syncConnection } from '../services/devices/sync.service'
import { summaryFor } from '../services/devices/summary.service'

/** Where the callback sends the person back to: the app's own address. */
const APP_RETURN = 'reprummble://devices'
const STATE_TTL_MS = 10 * 60_000
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

const isCloud = (p: string): p is CloudDevice => (CLOUD_DEVICES as readonly string[]).includes(p)
const isPhone = (p: string): p is PhoneDevice => (PHONE_DEVICES as readonly string[]).includes(p)

/** The address a provider sends people back to. It must be registered, character for character, in the provider's developer settings. */
export function redirectUriFor(req: Request, provider: string): string {
  const base = (process.env.PUBLIC_API_URL || `${process.env.NODE_ENV === 'production' ? 'https' : req.protocol}://${req.get('host')}`).replace(/\/$/, '')
  return `${base}/api/devices/callback/${provider}`
}

function randomState(length: number): string {
  const bytes = randomBytes(length)
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

const shapeConnection = (c: any) => c && ({
  status: c.status, label: c.label, connectedAt: c.connectedAt, lastSyncAt: c.lastSyncAt ?? null, lastError: c.lastError ?? null,
})

// @route GET /api/devices
// Every device we support, whether it can be connected, and the person's connection if there is one. Never any tokens.
export const listDevices = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id
  const conns = await DeviceConnection.find({ userId }).lean()
  const by = new Map(conns.map((c) => [c.provider, c]))
  const devices = DEVICE_PROVIDERS.map((id) => ({
    id, name: DISPLAY_NAMES[id], kind: isCloud(id) ? 'cloud' : 'phone',
    available: isCloud(id) ? cloudAvailable(id) : true,
    ...(isCloud(id) && !cloudAvailable(id) ? { unavailableReason: 'not_configured' } : {}),
    connection: shapeConnection(by.get(id)) ?? null,
  }))
  res.json({ success: true, data: devices })
}

// @route POST /api/devices/:provider/connect
// Starts signing in to a device's service. The app opens the returned address in the system browser.
export const connectDevice = async (req: AuthRequest, res: Response) => {
  const provider = String(req.params.provider)
  if (!isCloud(provider)) return res.status(400).json({ success: false, message: 'This device connects through your phone’s health app, not by signing in.' })
  const p = CLOUD_PROVIDERS[provider]
  const creds = credsFor(p)
  if (!cloudAvailable(provider) || !creds) {
    return res.status(503).json({ success: false, code: 'not_configured', message: `${p.name} is not switched on for Reprummble yet.` })
  }
  const userId = req.user!.id
  await OAuthState.deleteMany({ userId, provider })
  const state = randomState(p.stateLength)
  await OAuthState.create({ state, userId, provider, expiresAt: new Date(Date.now() + STATE_TTL_MS) })
  res.json({ success: true, data: { url: p.authorizeUrl({ clientId: creds.clientId, redirectUri: redirectUriFor(req, provider), state }), returnTo: APP_RETURN } })
}

const back = (res: Response, q: Record<string, string>) => res.redirect(302, `${APP_RETURN}?${new URLSearchParams(q)}`)

// @route GET /api/devices/callback/:provider   (public: the provider sends the person's browser here)
export const deviceCallback = async (req: Request, res: Response) => {
  const provider = String(req.params.provider)
  if (!isCloud(provider)) return back(res, { error: 'unknown' })
  const p = CLOUD_PROVIDERS[provider]
  const creds = credsFor(p)
  if (!creds || !cloudAvailable(provider)) return back(res, { provider, error: 'unavailable' })
  if (typeof req.query.error === 'string') return back(res, { provider, error: 'denied' })

  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const state = typeof req.query.state === 'string' ? req.query.state : ''
  if (!code || !state) return back(res, { provider, error: 'invalid' })

  // One use only: the state is deleted as it is read, so a replayed link does nothing.
  const found = await OAuthState.findOneAndDelete({ state: { $eq: state }, provider: { $eq: provider } })
  if (!found || found.expiresAt.getTime() < Date.now()) return back(res, { provider, error: 'expired' })

  try {
    const tokens = await p.exchange(code, redirectUriFor(req, provider), creds)
    const who = await p.identity(tokens.accessToken)
    const conn = (await DeviceConnection.findOne({ userId: found.userId, provider }).select('+accessTokenEnc +refreshTokenEnc'))
      ?? new DeviceConnection({ userId: found.userId, provider, kind: 'cloud' })
    conn.status = 'connected'
    conn.label = who.label
    conn.externalUserId = who.externalId
    conn.connectedAt = new Date()
    conn.lastError = undefined
    saveTokens(conn, tokens)
    await conn.save()
    await syncConnection(conn, { force: true }) // first sync now, so the list shows real numbers straight away
    return back(res, { provider, connected: '1' })
  } catch (e) {
    const notLinked = e instanceof ProviderHttpError && e.status === 400 && /ACCOUNT_NOT_LINKED|FAILED_PRECONDITION/.test(e.detail)
    console.error(`Connecting ${provider} failed:`, e instanceof ProviderHttpError ? `${e.status} ${e.detail}` : (e as Error).message)
    return back(res, { provider, error: notLinked ? 'not_linked' : 'failed' })
  }
}

// @route POST /api/devices/sync            (all connected cloud devices; throttled)
// @route POST /api/devices/:provider/sync  (one device, right now)
export const syncDevices = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id
  const provider = req.params.provider ? String(req.params.provider) : undefined
  if (!provider) return res.json({ success: true, data: await syncAllForUser(userId) })
  if (!isCloud(provider)) return res.status(400).json({ success: false, message: 'This device syncs when you open the app on your phone.' })
  const conn = await DeviceConnection.findOne({ userId, provider })
  if (!conn) return res.status(404).json({ success: false, message: 'That device is not connected.' })
  const result = await syncConnection(conn, { force: true })
  res.status(result.ok ? 200 : result.error === 'reauth' ? 409 : 502).json({ success: result.ok, data: result })
}

const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) ? v : undefined)

// @route POST /api/devices/phone/:provider   { label, days: [{ date, steps, activeCalories, sleepHours, restingHR, hrv }] }
// Apple Watch (via Apple Health) and Galaxy Watch (via Health Connect): the phone reads the watch's data and sends it here.
export const registerPhoneDevice = async (req: AuthRequest, res: Response) => {
  const provider = String(req.params.provider)
  if (!isPhone(provider)) return res.status(400).json({ success: false, message: 'Unknown device.' })
  const userId = req.user!.id
  const label = typeof req.body?.label === 'string' ? req.body.label.trim().slice(0, 80) : ''
  const days = Array.isArray(req.body?.days) ? req.body.days.slice(0, 14) : []

  const rows = days.flatMap((d: any) => {
    const day = date(d?.date)
    if (!day) return []
    const m = {
      steps: clean(d.steps, 0, 500_000), activeCalories: clean(d.activeCalories, 0, 50_000), sleepHours: clean(d.sleepHours, 0, 24),
      restingHR: clean(d.restingHR, 20, 200), hrv: clean(d.hrv, 0, 500),
    }
    return Object.values(m).some((v) => v !== undefined) ? [{ day, set: Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined)) }] : []
  })

  const now = new Date()
  await DeviceConnection.updateOne(
    { userId, provider },
    { $set: { kind: 'phone', status: 'connected', label: label || DISPLAY_NAMES[provider], lastSyncAt: now }, $unset: { lastError: 1 }, $setOnInsert: { connectedAt: now } },
    { upsert: true },
  )
  if (rows.length) {
    await DeviceReading.bulkWrite(rows.map((r: { day: string; set: object }) => ({
      updateOne: { filter: { userId, provider, date: r.day }, update: { $set: { ...r.set, syncedAt: now } }, upsert: true },
    })))
  }
  res.json({ success: true, data: { stored: rows.length } })
}

// @route DELETE /api/devices/:provider
// Disconnects: the provider is told to stop sharing, our copy of the sign-in is deleted, and so are the readings it gave us.
export const removeDevice = async (req: AuthRequest, res: Response) => {
  const provider = String(req.params.provider)
  if (!(DEVICE_PROVIDERS as readonly string[]).includes(provider)) return res.status(400).json({ success: false, message: 'Unknown device.' })
  const userId = req.user!.id
  const conn = await DeviceConnection.findOne({ userId, provider })
  if (!conn) return res.status(404).json({ success: false, message: 'That device is not connected.' })
  await revokeUpstream(conn)
  await DeviceConnection.deleteOne({ _id: conn._id })
  const readings = await DeviceReading.deleteMany({ userId, provider })
  res.json({ success: true, data: { removedReadings: readings.deletedCount ?? 0 } })
}

// @route GET /api/devices/summary?days=7
export const deviceSummary = async (req: AuthRequest, res: Response) => {
  const days = Math.min(30, Math.max(1, Math.floor(Number(req.query.days ?? 7)) || 7))
  res.json({ success: true, data: await summaryFor(req.user!.id, days) })
}
