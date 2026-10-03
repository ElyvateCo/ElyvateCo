// The public address (https://shop.example.com) this request came in on —
// used to build the links payment gateways send the customer back to.
export function getRequestOrigin(req: Request): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host
  const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') || host.includes('.localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
