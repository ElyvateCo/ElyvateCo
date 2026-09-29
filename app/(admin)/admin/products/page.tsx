'use client'
import { useEffect, useState, useRef } from 'react'
import type { Product, Category } from '@/lib/supabase'
import { uploadLargeFile } from '@/lib/uploadLargeFile'
import { Plus, Pencil, Trash2, X, Upload, Star, GripVertical, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

const EMPTY: Partial<Product> = {
  name: '', slug: '', description: '', bullet_points: [],
  price: 0, compare_price: null, images: [], product_videos: [],
  promo_video_url: null, promo_video_enabled: false,
  category: '', stock_status: 'in_stock', is_featured: false, rating: 0, review_count: 0,
}

export default function AdminProducts() {
  const [products, setProducts]   = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState<Partial<Product>>(EMPTY)
  const [uploading, setUploading] = useState(false)
  const [videoUploading, setVideoUploading] = useState(false)
  const [promoUploading, setPromoUploading] = useState(false)
  const [newBullet, setNewBullet] = useState('')
  const fileRef    = useRef<HTMLInputElement>(null)
  const videoRef   = useRef<HTMLInputElement>(null)
  const promoRef   = useRef<HTMLInputElement>(null)
  const bulletRef  = useRef<HTMLInputElement>(null)

  const load = async () => {
    const res = await fetch('/api/admin/products')
    const data = await res.json()
    setProducts(Array.isArray(data) ? data : [])
  }

  const loadCategories = async () => {
    const res = await fetch('/api/admin/categories')
    const data = await res.json()
    setCategories(Array.isArray(data) ? data : [])
  }

  useEffect(() => { load(); loadCategories() }, [])

  function openNew() { setEditing(EMPTY); setNewBullet(''); setModal(true) }
  function openEdit(p: Product) { setEditing({ ...p, bullet_points: p.bullet_points ?? [], product_videos: p.product_videos ?? [], promo_video_url: p.promo_video_url ?? null, promo_video_enabled: p.promo_video_enabled ?? false }); setNewBullet(''); setModal(true) }

  // ── Bullet helpers ────────────────────────────────────────────
  function addBullet() {
    const text = newBullet.trim()
    if (!text) return
    setEditing(e => ({ ...e, bullet_points: [...(e.bullet_points ?? []), text] }))
    setNewBullet('')
    bulletRef.current?.focus()
  }

  function removeBullet(idx: number) {
    setEditing(e => ({ ...e, bullet_points: (e.bullet_points ?? []).filter((_, i) => i !== idx) }))
  }

  function editBullet(idx: number, val: string) {
    setEditing(e => {
      const arr = [...(e.bullet_points ?? [])]
      arr[idx] = val
      return { ...e, bullet_points: arr }
    })
  }

  function moveBullet(idx: number, dir: -1 | 1) {
    setEditing(e => {
      const arr = [...(e.bullet_points ?? [])]
      const swap = idx + dir
      if (swap < 0 || swap >= arr.length) return e;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]]
      return { ...e, bullet_points: arr }
    })
  }

  // ── Image upload ──────────────────────────────────────────────
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    formData.append('folder', 'products')
    try {
      const res  = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setEditing(prev => ({ ...prev, images: [...(prev.images ?? []), ...data.urls] }))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally { setUploading(false) }
  }

  // ── Video upload — signed-URL direct upload (bypasses Vercel's 4.5MB API
  // limit, while still requiring admin auth to obtain the upload token — see
  // lib/uploadLargeFile.ts and /api/admin/upload-url)
  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const file = files[0]
    const sizeMb = file.size / (1024 * 1024)
    if (sizeMb > 100) {
      toast.error(`Video is ${sizeMb.toFixed(0)}MB — max allowed is 100MB.`)
      return
    }

    setVideoUploading(true)
    try {
      const url = await uploadLargeFile(file, { bucket: 'product-videos', folder: 'products' })
      setEditing(prev => ({ ...prev, product_videos: [...(prev.product_videos ?? []), url] }))
      toast.success('Video uploaded!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Video upload failed')
    } finally {
      setVideoUploading(false)
    }
  }

  function removeImage(idx: number) {
    setEditing(e => ({ ...e, images: (e.images ?? []).filter((_, i) => i !== idx) }))
  }

  function removeVideo(idx: number) {
    setEditing(e => ({ ...e, product_videos: (e.product_videos ?? []).filter((_, i) => i !== idx) }))
  }

  // ── Promo video — scroll-triggered floating popup (9:16) ─────
  async function handlePromoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const sizeMb = file.size / (1024 * 1024)
    if (sizeMb > 100) { toast.error(`Video is ${sizeMb.toFixed(0)}MB — max 100MB.`); return }
    setPromoUploading(true)
    try {
      const url = await uploadLargeFile(file, { bucket: 'product-videos', folder: 'promo' })
      setEditing(prev => ({ ...prev, promo_video_url: url }))
      toast.success('Promo video uploaded!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally { setPromoUploading(false) }
  }

  // ── Save ──────────────────────────────────────────────────────
  async function handleSave() {
    if (!editing.name || !editing.slug || !editing.price) {
      toast.error('Name, slug and price are required'); return
    }
    try {
      const isEdit = !!editing.id
      const res = await fetch('/api/admin/products', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editing, bullet_points: editing.bullet_points ?? [], product_videos: editing.product_videos ?? [], promo_video_url: editing.promo_video_url ?? null, promo_video_enabled: editing.promo_video_enabled ?? false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      toast.success(isEdit ? 'Product updated!' : 'Product added!')
      setModal(false); load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return
    try {
      const res  = await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      toast.success('Deleted'); load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  function slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  const bullets = editing.bullet_points ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl font-semibold">Products</h1>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {products.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-ink-muted text-sm">No products yet. Add your first product!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50">
                <tr>
                  {['Product', 'Price', 'Category', 'Stock', 'Featured', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] && (
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-surface-100 shrink-0">
                            <Image src={p.images[0]} alt={p.name} fill className="object-cover" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-ink-primary">{p.name}</p>
                          <p className="text-ink-muted text-xs">{p.slug}</p>
                          {(p.bullet_points?.length ?? 0) > 0 && (
                            <p className="text-xs text-brand-600 mt-0.5">{p.bullet_points.length} bullet point{p.bullet_points.length !== 1 ? 's' : ''}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-semibold">${p.price.toFixed(2)}</td>
                    <td className="px-5 py-3 text-ink-secondary capitalize">{p.category || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-medium ${p.stock_status === 'in_stock' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {p.stock_status === 'in_stock' ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {p.is_featured && <Star size={14} className="text-amber-400 fill-amber-400" />}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(p)} className="p-2 rounded-xl hover:bg-surface-100 text-ink-secondary hover:text-ink-primary transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-xl hover:bg-red-50 text-ink-secondary hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-surface-200 sticky top-0 bg-white rounded-t-3xl z-10">
              <h2 className="font-display text-xl font-semibold">{editing.id ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setModal(false)} className="p-2 rounded-xl hover:bg-surface-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Images */}
              <div>
                <label className="label">Product Images</label>
                <div className="flex flex-wrap gap-3 mb-3">
                  {(editing.images ?? []).map((img, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden bg-surface-100 group">
                      <Image src={img} alt="" fill className="object-cover" />
                      <button onClick={() => removeImage(i)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-surface-300 flex flex-col items-center justify-center hover:border-brand-500 transition-colors text-ink-muted hover:text-brand-600"
                  >
                    {uploading ? <span className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /> : <Upload size={18} />}
                    <span className="text-xs mt-1">Upload</span>
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
              </div>

              {/* Videos */}
              <div>
                <label className="label">Product Video (optional)</label>
                <p className="text-xs text-ink-muted mb-3">Upload an MP4 or WebM video. Max 100MB. It will appear as the first item in the gallery on the product page.</p>
                <div className="flex flex-wrap gap-3 mb-3">
                  {(editing.product_videos ?? []).map((vid, i) => (
                    <div key={i} className="relative w-32 h-20 rounded-2xl overflow-hidden bg-surface-100 group">
                      <video src={vid} className="w-full h-full object-cover" muted playsInline />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">▶ Video</span>
                      </div>
                      <button
                        onClick={() => removeVideo(i)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X size={16} className="text-white" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => videoRef.current?.click()}
                    disabled={videoUploading}
                    className="w-32 h-20 rounded-2xl border-2 border-dashed border-surface-300 flex flex-col items-center justify-center hover:border-brand-500 transition-colors text-ink-muted hover:text-brand-600"
                  >
                    {videoUploading
                      ? <span className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                      : <><Upload size={16} /><span className="text-xs mt-1">Upload</span></>
                    }
                  </button>
                </div>
                <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleVideoUpload} />
              </div>

              {/* Basic fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Product Name *</label>
                  <input
                    className="input" placeholder="NebulaBot X8"
                    value={editing.name ?? ''}
                    onChange={e => setEditing(p => ({ ...p, name: e.target.value, slug: p.slug || slugify(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="label">Slug *</label>
                  <input
                    className="input" placeholder="nebulabot-x8"
                    value={editing.slug ?? ''}
                    onChange={e => setEditing(p => ({ ...p, slug: slugify(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="label">Price (USD) *</label>
                  <input
                    type="number" className="input" placeholder="49.99" min="0" step="0.01"
                    value={editing.price ?? ''}
                    onChange={e => setEditing(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="label">Compare Price (optional)</label>
                  <input
                    type="number" className="input" placeholder="69.99" min="0" step="0.01"
                    value={editing.compare_price ?? ''}
                    onChange={e => setEditing(p => ({ ...p, compare_price: parseFloat(e.target.value) || null }))}
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select
                    className="input"
                    value={editing.category ?? ''}
                    onChange={e => setEditing(p => ({ ...p, category: e.target.value }))}
                  >
                    <option value="">No category</option>
                    {/* If this product has a category that isn't in the table yet
                        (e.g. set before Categories existed), keep it selectable
                        instead of silently blanking it out on save. */}
                    {editing.category && !categories.some(c => c.name === editing.category) && (
                      <option value={editing.category}>{editing.category} (not in Categories list)</option>
                    )}
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="text-xs text-ink-muted mt-1.5">
                      No categories yet — add some in the Categories tab first.
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">Stock Status</label>
                  <select
                    className="input"
                    value={editing.stock_status ?? 'in_stock'}
                    onChange={e => setEditing(p => ({ ...p, stock_status: e.target.value as Product['stock_status'] }))}
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
                <div>
                  <label className="label">Rating (0–5)</label>
                  <input
                    type="number" className="input" min="0" max="5" step="0.1"
                    value={editing.rating ?? 0}
                    onChange={e => setEditing(p => ({ ...p, rating: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="label">Review Count</label>
                  <input
                    type="number" className="input" min="0"
                    value={editing.review_count ?? 0}
                    onChange={e => setEditing(p => ({ ...p, review_count: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input min-h-[100px] resize-y"
                  placeholder="Write a short overview of the product..."
                  value={editing.description ?? ''}
                  onChange={e => setEditing(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              {/* ── BULLET POINTS ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Key Features (Bullet Points)</label>
                  <span className="text-xs text-ink-muted">{bullets.length} point{bullets.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Existing bullets */}
                {bullets.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {bullets.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 group">
                        {/* Reorder buttons */}
                        <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveBullet(i, -1)}
                            disabled={i === 0}
                            className="w-5 h-4 flex items-center justify-center text-ink-muted hover:text-ink-primary disabled:opacity-30 text-[10px]"
                          >▲</button>
                          <button
                            onClick={() => moveBullet(i, 1)}
                            disabled={i === bullets.length - 1}
                            className="w-5 h-4 flex items-center justify-center text-ink-muted hover:text-ink-primary disabled:opacity-30 text-[10px]"
                          >▼</button>
                        </div>

                        <GripVertical size={14} className="text-surface-300 shrink-0" />

                        {/* Bullet icon */}
                        <CheckCircle2 size={14} className="text-brand-500 shrink-0" />

                        {/* Editable text */}
                        <input
                          className="flex-1 text-sm border border-surface-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-surface-50 hover:bg-white transition-colors"
                          value={b}
                          onChange={e => editBullet(i, e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && bulletRef.current?.focus()}
                        />

                        {/* Delete */}
                        <button
                          onClick={() => removeBullet(i)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-ink-muted hover:text-red-500 transition-colors shrink-0"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new bullet */}
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 border border-dashed border-brand-300 bg-brand-50/50 rounded-xl px-3 py-2 focus-within:border-brand-500 focus-within:bg-white transition-colors">
                    <Plus size={14} className="text-brand-500 shrink-0" />
                    <input
                      ref={bulletRef}
                      type="text"
                      className="flex-1 text-sm bg-transparent outline-none placeholder:text-ink-muted"
                      placeholder="Add a feature e.g. 8 Projection Modes"
                      value={newBullet}
                      onChange={e => setNewBullet(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBullet() } }}
                    />
                  </div>
                  <button
                    onClick={addBullet}
                    disabled={!newBullet.trim()}
                    className="btn-primary px-4 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
                <p className="text-xs text-ink-muted mt-1.5">Press Enter or click Add · Click any bullet to edit it · Use ▲▼ to reorder</p>
              </div>

              {/* ── Promo Video Popup ── */}
              <div className="border border-surface-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink-primary">Scroll Popup Video</p>
                    <p className="text-xs text-ink-muted mt-0.5">9:16 portrait video that appears when customer scrolls to bottom of product page</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={editing.promo_video_enabled ?? false}
                      onChange={e => setEditing(p => ({ ...p, promo_video_enabled: e.target.checked }))}
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${editing.promo_video_enabled ? 'bg-brand-600' : 'bg-surface-300'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${editing.promo_video_enabled ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                </div>

                {editing.promo_video_url ? (
                  <div className="flex items-center gap-3">
                    <video
                      src={editing.promo_video_url}
                      className="w-16 h-28 object-cover rounded-xl bg-surface-100"
                      muted playsInline
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-lg inline-block mb-2">✅ Video uploaded</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => promoRef.current?.click()}
                          className="btn-secondary text-xs py-1.5 px-3"
                          disabled={promoUploading}
                        >
                          Replace
                        </button>
                        <button
                          onClick={() => setEditing(p => ({ ...p, promo_video_url: null }))}
                          className="text-xs text-red-500 hover:text-red-600 px-2"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => promoRef.current?.click()}
                    disabled={promoUploading}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-surface-300 hover:border-brand-400 rounded-2xl py-4 text-sm text-ink-muted hover:text-brand-600 transition-colors"
                  >
                    {promoUploading
                      ? <><span className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /> Uploading...</>
                      : <><Upload size={16} /> Upload 9:16 Promo Video (MP4, max 100MB)</>
                    }
                  </button>
                )}
                <input ref={promoRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handlePromoUpload} />
              </div>

              {/* Featured */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-brand-600"
                  checked={editing.is_featured ?? false}
                  onChange={e => setEditing(p => ({ ...p, is_featured: e.target.checked }))}
                />
                <span className="text-sm font-medium text-ink-primary">Feature this product on homepage</span>
              </label>
            </div>

            <div className="p-6 border-t border-surface-200 flex justify-end gap-3">
              <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary">
                {editing.id ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
