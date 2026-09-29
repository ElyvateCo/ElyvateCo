// Central definition of theme color presets. Adding a new preset later is
// just adding an entry here — no other file needs to change.
//
// IMPORTANT: `vars` values are space-separated "R G B" triples (not hex,
// not rgb() strings) because Tailwind's brand color scale is wired up as
// rgb(var(--color-brand-X) / <alpha-value>) in tailwind.config.js — that
// format is what's required for opacity modifiers like bg-brand-600/40 to
// keep working. `hex` is just for swatches/previews in the admin UI, where
// a normal hex string is simplest.

export type ThemePresetKey = 'indigo' | 'softGreen'
export type ThemeMode = ThemePresetKey | 'custom'

export type ColorWeight = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'

export type ThemePreset = {
  label: string
  hex: string // the 600-weight color, for admin swatch previews
  vars: Record<ColorWeight | 'glow', string>
}

export const THEME_PRESETS: Record<ThemePresetKey, ThemePreset> = {
  indigo: {
    label: 'Indigo',
    hex: '#4A4DDE',
    vars: {
      '50': '240 244 255', '100': '224 233 255', '200': '199 215 254',
      '300': '165 188 252', '400': '128 152 249', '500': '97 114 243',
      '600': '74 77 222', '700': '62 63 180', '800': '51 52 144', '900': '45 46 114',
      glow: 'rgba(97, 114, 243, 0.25)',
    },
  },
  softGreen: {
    label: 'Soft Green',
    hex: '#4C8562',
    vars: {
      '50': '241 247 243', '100': '225 238 230', '200': '195 221 205',
      '300': '157 199 172', '400': '123 174 141', '500': '95 152 115',
      '600': '76 133 98', '700': '61 107 79', '800': '51 87 63', '900': '43 71 53',
      glow: 'rgba(95, 152, 115, 0.25)',
    },
  },
}

export const DEFAULT_THEME_PRESET: ThemePresetKey = 'indigo'

export function isThemePresetKey(value: unknown): value is ThemePresetKey {
  return typeof value === 'string' && value in THEME_PRESETS
}

// ── Custom color support ──────────────────────────────────────────────────
// Admins can also pick ANY single color instead of a fixed preset. Asking a
// non-technical admin to manually choose all 10 shades (50–900) isn't
// realistic, so we generate the full scale from that one color by mixing it
// toward white (for lighter tints) and black (for darker shades) — the same
// technique used to hand-pick the two presets above, just automated.

type RGB = [number, number, number]

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function mixRgb(base: RGB, target: RGB, ratio: number): RGB {
  return [0, 1, 2].map(i => Math.round(base[i] + (target[i] - base[i]) * ratio)) as RGB
}

const WHITE: RGB = [255, 255, 255]
const BLACK: RGB = [0, 0, 0]

// Mix ratio toward white/black for each weight, tuned to visually match the
// hand-picked presets above (50 = lightest tint, 900 = darkest shade, 600 =
// the color the admin actually picked, unchanged).
const SCALE_STOPS: Record<Exclude<ColorWeight, '600'>, { toward: RGB; ratio: number }> = {
  '50':  { toward: WHITE, ratio: 0.94 },
  '100': { toward: WHITE, ratio: 0.88 },
  '200': { toward: WHITE, ratio: 0.74 },
  '300': { toward: WHITE, ratio: 0.58 },
  '400': { toward: WHITE, ratio: 0.30 },
  '500': { toward: WHITE, ratio: 0.14 },
  '700': { toward: BLACK, ratio: 0.16 },
  '800': { toward: BLACK, ratio: 0.32 },
  '900': { toward: BLACK, ratio: 0.46 },
}

/** Validates a hex color string like "#4A4DDE" or "4A4DDE". */
export function isValidHex(value: unknown): value is string {
  return typeof value === 'string' && /^#?[0-9a-fA-F]{6}$/.test(value)
}

function normalizeHex(hex: string): string {
  return hex.startsWith('#') ? hex : `#${hex}`
}

/** Generates a full 50–900 CSS-variable scale (plus glow) from one hex color. */
export function generateColorScale(hex: string): Record<ColorWeight | 'glow', string> {
  const base = hexToRgb(normalizeHex(hex))
  const vars = {} as Record<ColorWeight | 'glow', string>
  for (const weight of Object.keys(SCALE_STOPS) as Exclude<ColorWeight, '600'>[]) {
    const { toward, ratio } = SCALE_STOPS[weight]
    const [r, g, b] = mixRgb(base, toward, ratio)
    vars[weight] = `${r} ${g} ${b}`
  }
  vars['600'] = `${base[0]} ${base[1]} ${base[2]}`
  vars.glow = `rgba(${base[0]}, ${base[1]}, ${base[2]}, 0.25)`
  return vars
}

/** Hex preview swatches for each weight — used for the admin UI scale preview. */
export function generateColorScaleHex(hex: string): Record<ColorWeight, string> {
  const vars = generateColorScale(hex)
  const out = {} as Record<ColorWeight, string>
  for (const weight of Object.keys(vars) as (ColorWeight | 'glow')[]) {
    if (weight === 'glow') continue
    const [r, g, b] = vars[weight].split(' ').map(Number)
    out[weight] = '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')
  }
  return out
}
