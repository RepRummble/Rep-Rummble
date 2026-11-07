import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/** The key that locks stored device tokens: 32 random bytes, base64. Missing or wrong-sized means devices stay switched off. */
export function deviceKey(): Buffer | null {
  const raw = process.env.DEVICE_TOKEN_KEY
  if (!raw) return null
  const key = Buffer.from(raw, 'base64')
  return key.length === 32 ? key : null
}

/** AES-256-GCM. The result is "v1.<iv>.<tag>.<ciphertext>", so a changed byte is detected on decrypt. */
export function encrypt(plain: string): string {
  const key = deviceKey()
  if (!key) throw new Error('DEVICE_TOKEN_KEY is not set')
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.')
}

export function decrypt(blob: string): string {
  const key = deviceKey()
  if (!key) throw new Error('DEVICE_TOKEN_KEY is not set')
  const [v, iv, tag, ct] = blob.split('.')
  if (v !== 'v1' || !iv || !tag || !ct) throw new Error('Unreadable token')
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
  d.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8')
}
