// Bangladeshi mobile numbers: 01XXXXXXXXX (11 digits, operator code 3-9).
// Accepts what people actually type: 01712345678, +8801712345678,
// 8801712345678, 01712-345678, "017 1234 5678".
// Returns the clean 11-digit form, or null if it isn't a valid number.
export function normalizeBDPhone(input: unknown): string | null {
  if (typeof input !== 'string') return null
  let d = input.replace(/[\s\-().]/g, '')
  if (d.startsWith('+88')) d = d.slice(3)
  else if (d.startsWith('88') && d.length === 13) d = d.slice(2)
  return /^01[3-9]\d{8}$/.test(d) ? d : null
}
