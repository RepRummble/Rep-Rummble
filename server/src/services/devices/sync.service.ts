import { CloudDevice, DeviceConnection, IDeviceConnection } from '../../models/DeviceConnection.model'
import { DeviceReading } from '../../models/DeviceReading.model'
import { decrypt, deviceKey, encrypt } from './crypto'
import { ProviderHttpError } from './http'
import { CLOUD_PROVIDERS, DayMetrics, Tokens, credsFor } from './providers'

const SYNC_DAYS = 7
export const MIN_SYNC_GAP_MS = 5 * 60_000
const isoDay = (d: Date) => d.toISOString().slice(0, 10)

/** A cloud provider can be used only when we hold its app credentials and a key to lock the tokens. */
export function cloudAvailable(id: CloudDevice): boolean {
  return !!deviceKey() && !!credsFor(CLOUD_PROVIDERS[id])
}

export function saveTokens(conn: IDeviceConnection, t: Tokens) {
  conn.accessTokenEnc = encrypt(t.accessToken)
  if (t.refreshToken) conn.refreshTokenEnc = encrypt(t.refreshToken)
  conn.expiresAt = t.expiresIn ? new Date(Date.now() + t.expiresIn * 1000) : undefined
  if (t.scope) conn.scope = t.scope.slice(0, 600)
}

// Refresh tokens are single use for WHOOP and Oura: two refreshes at once would lose the second. One at a time per connection.
const refreshing = new Map<string, Promise<string>>()

async function freshAccessToken(id: string, force = false): Promise<string> {
  const pending = refreshing.get(id)
  if (pending) return pending
  const run = (async () => {
    const conn = await DeviceConnection.findById(id).select('+accessTokenEnc +refreshTokenEnc')
    if (!conn || conn.kind !== 'cloud') throw new Error('Connection is gone')
    const stillGood = conn.accessTokenEnc && conn.expiresAt && conn.expiresAt.getTime() - Date.now() > 60_000
    if (stillGood && !force) return decrypt(conn.accessTokenEnc!)
    const provider = CLOUD_PROVIDERS[conn.provider as CloudDevice]
    const creds = credsFor(provider)
    if (!conn.refreshTokenEnc || !creds) {
      if (!force && conn.accessTokenEnc && !conn.expiresAt) return decrypt(conn.accessTokenEnc)
      throw new ProviderHttpError(401, 'No refresh token')
    }
    try {
      saveTokens(conn, await provider.refresh(decrypt(conn.refreshTokenEnc), creds))
      await conn.save()
      return decrypt(conn.accessTokenEnc!)
    } catch (e) {
      if (e instanceof ProviderHttpError && (e.status === 400 || e.status === 401)) {
        await DeviceConnection.updateOne({ _id: conn._id }, { status: 'needs_reauth', lastError: 'Sign in again to keep syncing.' })
      }
      throw e
    }
  })().finally(() => refreshing.delete(id))
  refreshing.set(id, run)
  return run
}

async function store(userId: string, provider: string, days: DayMetrics[]) {
  if (!days.length) return
  const now = new Date()
  await DeviceReading.bulkWrite(days.map((d) => {
    const { date, ...metrics } = d
    const set = Object.fromEntries(Object.entries(metrics).filter(([, v]) => v !== undefined))
    return { updateOne: { filter: { userId, provider, date }, update: { $set: { ...set, syncedAt: now } }, upsert: true } }
  }))
}

export interface SyncResult { provider: string; ok: boolean; days?: number; error?: 'reauth' | 'unavailable' | 'failed'; skipped?: boolean }

/** Reads the last week from one connected cloud device and saves it. Never throws: the result says what happened. */
export async function syncConnection(conn: IDeviceConnection, opts: { force?: boolean } = {}): Promise<SyncResult> {
  const provider = CLOUD_PROVIDERS[conn.provider as CloudDevice]
  if (conn.kind !== 'cloud' || !provider) return { provider: conn.provider, ok: false, error: 'failed' }
  if (!opts.force && conn.status === 'connected' && conn.lastSyncAt && Date.now() - conn.lastSyncAt.getTime() < MIN_SYNC_GAP_MS) return { provider: conn.provider, ok: true, skipped: true }
  if (!cloudAvailable(provider.id)) return { provider: conn.provider, ok: false, error: 'unavailable' }

  const to = isoDay(new Date(Date.now() + 14 * 3_600_000)) // covers people ahead of UTC
  const from = isoDay(new Date(Date.now() - (SYNC_DAYS - 1) * 86_400_000))
  try {
    let token = await freshAccessToken(String(conn._id))
    let days: DayMetrics[]
    try { days = await provider.days(token, from, to) }
    catch (e) {
      if (!(e instanceof ProviderHttpError && e.status === 401)) throw e
      token = await freshAccessToken(String(conn._id), true) // the token was revoked or rotated early: refresh once and retry
      days = await provider.days(token, from, to)
    }
    await store(conn.userId, conn.provider, days)
    await DeviceConnection.updateOne({ _id: conn._id }, { status: 'connected', lastSyncAt: new Date(), $unset: { lastError: 1 } })
    return { provider: conn.provider, ok: true, days: days.length }
  } catch (e) {
    if (e instanceof ProviderHttpError && (e.status === 401 || e.status === 400 && /invalid_grant/.test(e.detail))) {
      await DeviceConnection.updateOne({ _id: conn._id }, { status: 'needs_reauth', lastError: 'Sign in again to keep syncing.' })
      return { provider: conn.provider, ok: false, error: 'reauth' }
    }
    console.error(`Device sync failed (${conn.provider}):`, e instanceof ProviderHttpError ? `${e.status} ${e.detail}` : (e as Error).message)
    await DeviceConnection.updateOne({ _id: conn._id }, { status: 'error', lastError: 'The service did not respond. We will try again.' })
    return { provider: conn.provider, ok: false, error: 'failed' }
  }
}

export async function syncAllForUser(userId: string, opts: { force?: boolean } = {}): Promise<SyncResult[]> {
  const conns = await DeviceConnection.find({ userId, kind: 'cloud' })
  return Promise.all(conns.map((c) => syncConnection(c, opts)))
}

/** Tells the provider to stop sharing, if it can. A failure here must not stop the person disconnecting. */
export async function revokeUpstream(conn: IDeviceConnection): Promise<void> {
  if (conn.kind !== 'cloud') return
  try {
    const full = await DeviceConnection.findById(String(conn._id)).select('+accessTokenEnc +refreshTokenEnc')
    const provider = CLOUD_PROVIDERS[conn.provider as CloudDevice]
    const creds = credsFor(provider)
    if (!full || !creds || !deviceKey()) return
    let accessToken = full.accessTokenEnc ? decrypt(full.accessTokenEnc) : undefined
    if (provider.id === 'whoop' || provider.id === 'oura') accessToken = await freshAccessToken(String(conn._id)).catch(() => accessToken)
    await provider.revoke({ accessToken, refreshToken: full.refreshTokenEnc ? decrypt(full.refreshTokenEnc) : undefined }, creds)
  } catch (e) {
    console.warn(`Could not revoke ${conn.provider} upstream:`, e instanceof ProviderHttpError ? e.status : (e as Error).message)
  }
}
