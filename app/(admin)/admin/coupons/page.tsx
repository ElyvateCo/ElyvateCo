'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, X, Tag, ToggleLeft, ToggleRight, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

type Coupon = {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  min_order: number
  usage_limit: number | null
  usage_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

const EMPTY_FORM = {
  code: '', type: 'percentage' as 'percentage' | 'fixed',
  value: '', min_order: '', usage_limit: '', expires_at: '', is_active: true,
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/coupons')
    const data = await res.json()
    setCoupons(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() { setForm(EMPTY_FORM); setModal(true) }

  async function handleSave() {
    if (!form.code || !form.value) { toast.error('Code and value are required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          value: parseFloat(form.value),
          min_order: form.min_order ? parseFloat(form.min_order) : 0,
          usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
          expires_at: form.expires_at || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create coupon')
      toast.success('Coupon created!')
      setModal(false)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create coupon')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, code: string) {
    if (!confirm(`Delete coupon "${code}"? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Coupon deleted'); load() }
    else toast.error('Failed to delete coupon')
  }

  async function toggleActive(coupon: Coupon) {
    const res = await fetch('/api/admin/coupons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: coupon.id, is_active: !coupon.is_active }),
    })
    if (res.ok) { toast.success(coupon.is_active ? 'Coupon deactivated' : 'Coupon activated'); load() }
    else toast.error('Failed to update coupon')
  }

  function copyCode(code: string) {
    if (!navigator.clipboard) { toast.error('Copy not available'); return }
    navigator.clipboard.writeText(code)
    toast.success('Code copied!')
  }

  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setForm(f => ({ ...f, code }))
  }

  const isExpired = (c: Coupon) => c.expires_at ? new Date(c.expires_at) < new Date() : false

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Coupon Codes</h1>
          <p className="text-sm text-ink-muted mt-1">Create and manage discount coupons for your store</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Create Coupon
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Coupons', value: coupons.length },
          { label: 'Active', value: coupons.filter(c => c.is_active && !isExpired(c)).length },
          { label: 'Total Uses', value: coupons.reduce((s, c) => s + c.usage_count, 0) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-card">
            <p className="text-2xl font-bold text-ink-primary">{value}</p>
            <p className="text-xs text-ink-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Coupons list */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-16 text-center">
            <Tag size={32} className="text-ink-muted mx-auto mb-3" />
            <p className="text-ink-muted text-sm">No coupons yet. Create your first one!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50">
                <tr>
                  {['Code', 'Discount', 'Min Order', 'Usage', 'Expires', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {coupons.map(c => {
                  const expired = isExpired(c)
                  return (
                    <tr key={c.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg text-xs">
                            {c.code}
                          </span>
                          <button
                            onClick={() => copyCode(c.code)}
                            className="p-1 text-ink-muted hover:text-ink-primary transition-colors"
                            title="Copy code"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-ink-primary">
                        {c.type === 'percentage' ? `${c.value}% off` : `$${c.value.toFixed(2)} off`}
                      </td>
                      <td className="px-5 py-4 text-ink-secondary">
                        {c.min_order > 0 ? `$${c.min_order.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-5 py-4 text-ink-secondary">
                        {c.usage_count}
                        {c.usage_limit !== null ? ` / ${c.usage_limit}` : ' / ∞'}
                      </td>
                      <td className="px-5 py-4 text-ink-secondary">
                        {c.expires_at
                          ? <span className={expired ? 'text-red-500' : ''}>
                              {new Date(c.expires_at).toLocaleDateString()}
                            </span>
                          : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-medium ${
                          expired ? 'bg-gray-100 text-gray-500' :
                          c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {expired ? 'Expired' : c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleActive(c)}
                            className="p-2 rounded-xl hover:bg-surface-100 text-ink-secondary hover:text-ink-primary transition-colors"
                            title={c.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {c.is_active ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} />}
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.code)}
                            className="p-2 rounded-xl hover:bg-red-50 text-ink-secondary hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-surface-200">
              <h2 className="font-display text-xl font-semibold">Create Coupon</h2>
              <button onClick={() => setModal(false)} className="p-2 rounded-xl hover:bg-surface-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Code */}
              <div>
                <label className="label">Coupon Code *</label>
                <div className="flex gap-2">
                  <input
                    className="input uppercase"
                    placeholder="e.g. SAVE20"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  />
                  <button
                    onClick={generateCode}
                    className="btn-secondary shrink-0 text-xs px-4"
                  >
                    Generate
                  </button>
                </div>
              </div>

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Discount Type *</label>
                  <select
                    className="input"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as 'percentage' | 'fixed' }))}
                  >
                    <option value="percentage">Percentage (% off)</option>
                    <option value="fixed">Fixed Amount ($ off)</option>
                  </select>
                </div>
                <div>
                  <label className="label">
                    {form.type === 'percentage' ? 'Percentage (1–100) *' : 'Amount ($) *'}
                  </label>
                  <input
                    type="number"
                    className="input"
                    placeholder={form.type === 'percentage' ? '20' : '10.00'}
                    min="0"
                    max={form.type === 'percentage' ? '100' : undefined}
                    step={form.type === 'percentage' ? '1' : '0.01'}
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  />
                </div>
              </div>

              {/* Min order + Usage limit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Minimum Order ($)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="0 = no minimum"
                    min="0"
                    step="0.01"
                    value={form.min_order}
                    onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Usage Limit</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Leave blank = unlimited"
                    min="1"
                    value={form.usage_limit}
                    onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))}
                  />
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label className="label">Expiry Date (optional)</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                />
              </div>

              {/* Preview */}
              {form.code && form.value && (
                <div className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
                  <p className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-1">Preview</p>
                  <p className="text-sm text-brand-800">
                    Code <span className="font-mono font-bold">{form.code}</span> gives{' '}
                    <span className="font-bold">
                      {form.type === 'percentage' ? `${form.value}% off` : `$${parseFloat(form.value || '0').toFixed(2)} off`}
                    </span>
                    {form.min_order ? ` on orders over $${parseFloat(form.min_order).toFixed(2)}` : ''}
                    {form.usage_limit ? ` · ${form.usage_limit} uses max` : ' · unlimited uses'}
                    {form.expires_at ? ` · expires ${new Date(form.expires_at).toLocaleDateString()}` : ' · never expires'}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-surface-200 flex justify-end gap-3">
              <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Tag size={14} />}
                Create Coupon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
