/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // Values come from CSS variables (defined in globals.css, and
          // overridable per-site in app/layout.tsx) rather than fixed hex —
          // this is what lets the whole site's accent color be changed from
          // the admin panel without touching any component. The
          // rgb(var(...) / <alpha-value>) wrapper (Tailwind's documented
          // pattern for this) is required so opacity modifiers like
          // bg-brand-600/40 keep working — a plain var(--x) hex string
          // would silently break those.
          50:  'rgb(var(--color-brand-50) / <alpha-value>)',
          100: 'rgb(var(--color-brand-100) / <alpha-value>)',
          200: 'rgb(var(--color-brand-200) / <alpha-value>)',
          300: 'rgb(var(--color-brand-300) / <alpha-value>)',
          400: 'rgb(var(--color-brand-400) / <alpha-value>)',
          500: 'rgb(var(--color-brand-500) / <alpha-value>)',
          600: 'rgb(var(--color-brand-600) / <alpha-value>)',
          700: 'rgb(var(--color-brand-700) / <alpha-value>)',
          800: 'rgb(var(--color-brand-800) / <alpha-value>)',
          900: 'rgb(var(--color-brand-900) / <alpha-value>)',
        },
        // Same CSS-variable pattern extended to the neutral palette — this
        // is what makes dark mode possible without editing every component:
        // surface-0 is the "card/page background" (previously plain white),
        // 50–300 go from near-white to light-gray in light mode and invert
        // to near-black/dark-gray in dark mode (see .dark block in globals.css).
        surface: {
          0:   'rgb(var(--color-surface-0) / <alpha-value>)',
          50:  'rgb(var(--color-surface-50) / <alpha-value>)',
          100: 'rgb(var(--color-surface-100) / <alpha-value>)',
          200: 'rgb(var(--color-surface-200) / <alpha-value>)',
          300: 'rgb(var(--color-surface-300) / <alpha-value>)',
        },
        ink: {
          primary:   'rgb(var(--color-ink-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-ink-secondary) / <alpha-value>)',
          muted:     'rgb(var(--color-ink-muted) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body:    ['var(--font-body)', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        card:  '0 2px 12px 0 rgba(0,0,0,0.07)',
        hover: '0 8px 30px 0 rgba(0,0,0,0.12)',
        glow:  '0 0 40px 0 var(--color-brand-glow)',
      },
    },
  },
  plugins: [],
}
