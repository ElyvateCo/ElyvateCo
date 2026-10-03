// bKash Tokenized Checkout (v1.2.0-beta).
// Flow: grant token -> create payment -> customer pays on bKash -> bKash
// sends the customer back to our callback -> execute payment (this is what
// actually takes the money and returns the TrxID).
export type BkashCreds = { username: string; password: string; appKey: string; appSecret: string }
export type GatewayMode = 'sandbox' | 'live'

const BASE: Record<GatewayMode, string> = {
  sandbox: 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout',
  live:    'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout',
}

async function post(mode: GatewayMode, path: string, headers: Record<string, string>, body: unknown) {
  const res = await fetch(`${BASE[mode]}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const text = await res.text()
  try { return JSON.parse(text) } catch { throw new Error(`bKash returned an unreadable response (HTTP ${res.status})`) }
}

export async function bkashGrantToken(creds: BkashCreds, mode: GatewayMode): Promise<string> {
  const data = await post(mode, '/token/grant', { username: creds.username, password: creds.password }, {
    app_key: creds.appKey,
    app_secret: creds.appSecret,
  })
  if (!data?.id_token) throw new Error(data?.statusMessage || data?.errorMessage || 'bKash rejected these credentials')
  return data.id_token as string
}

export async function bkashCreatePayment(
  creds: BkashCreds, mode: GatewayMode,
  p: { amount: number; invoice: string; callbackURL: string; payerReference: string },
): Promise<{ paymentID: string; bkashURL: string }> {
  const token = await bkashGrantToken(creds, mode)
  const data = await post(mode, '/create', { Authorization: token, 'X-APP-Key': creds.appKey }, {
    mode: '0011',
    payerReference: p.payerReference,
    callbackURL: p.callbackURL,
    amount: p.amount.toFixed(2),
    currency: 'BDT',
    intent: 'sale',
    merchantInvoiceNumber: p.invoice,
  })
  if (!data?.paymentID || !data?.bkashURL) throw new Error(data?.statusMessage || 'bKash could not start the payment')
  return { paymentID: data.paymentID, bkashURL: data.bkashURL }
}

export type BkashResult = { completed: boolean; trxID: string | null; amount: number; message: string }

// Takes the money (execute) — and if bKash says it was already executed,
// double-checks with the payment status call.
export async function bkashExecute(creds: BkashCreds, mode: GatewayMode, paymentID: string): Promise<BkashResult> {
  const token = await bkashGrantToken(creds, mode)
  const headers = { Authorization: token, 'X-APP-Key': creds.appKey }
  let data = await post(mode, '/execute', headers, { paymentID })
  if (data?.statusCode !== '0000' || data?.transactionStatus !== 'Completed') {
    const status = await post(mode, '/payment/status', headers, { paymentID })
    if (status?.transactionStatus === 'Completed') data = status
  }
  const completed = data?.statusCode === '0000' && data?.transactionStatus === 'Completed'
  return {
    completed,
    trxID: completed ? String(data.trxID ?? '') || null : null,
    amount: Number(data?.amount ?? 0),
    message: String(data?.statusMessage ?? data?.errorMessage ?? ''),
  }
}
