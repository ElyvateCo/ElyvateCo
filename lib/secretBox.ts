import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// Merchants' bKash / Nagad API keys are encrypted (AES-256-GCM) BEFORE they
// are written to Supabase, so a leaked database export or a stray SQL query
// never shows a usable key. The key lives only in a server environment
// variable:  PAYMENT_SECRET_KEY  = 64 hex characters (32 random bytes).
//   generate one:  openssl rand -hex 32
function getKey(): Buffer {
  const hex = process.env.PAYMENT_SECRET_KEY || ''
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('PAYMENT_SECRET_KEY is missing or invalid (needs 64 hex characters) — set it in Vercel → Environment Variables')
  }
  return Buffer.from(hex, 'hex')
}

export function secretBoxReady(): boolean {
  return /^[0-9a-fA-F]{64}$/.test(process.env.PAYMENT_SECRET_KEY || '')
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const enc = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`
}

export function decryptJson<T>(payload: string): T {
  const [v, iv, tag, data] = payload.split(':')
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Unreadable credentials')
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  const dec = Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()])
  return JSON.parse(dec.toString('utf8')) as T
}
