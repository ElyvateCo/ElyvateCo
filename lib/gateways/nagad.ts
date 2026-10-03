// Nagad Payment Gateway (merchant API).
// Flow: initialize -> complete -> customer pays on Nagad -> Nagad sends the
// customer back to our callback -> verify (server to server).
// Every request body is encrypted with Nagad's public key and signed with
// the MERCHANT's private key (RSA), as Nagad requires.
import { constants, createPrivateKey, createPublicKey, privateDecrypt, publicEncrypt, randomBytes, sign } from 'crypto'
import type { GatewayMode } from './bkash'

export type NagadCreds = {
  merchantId: string
  merchantNumber: string
  merchantPrivateKey: string   // merchant's RSA private key (PEM or bare base64)
  pgPublicKey: string          // Nagad's public key (PEM or bare base64)
}

const BASE: Record<GatewayMode, string> = {
  sandbox: 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0',
  live:    'https://api.mynagad.com',
}

// Nagad hands out keys as bare base64; accept both that and full PEM.
function toPem(raw: string, kind: 'PRIVATE KEY' | 'PUBLIC KEY'): string {
  const t = raw.trim()
  if (t.includes('-----BEGIN')) return t
  const body = t.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') ?? ''
  return `-----BEGIN ${kind}-----\n${body}\n-----END ${kind}-----`
}

// Throws a readable error if a pasted key can't be used (checked when saving).
export function assertNagadKeys(c: NagadCreds) {
  try { createPrivateKey(toPem(c.merchantPrivateKey, 'PRIVATE KEY')) }
  catch { throw new Error('The merchant private key could not be read. Paste the full key exactly as you have it.') }
  try { createPublicKey(toPem(c.pgPublicKey, 'PUBLIC KEY')) }
  catch { throw new Error('The Nagad public key could not be read. Paste the full key exactly as Nagad gave it.') }
}

// RSA PKCS#1 v1.5 decrypt done by hand: new Node versions refuse
// privateDecrypt with PKCS1 padding, so decrypt raw and strip the padding.
function rsaDecryptPkcs1(privateKeyPem: string, data: Buffer): string {
  const key = createPrivateKey(privateKeyPem)
  const raw = privateDecrypt({ key, padding: constants.RSA_NO_PADDING }, data)
  if (raw[0] !== 0x00 || raw[1] !== 0x02) throw new Error('Could not read the Nagad response (wrong merchant key?)')
  const sep = raw.indexOf(0x00, 2)
  if (sep < 10) throw new Error('Could not read the Nagad response (bad padding)')
  return raw.subarray(sep + 1).toString('utf8')
}

function encryptForNagad(pgPublicKey: string, text: string): string {
  return publicEncrypt({ key: createPublicKey(toPem(pgPublicKey, 'PUBLIC KEY')), padding: constants.RSA_PKCS1_PADDING }, Buffer.from(text)).toString('base64')
}

function signWithMerchantKey(privateKey: string, text: string): string {
  return sign('RSA-SHA256', Buffer.from(text), createPrivateKey(toPem(privateKey, 'PRIVATE KEY'))).toString('base64')
}

// Nagad wants Bangladesh time as yyyyMMddHHmmss
function dhakaDateTime(): string {
  const d = new Date(Date.now() + 6 * 3600 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
}

function nagadHeaders(ip: string) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-KM-Api-Version': 'v-0.2.0',
    'X-KM-IP-V4': ip || '127.0.0.1',
    'X-KM-Client-Type': 'PC_WEB',
  }
}

// Nagad order ids: letters/digits only, max 20 chars
export function nagadOrderId(orderUuid: string): string {
  return 'E' + orderUuid.replace(/-/g, '').slice(0, 19)
}

export async function nagadCreatePayment(
  c: NagadCreds, mode: GatewayMode,
  p: { orderUuid: string; amount: number; callbackURL: string; ip: string },
): Promise<{ paymentRefId: string; redirectUrl: string }> {
  const base = BASE[mode]
  const orderId = nagadOrderId(p.orderUuid)
  const dateTime = dhakaDateTime()
  const challenge = randomBytes(20).toString('hex')
  const privatePem = toPem(c.merchantPrivateKey, 'PRIVATE KEY')

  // 1) initialize
  const initSensitive = JSON.stringify({ merchantId: c.merchantId, datetime: dateTime, orderId, challenge })
  const initRes = await fetch(`${base}/api/dfs/check-out/initialize/${c.merchantId}/${orderId}`, {
    method: 'POST',
    headers: nagadHeaders(p.ip),
    body: JSON.stringify({
      accountNumber: c.merchantNumber,
      dateTime,
      sensitiveData: encryptForNagad(c.pgPublicKey, initSensitive),
      signature: signWithMerchantKey(c.merchantPrivateKey, initSensitive),
    }),
    cache: 'no-store',
  })
  const init = await initRes.json().catch(() => null)
  if (!init?.sensitiveData) throw new Error(init?.message || 'Nagad did not accept the payment request')

  const decrypted = JSON.parse(rsaDecryptPkcs1(privatePem, Buffer.from(init.sensitiveData, 'base64')))
  const paymentRefId: string | undefined = decrypted.paymentReferenceId
  const serverChallenge: string | undefined = decrypted.challenge
  if (!paymentRefId || !serverChallenge) throw new Error('Nagad sent an incomplete response')

  // 2) complete
  const completeSensitive = JSON.stringify({
    merchantId: c.merchantId,
    orderId,
    currencyCode: '050',
    amount: p.amount.toFixed(2),
    challenge: serverChallenge,
  })
  const completeRes = await fetch(`${base}/api/dfs/check-out/complete/${paymentRefId}`, {
    method: 'POST',
    headers: nagadHeaders(p.ip),
    body: JSON.stringify({
      sensitiveData: encryptForNagad(c.pgPublicKey, completeSensitive),
      signature: signWithMerchantKey(c.merchantPrivateKey, completeSensitive),
      merchantCallbackURL: p.callbackURL,
      additionalMerchantInfo: { orderRef: orderId },
    }),
    cache: 'no-store',
  })
  const complete = await completeRes.json().catch(() => null)
  if (!complete?.callBackUrl) throw new Error(complete?.message || 'Nagad could not start the payment')

  return { paymentRefId, redirectUrl: complete.callBackUrl }
}

export type NagadResult = { success: boolean; amount: number; orderId: string; trxId: string | null; message: string }

export async function nagadVerify(mode: GatewayMode, paymentRefId: string): Promise<NagadResult> {
  const res = await fetch(`${BASE[mode]}/api/dfs/verify/payment/${encodeURIComponent(paymentRefId)}`, {
    headers: nagadHeaders(''),
    cache: 'no-store',
  })
  const data = await res.json().catch(() => null)
  return {
    success: String(data?.status ?? '').toLowerCase() === 'success',
    amount: Number(data?.amount ?? 0),
    orderId: String(data?.orderId ?? ''),
    trxId: data?.issuerPaymentRefNo ? String(data.issuerPaymentRefNo) : null,
    message: String(data?.message ?? data?.status ?? ''),
  }
}
