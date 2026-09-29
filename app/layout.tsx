import type { Metadata, Viewport } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/lib/authContext'
import { supabase } from '@/lib/supabase'
import { getCurrentStore } from '@/lib/currentStore'
import { THEME_PRESETS, DEFAULT_THEME_PRESET, isThemePresetKey, isValidHex, generateColorScale } from '@/lib/themePresets'
import { DARK_MODE_INIT_SCRIPT } from '@/lib/useDarkMode'
import GlobalErrorListener from '@/components/GlobalErrorListener'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600', '700'],
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Elyvate — Elevate Your Space',
  description: 'Premium ambient lighting and projection gadgets for your home.',
  icons: { icon: '/favicon.ico' },
}

// CRITICAL: without this, mobile browsers default to a ~980px desktop
// viewport and scale the entire page down to fit — which is what was
// causing every card and bar to look "cut off" on the right edge.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

// Without this, Next.js can cache the custom-font/theme lookup indefinitely
// since this layout wraps every route in the app — meaning a change in the
// admin panel might never show up on the live site without a full redeploy.
export const dynamic = 'force-dynamic'

// Figures out the right @font-face `format()` hint from the file extension.
// Browsers don't strictly require this to be correct to load the font, but
// getting it right avoids client-specific quirks.
function fontFormat(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0]
  switch (ext) {
    case 'woff2': return 'woff2'
    case 'woff':  return 'woff'
    case 'otf':   return 'opentype'
    case 'ttf':   return 'truetype'
    default:      return 'woff2'
  }
}

async function getSiteAppearance() {
  // Each store has its own font/theme — resolved from the hostname.
  // Pages with no store (or unknown hostnames) just get the defaults.
  const store = await getCurrentStore()
  const { data } = store
    ? await supabase
        .from('site_settings')
        .select('custom_font_url, theme_preset, custom_theme_hex')
        .eq('store_id', store.id)
        .maybeSingle()
    : { data: null }
  return {
    customFontUrl:  data?.custom_font_url ?? null,
    themePreset:    data?.theme_preset ?? DEFAULT_THEME_PRESET,
    customThemeHex: data?.custom_theme_hex ?? null,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { customFontUrl, themePreset, customThemeHex } = await getSiteAppearance()

  // Build the CSS variable overrides for <html>. Inline style has higher
  // specificity than any class-based rule, so this reliably wins over the
  // :root defaults in globals.css (font) and the Tailwind font classes,
  // without needing to touch any component that uses bg-brand-*/font-body/etc.
  const htmlStyle: Record<string, string> = {}
  if (customFontUrl) {
    htmlStyle['--font-body']    = "'ElyvateCustomFont'"
    htmlStyle['--font-display'] = "'ElyvateCustomFont'"
  }

  // Either a built-in preset, or a fully custom color the admin picked —
  // the custom scale is generated on the fly from that one hex value.
  const colorVars =
    themePreset === 'custom' && isValidHex(customThemeHex)
      ? generateColorScale(customThemeHex)
      : isThemePresetKey(themePreset) && themePreset !== DEFAULT_THEME_PRESET
        ? THEME_PRESETS[themePreset].vars
        : null

  if (colorVars) {
    for (const [weight, value] of Object.entries(colorVars)) {
      htmlStyle[`--color-brand-${weight}`] = value
    }
  }

  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${playfair.variable}`}
      style={Object.keys(htmlStyle).length ? (htmlStyle as React.CSSProperties) : undefined}
    >
      <body className="font-body text-ink-primary antialiased">
        <GlobalErrorListener />
        {/* Runs before React hydrates, so the correct theme (light/dark)
            applies on the very first paint — without this, the page would
            flash light-then-dark (or vice versa) as soon as JS loads. */}
        <script dangerouslySetInnerHTML={{ __html: DARK_MODE_INIT_SCRIPT }} />
        {customFontUrl && (
          // NOTE: intentionally NOT wrapped in a manual <head> tag — Next.js
          // App Router already generates its own <head> from the metadata
          // export above, and a second manually-rendered <head> conflicts
          // with it and gets silently dropped. A <style> tag works fine
          // placed in <body> instead; CSS rules apply regardless of where
          // in the document the <style> tag physically sits.
          <style dangerouslySetInnerHTML={{ __html: `
            @font-face {
              font-family: 'ElyvateCustomFont';
              src: url('${customFontUrl}') format('${fontFormat(customFontUrl)}');
              font-display: swap;
            }
          ` }} />
        )}
        <AuthProvider>
          <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
