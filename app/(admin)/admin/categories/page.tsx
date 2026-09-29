'use client'
import { useEffect, useState, useRef } from 'react'
import { Plus, Trash2, X, FolderTree, Upload, ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Category } from '@/lib/supabase'

const EMPTY_FORM = { name: '', image_url: '' }

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/categories')
    const data = await res.json()
    setCategories(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() { setForm(EMPTY_FORM); setModal(true) }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('files', file)
    formData.append('folder', 'categories')
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setForm(f => ({ ...f, image_url: data.urls[0] }))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create category')
      toast.success('Category created!')
      setModal(false)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create category')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Products that already use this category will keep it as text, but it'll disappear from the homepage and the category picker.`)) return
    const res = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Category deleted'); load() }
    else toast.error('Failed to delete category')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-ink-muted mt-1">Shown on your homepage and used to filter products</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Category
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-16 text-center">
          <FolderTree size={32} className="text-ink-muted mx-auto mb-3" />
          <p className="text-ink-muted text-sm">No categories yet. Add your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map(c => (
            <div key={c.id} className="bg-white rounded-2xl shadow-card overflow-hidden group relative">
              <div className="aspect-square bg-surface-100 relative">
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={24} className="text-ink-muted" />
                  </div>
                )}
                <button
                  onClick={() => handleDelete(c.id, c.name)}
                  className="absolute top-2 right-2 p-2 rounded-xl bg-white/90 backdrop-blur-sm text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-ink-primary truncate">{c.name}</p>
                <p className="text-xs text-ink-muted truncate font-mono">/{c.slug}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-surface-200">
              <h2 className="font-display text-xl font-semibold">Add Category</h2>
              <button onClick={() => setModal(false)} className="p-2 rounded-xl hover:bg-surface-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="label">Category Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Ambient Lighting"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Image (optional)</label>
                {form.image_url ? (
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-surface-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-red-500 hover:bg-red-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="btn-outline w-full flex items-center justify-center gap-2"
                  >
                    {uploading
                      ? <span className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                      : <Upload size={16} />}
                    Upload Image
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <p className="text-xs text-ink-muted mt-1.5">Shown as a tile on your homepage. Looks fine without one too.</p>
              </div>
            </div>

            <div className="p-6 border-t border-surface-200 flex justify-end gap-3">
              <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={14} />}
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
