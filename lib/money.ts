// Every price on Elyvate is in Bangladeshi Taka (BDT, ৳).
// 1250 -> "৳1,250"   1250.5 -> "৳1,250.50"
export function formatPrice(amount: number | null | undefined): string {
  const n = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0
  const hasFraction = Math.abs(n - Math.round(n)) > 0.004
  return '৳' + n.toLocaleString('en-US', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })
}
