'use client'
import { useEffect, useState } from 'react'
import type { SiteSettings } from '@/lib/supabase'
import { Check, Palette } from 'lucide-react'
import { checkLink, parseCssSafeUrl } from '@/lib/mediaLinks'
import { normalizeBDPhone } from '@/lib/phone'
import { useAdminPath } from '@/components/admin/AdminPathContext'
import { validateAdminPath } from '@/lib/adminPath'
import { THEME_PRESETS, DEFAULT_THEME_PRESET, ThemePresetKey, generateColorScaleHex, isValidHex } from '@/lib/themePresets'
import toast from 'react-hot-toast'

type AccountType = 'personal' | 'agent' | 'merchant'

function PayToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-brand-600' : 'bg-surface-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  )
}

function WalletSettings(props: {
  label: string
  on: boolean
  number: string
  type: AccountType
  onOn: (v: boolean) => void
  onNumber: (v: string) => void
  onType: (v: AccountType) => void
}) {
  const { label, on, number, type, onOn, onNumber, onType } = props
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-primary">{label}</p>
          <p className="text-xs text-ink-muted">Customers send money to your {label} number, then enter the Transaction ID</p>
        </div>
        <PayToggle on={on} onChange={onOn} />
      </div>
      {on && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="label">{label} number</label>
            <input type="tel" inputMode="numeric" className="input" placeholder="01XXXXXXXXX" value={number} onChange={e => onNumber(e.target.value)} />
          </div>
          <div>
            <label className="label">Account type</label>
            <select className="input" value={type} onChange={e => onType(e.target.value as AccountType)}>
              <option value="personal">Personal (Send Money)</option>
              <option value="agent">Agent (Cash Out)</option>
              <option value="merchant">Merchant (Payment)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminSettings() {
  const adminPath = useAdminPath()
  const [settings, setSettings] = useState<Partial<SiteSettings>>({})
  const [saving, setSaving] = useState(false)
  const [newAdminPath, setNewAdminPath] = useState(adminPath)
  const [savingPath, setSavingPath] = useState(false)

  async function saveAdminPath() {
    const check = validateAdminPath(newAdminPath)
    if (!check.ok) { toast.error(check.error); return }
    if (check.value === adminPath) { toast('That is already your admin address'); return }
    setSavingPath(true)
    const res = await fetch('/api/admin/admin-path', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPath: check.value }),
    })
    const data = await res.json()
    setSavingPath(false)
    if (!res.ok) { toast.error(data.error || 'Could not change the address'); return }
    toast.success('Admin address changed')
    // The old address stops working immediately — move to the new one
    window.location.assign(`/${data.adminPath}/settings`)
  }

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => { if (data && !data.error) setSettings(data) })
  }, [])

  function setFontLink(value: string) {
    // Name shown in the preview is taken from the file name in the link
    const file = value.split('?')[0].split('/').pop() || ''
    let name = 'Custom font'
    try { name = decodeURIComponent(file).replace(/\.[^.]+$/, '') || name } catch {}
    setSettings(s => ({ ...s, custom_font_url: value || null, custom_font_name: value ? name : null }))
  }

  function removeFont() {
    setSettings(s => ({ ...s, custom_font_url: null, custom_font_name: null }))
    toast.success('Custom font removed — click "Save Settings" to revert to the default font.')
  }

  async function handleSave() {
    const logo = checkLink(settings.logo_url, 'Logo link')
    if (!logo.ok) { toast.error(logo.error); return }
    const font = checkLink(settings.custom_font_url, 'Font link', { cssSafe: true })
    if (!font.ok) { toast.error(font.error + ' (no spaces, quotes or brackets)'); return }
    if (settings.bkash_enabled && !normalizeBDPhone(settings.bkash_number ?? '')) { toast.error('Enter a valid bKash number, like 01712345678'); return }
    if (settings.nagad_enabled && !normalizeBDPhone(settings.nagad_number ?? '')) { toast.error('Enter a valid Nagad number, like 01712345678'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      toast.success('Settings saved!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const update = (k: keyof SiteSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setSettings(s => ({ ...s, [k]: e.target.value }))

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-8">Settings</h1>

      <div className="bg-white rounded-2xl shadow-card p-6 max-w-2xl space-y-6">
        {/* Store */}
        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Store</p>
          <div className="space-y-4">
            <div>
              <label className="label">Store Name</label>
              <input className="input" value={settings.store_name ?? ''} onChange={update('store_name')} placeholder="Elyvate" />
            </div>
            <div>
              <label className="label">Logo URL (optional)</label>
              <input className="input" value={settings.logo_url ?? ''} onChange={update('logo_url')} placeholder="https://..." />
            </div>
          </div>
        </div>

        {/* Announcement */}
        <div className="border-t border-surface-200 pt-6">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Announcement Bar</p>
          <div className="space-y-4">
            <div>
              <label className="label">Announcement Text</label>
              <input className="input" value={settings.announcement_text ?? ''} onChange={update('announcement_text')} placeholder="Free shipping on all orders! 🚀" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-brand-600"
                checked={settings.announcement_active ?? false}
                onChange={e => setSettings(s => ({ ...s, announcement_active: e.target.checked }))}
              />
              <span className="text-sm font-medium text-ink-primary">Show announcement bar</span>
            </label>
          </div>
        </div>

        {/* Social */}
        <div className="border-t border-surface-200 pt-6">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Social Links</p>
          <div className="space-y-4">
            <div>
              <label className="label">Instagram URL</label>
              <input className="input" value={settings.instagram_url ?? ''} onChange={update('instagram_url')} placeholder="https://instagram.com/elyvate" />
            </div>
            <div>
              <label className="label">TikTok URL</label>
              <input className="input" value={settings.tiktok_url ?? ''} onChange={update('tiktok_url')} placeholder="https://tiktok.com/@elyvate" />
            </div>
            <div>
              <label className="label">Facebook URL</label>
              <input className="input" value={settings.facebook_url ?? ''} onChange={update('facebook_url')} placeholder="https://facebook.com/elyvate" />
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="border-t border-surface-200 pt-6">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Typography</p>

          {parseCssSafeUrl(settings.custom_font_url) && (
            <>
              {/* Load the uploaded font just for this admin preview */}
              <style dangerouslySetInnerHTML={{ __html: `
                @font-face { font-family: 'AdminFontPreview'; src: url('${settings.custom_font_url}'); font-display: swap; }
              ` }} />
              <div className="rounded-2xl border border-surface-200 p-4 mb-3 bg-surface-50">
                <p className="text-xs text-ink-muted mb-1">Preview — {settings.custom_font_name || 'Custom font'}</p>
                <p style={{ fontFamily: 'AdminFontPreview, sans-serif' }} className="text-2xl text-ink-primary">
                  Elevate Your Space — The quick brown fox jumps
                </p>
              </div>
            </>
          )}

          <input
            className="input text-sm"
            placeholder="Paste font link (https://... .woff2 / .woff / .ttf / .otf)"
            value={settings.custom_font_url ?? ''}
            onChange={e => setFontLink(e.target.value)}
          />

          {settings.custom_font_url && (
            <button
              onClick={removeFont}
              className="text-xs text-red-600 hover:text-red-700 font-medium mt-2"
            >
              Remove custom font (revert to default)
            </button>
          )}

          <p className="text-xs text-ink-muted mt-2">
            Paste a direct link to a .woff2, .woff, .ttf or .otf font file. Once saved, this font
            replaces the default typeface across your whole storefront — headlines and body text alike.
          </p>
        </div>

        {/* Theme Color */}
        <div className="border-t border-surface-200 pt-6">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Theme Color</p>

          <div className="flex gap-3 mb-3">
            {(Object.entries(THEME_PRESETS) as [ThemePresetKey, typeof THEME_PRESETS[ThemePresetKey]][]).map(([key, preset]) => {
              const active = (settings.theme_preset ?? DEFAULT_THEME_PRESET) === key
              return (
                <button
                  key={key}
                  onClick={() => setSettings(s => ({ ...s, theme_preset: key }))}
                  className="flex flex-col items-center gap-1.5 group"
                  title={preset.label}
                >
                  <span
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
                    style={{ backgroundColor: preset.hex, boxShadow: active ? `0 0 0 3px white, 0 0 0 5px ${preset.hex}` : 'none' }}
                  >
                    {active && <Check size={18} className="text-white" strokeWidth={3} />}
                  </span>
                  <span className={`text-xs ${active ? 'text-ink-primary font-medium' : 'text-ink-muted'}`}>{preset.label}</span>
                </button>
              )
            })}

            {/* Custom color option */}
            <button
              onClick={() => setSettings(s => ({ ...s, theme_preset: 'custom', custom_theme_hex: s.custom_theme_hex ?? '#4A4DDE' }))}
              className="flex flex-col items-center gap-1.5 group"
              title="Custom color"
            >
              <span
                className="w-11 h-11 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
                style={{
                  background: 'conic-gradient(from 180deg, #f43f5e, #f59e0b, #84cc16, #06b6d4, #6366f1, #f43f5e)',
                  boxShadow: settings.theme_preset === 'custom' ? '0 0 0 3px white, 0 0 0 5px #888' : 'none',
                }}
              >
                {settings.theme_preset === 'custom'
                  ? <Check size={18} className="text-white drop-shadow" strokeWidth={3} />
                  : <Palette size={16} className="text-white drop-shadow" />}
              </span>
              <span className={`text-xs ${settings.theme_preset === 'custom' ? 'text-ink-primary font-medium' : 'text-ink-muted'}`}>Custom</span>
            </button>
          </div>

          {settings.theme_preset === 'custom' && (
            <div className="bg-surface-50 rounded-2xl p-4 mb-3 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={isValidHex(settings.custom_theme_hex) ? (settings.custom_theme_hex!.startsWith('#') ? settings.custom_theme_hex! : `#${settings.custom_theme_hex}`) : '#4A4DDE'}
                  onChange={e => setSettings(s => ({ ...s, custom_theme_hex: e.target.value }))}
                  className="w-12 h-12 rounded-xl border border-surface-200 cursor-pointer bg-transparent"
                  aria-label="Pick a custom brand color"
                />
                <input
                  type="text"
                  value={settings.custom_theme_hex ?? ''}
                  onChange={e => setSettings(s => ({ ...s, custom_theme_hex: e.target.value }))}
                  placeholder="#4A4DDE"
                  maxLength={7}
                  className="input flex-1 font-mono text-sm"
                />
              </div>

              {isValidHex(settings.custom_theme_hex) ? (
                <div className="flex rounded-xl overflow-hidden h-8">
                  {Object.entries(generateColorScaleHex(settings.custom_theme_hex)).map(([weight, hex]) => (
                    <div key={weight} className="flex-1" style={{ backgroundColor: hex }} title={`${weight}: ${hex}`} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-red-500">Enter a valid 6-digit hex color (e.g. #4A4DDE).</p>
              )}
              <p className="text-xs text-ink-muted">
                Pick one color — the full light-to-dark scale used across the site (buttons, hovers, tints) is generated automatically from it.
              </p>
            </div>
          )}

          <p className="text-xs text-ink-muted">
            Changes your storefront's main accent color (buttons, links, highlights) everywhere.
            Status colors like order badges stay the same. Takes up to a minute to appear after saving.
          </p>
        </div>

        {/* Admin panel address */}
        <div className="border-t border-surface-200 pt-6">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Admin Panel Address</p>
          <label className="label">Your admin panel is at</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center flex-1">
              <span className="px-3 py-2.5 bg-surface-100 border border-r-0 border-surface-200 rounded-l-xl text-sm text-ink-muted">/</span>
              <input
                className="input rounded-l-none"
                value={newAdminPath}
                onChange={e => setNewAdminPath(e.target.value)}
                placeholder="admin"
                maxLength={40}
              />
            </div>
            <button type="button" onClick={saveAdminPath} disabled={savingPath} className="btn-outline shrink-0 disabled:opacity-60">
              {savingPath ? 'Changing…' : 'Change address'}
            </button>
          </div>
          <p className="text-xs text-ink-muted mt-2">
            Pick any name you like (letters, numbers, dashes), for example <span className="font-mono">my-shop-panel</span>.
            The old address stops working right away. Forgot it? Open <span className="font-mono">/go-admin</span> on your store while logged in.
          </p>
        </div>

        {/* Payment methods (Bangladesh) */}
        <div className="border-t border-surface-200 pt-6">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Payment Methods</p>

          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-sm font-medium text-ink-primary">Cash on Delivery</p>
              <p className="text-xs text-ink-muted">Customer pays in cash when the order arrives</p>
            </div>
            <PayToggle on={settings.cod_enabled !== false} onChange={v => setSettings(s => ({ ...s, cod_enabled: v }))} />
          </div>

          <WalletSettings
            label="bKash"
            on={!!settings.bkash_enabled}
            number={settings.bkash_number ?? ''}
            type={settings.bkash_type ?? 'personal'}
            onOn={v => setSettings(s => ({ ...s, bkash_enabled: v }))}
            onNumber={v => setSettings(s => ({ ...s, bkash_number: v }))}
            onType={v => setSettings(s => ({ ...s, bkash_type: v }))}
          />
          <WalletSettings
            label="Nagad"
            on={!!settings.nagad_enabled}
            number={settings.nagad_number ?? ''}
            type={settings.nagad_type ?? 'personal'}
            onOn={v => setSettings(s => ({ ...s, nagad_enabled: v }))}
            onNumber={v => setSettings(s => ({ ...s, nagad_number: v }))}
            onType={v => setSettings(s => ({ ...s, nagad_type: v }))}
          />

          <p className="text-xs text-ink-muted">
            For bKash and Nagad you confirm each payment yourself: open{' '}
            <a href={`/${adminPath}/orders`} className="text-brand-600 hover:underline">Orders</a>, compare the customer&apos;s
            Transaction ID with your bKash/Nagad app, then mark the order as Paid. These numbers are shown to customers at checkout.
          </p>
        </div>

        {/* Crypto Payment (USDT) */}
        <div className="border-t border-surface-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Crypto Payment (USDT)</p>
            <button
              onClick={() => setSettings(s => ({ ...s, crypto_usdt_enabled: !s.crypto_usdt_enabled }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${settings.crypto_usdt_enabled ? 'bg-brand-600' : 'bg-surface-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.crypto_usdt_enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {settings.crypto_usdt_enabled && (
            <div className="space-y-4 mb-3">
              <div>
                <label className="label">Your USDT Wallet Address</label>
                <input
                  className="input font-mono text-sm"
                  placeholder="e.g. TXn9Wz3...your Binance/Bybit deposit address"
                  value={settings.crypto_usdt_address ?? ''}
                  onChange={e => setSettings(s => ({ ...s, crypto_usdt_address: e.target.value }))}
                />
                <p className="text-xs text-ink-muted mt-1.5">
                  Copy this exactly from your Binance/Bybit "Deposit USDT" screen — get this wrong and payments can't be recovered.
                </p>
              </div>
              <div>
                <label className="label">Network</label>
                <select
                  className="input"
                  value={settings.crypto_usdt_network ?? 'TRC20'}
                  onChange={e => setSettings(s => ({ ...s, crypto_usdt_network: e.target.value }))}
                >
                  <option value="TRC20">TRC20 (Tron — lowest fees, most common)</option>
                  <option value="ERC20">ERC20 (Ethereum)</option>
                  <option value="BEP20">BEP20 (BNB Smart Chain)</option>
                </select>
                <p className="text-xs text-ink-muted mt-1.5">
                  Must match the network your wallet address above actually supports — check this in your exchange app.
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-ink-muted">
            When enabled, customers can choose to pay in USDT at checkout. Orders paid this way need <strong>manual verification</strong> —
            check your exchange account for the incoming transaction, then mark the order as Paid in{' '}
            <a href={`/${adminPath}/orders`} className="text-brand-600 hover:underline">Orders</a>.
          </p>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
