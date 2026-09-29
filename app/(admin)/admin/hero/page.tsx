'use client'
import { useEffect, useState, useRef } from 'react'
import type { HeroSection } from '@/lib/supabase'
import { uploadLargeFile } from '@/lib/uploadLargeFile'
import { Upload, Monitor, Smartphone, Video } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function AdminHero() {
  const [hero, setHero] = useState<Partial<HeroSection>>({})
  const [uploadingDesktop, setUploadingDesktop] = useState(false)
  const [uploadingMobile, setUploadingMobile] = useState(false)
  const [uploadingVideoDesktop, setUploadingVideoDesktop] = useState(false)
  const [uploadingVideoMobile, setUploadingVideoMobile] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const fileRefMobile = useRef<HTMLInputElement>(null)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const videoFileRefMobile = useRef<HTMLInputElement>(null)

  const morphWordsPreview = (hero.headline_morph_words ?? '')
    .split(/\r?\n/).map(w => w.trim()).filter(Boolean)
  const isAnimated = morphWordsPreview.length >= 2

  useEffect(() => {
    fetch('/api/admin/hero')
      .then(r => r.json())
      .then(data => { if (data && !data.error) setHero(data) })
  }, [])

  async function uploadImage(file: File, field: 'bg_image' | 'bg_image_mobile') {
    const setUploading = field === 'bg_image' ? setUploadingDesktop : setUploadingMobile
    setUploading(true)

    const formData = new FormData()
    formData.append('files', file)
    formData.append('folder', 'hero')

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setHero(h => ({ ...h, [field]: data.urls[0] }))
      toast.success('Image uploaded!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleDesktopUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadImage(file, 'bg_image')
  }

  function handleMobileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadImage(file, 'bg_image_mobile')
  }

  // Uploading directly to Supabase Storage (via a signed URL) instead of
  // relying on a pasted link fixes the "sometimes shows, sometimes doesn't"
  // problem — pasted links depend on whatever third-party site is hosting
  // them (many block hotlinking, some links aren't direct video files at
  // all, e.g. a YouTube page URL instead of an .mp4). An uploaded file lives
  // on your own reliable storage instead.
  async function uploadVideo(file: File, field: 'bg_video' | 'bg_video_mobile') {
    const sizeMb = file.size / (1024 * 1024)
    if (sizeMb > 100) { toast.error(`Video is ${sizeMb.toFixed(0)}MB — max allowed is 100MB.`); return }

    const setUploading = field === 'bg_video' ? setUploadingVideoDesktop : setUploadingVideoMobile
    setUploading(true)
    try {
      const url = await uploadLargeFile(file, { bucket: 'product-videos', folder: field === 'bg_video' ? 'hero' : 'hero-mobile' })
      setHero(h => ({ ...h, [field]: url }))
      toast.success('Video uploaded!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Video upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleDesktopVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadVideo(file, 'bg_video')
  }

  function handleMobileVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadVideo(file, 'bg_video_mobile')
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/hero', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hero),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      toast.success('Hero section saved!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-8">Hero Section</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="bg-white rounded-2xl shadow-card p-6 space-y-5">
          <div>
            <label className="label">Headline</label>
            <input
              className="input" placeholder="Elevate Your Space"
              value={hero.headline ?? ''}
              onChange={e => setHero(h => ({ ...h, headline: e.target.value }))}
            />
            <p className="text-xs text-ink-muted mt-1.5">Used as-is unless you add animated words below.</p>
          </div>
          <div>
            <label className="label">Animated Headline Words (optional)</label>
            <textarea
              className="input resize-none min-h-[90px] font-mono text-sm"
              placeholder={'Elevate\nYour Space\nYour Mood'}
              value={hero.headline_morph_words ?? ''}
              onChange={e => setHero(h => ({ ...h, headline_morph_words: e.target.value }))}
            />
            <p className="text-xs text-ink-muted mt-1.5">
              One word or short phrase per line. Add <strong>2 or more</strong> and the headline will morph between
              them in a loop instead of showing the static Headline above. Leave empty to keep it static.
            </p>
          </div>
          <div>
            <label className="label">Subheadline</label>
            <textarea
              className="input resize-none min-h-[80px]"
              placeholder="Premium ambient lighting..."
              value={hero.subheadline ?? ''}
              onChange={e => setHero(h => ({ ...h, subheadline: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">CTA Button Text</label>
              <input
                className="input" placeholder="Shop Now"
                value={hero.cta_text ?? ''}
                onChange={e => setHero(h => ({ ...h, cta_text: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">CTA Link</label>
              <input
                className="input" placeholder="/products"
                value={hero.cta_link ?? ''}
                onChange={e => setHero(h => ({ ...h, cta_link: e.target.value }))}
              />
            </div>
          </div>

          {/* Desktop Background */}
          <div className="border-t border-surface-200 pt-5">
            <label className="label flex items-center gap-2">
              <Monitor size={14} />
              Desktop / Laptop Banner
            </label>

            {hero.bg_image && (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-3 bg-surface-100">
                <Image src={hero.bg_image} alt="Desktop hero background" fill className="object-cover" />
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingDesktop}
              className="btn-outline w-full flex items-center justify-center gap-2"
            >
              {uploadingDesktop
                ? <span className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                : <Upload size={16} />
              }
              {hero.bg_image ? 'Replace Image' : 'Upload Image'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleDesktopUpload} />
            <p className="text-xs text-ink-muted mt-1.5 mb-3">Recommended: 1920×1080px or larger, landscape</p>

            {/* Desktop video */}
            <label className="label flex items-center gap-2 mt-3">
              <Video size={14} />
              Video (optional)
            </label>
            <button
              onClick={() => videoFileRef.current?.click()}
              disabled={uploadingVideoDesktop}
              className="btn-outline w-full flex items-center justify-center gap-2"
            >
              {uploadingVideoDesktop
                ? <span className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                : <Upload size={16} />
              }
              {hero.bg_video ? 'Replace Video' : 'Upload Video'}
            </button>
            <input ref={videoFileRef} type="file" accept="video/*" className="hidden" onChange={handleDesktopVideoUpload} />
            <p className="text-xs text-ink-muted mt-1.5 mb-2">
              Recommended — uploaded videos always play reliably. Max 100MB.
            </p>
            <input
              className="input text-xs" placeholder="...or paste a direct .mp4 link instead"
              value={hero.bg_video ?? ''}
              onChange={e => setHero(h => ({ ...h, bg_video: e.target.value }))}
            />
            <p className="text-xs text-ink-muted mt-1.5">
              If set, this video plays instead of the image above. Pasted links depend on where they're hosted and can
              fail to load (blocked hotlinking, not a direct file, etc.) — uploading is more reliable. The image above is
              used as a poster/fallback either way.
            </p>
          </div>

          {/* Mobile Background */}
          <div className="border-t border-surface-200 pt-5">
            <label className="label flex items-center gap-2">
              <Smartphone size={14} />
              Mobile Banner
            </label>

            {hero.bg_image_mobile && (
              <div className="relative w-full max-w-[180px] aspect-[9/16] rounded-2xl overflow-hidden mb-3 bg-surface-100">
                <Image src={hero.bg_image_mobile} alt="Mobile hero background" fill className="object-cover" />
              </div>
            )}
            <button
              onClick={() => fileRefMobile.current?.click()}
              disabled={uploadingMobile}
              className="btn-outline w-full flex items-center justify-center gap-2"
            >
              {uploadingMobile
                ? <span className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                : <Upload size={16} />
              }
              {hero.bg_image_mobile ? 'Replace Image' : 'Upload Image'}
            </button>
            <input ref={fileRefMobile} type="file" accept="image/*" className="hidden" onChange={handleMobileUpload} />
            <p className="text-xs text-ink-muted mt-1.5 mb-3">Recommended: 1080×1920px (9:16), subject centered. Falls back to desktop image if not set.</p>

            {/* Mobile video */}
            <label className="label flex items-center gap-2 mt-3">
              <Video size={14} />
              Video (optional)
            </label>
            <button
              onClick={() => videoFileRefMobile.current?.click()}
              disabled={uploadingVideoMobile}
              className="btn-outline w-full flex items-center justify-center gap-2"
            >
              {uploadingVideoMobile
                ? <span className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                : <Upload size={16} />
              }
              {hero.bg_video_mobile ? 'Replace Video' : 'Upload Video'}
            </button>
            <input ref={videoFileRefMobile} type="file" accept="video/*" className="hidden" onChange={handleMobileVideoUpload} />
            <p className="text-xs text-ink-muted mt-1.5 mb-2">Max 100MB. Falls back to the desktop video if not set.</p>
            <input
              className="input text-xs" placeholder="...or paste a direct .mp4 link instead"
              value={hero.bg_video_mobile ?? ''}
              onChange={e => setHero(h => ({ ...h, bg_video_mobile: e.target.value }))}
            />
          </div>

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving...' : 'Save Hero Section'}
          </button>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          {/* Desktop preview */}
          <div>
            <p className="label mb-3 flex items-center gap-2">
              <Monitor size={14} />
              Desktop Preview
            </p>
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-[#070a0f] flex items-center">
              {hero.bg_video ? (
                <video
                  src={hero.bg_video}
                  poster={hero.bg_image || undefined}
                  autoPlay muted loop playsInline
                  className="absolute inset-0 w-full h-full object-cover opacity-70"
                />
              ) : hero.bg_image ? (
                <Image src={hero.bg_image} alt="" fill className="object-cover opacity-70" />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
              <div className="relative z-10 p-6">
                <p className="text-brand-400 text-xs font-semibold tracking-widest uppercase mb-2">New Collection</p>
                <h2 className="font-display text-xl font-bold text-white mb-2 flex items-center gap-2">
                  {isAnimated ? morphWordsPreview[0] : (hero.headline || 'Elevate Your Space')}
                  {isAnimated && <span className="text-[9px] font-sans font-semibold bg-brand-600 px-1.5 py-0.5 rounded-md tracking-wide">ANIMATED</span>}
                </h2>
                <p className="text-white/70 text-xs mb-4 max-w-xs">{hero.subheadline || 'Your subheadline here...'}</p>
                <span className="bg-brand-600 text-white text-xs px-4 py-2 rounded-xl font-medium">
                  {hero.cta_text || 'Shop Now'}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile preview */}
          <div>
            <p className="label mb-3 flex items-center gap-2">
              <Smartphone size={14} />
              Mobile Preview
            </p>
            <div className="relative rounded-2xl overflow-hidden aspect-[9/16] max-w-[220px] bg-[#070a0f] flex items-end">
              {(hero.bg_video_mobile || hero.bg_video) ? (
                <video
                  src={(hero.bg_video_mobile || hero.bg_video) as string}
                  poster={(hero.bg_image_mobile || hero.bg_image) || undefined}
                  autoPlay muted loop playsInline
                  className="absolute inset-0 w-full h-full object-cover opacity-70"
                />
              ) : (hero.bg_image_mobile || hero.bg_image) ? (
                <Image src={(hero.bg_image_mobile || hero.bg_image) as string} alt="" fill className="object-cover opacity-70" />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
              <div className="relative z-10 p-4 pb-8">
                <p className="text-brand-400 text-[10px] font-semibold tracking-widest uppercase mb-1.5">New Collection</p>
                <h2 className="font-display text-base font-bold text-white mb-1.5 leading-tight flex items-center gap-1.5">
                  {isAnimated ? morphWordsPreview[0] : (hero.headline || 'Elevate Your Space')}
                  {isAnimated && <span className="text-[8px] font-sans font-semibold bg-brand-600 px-1 py-0.5 rounded tracking-wide">ANIM</span>}
                </h2>
                <span className="inline-block bg-brand-600 text-white text-[10px] px-3 py-1.5 rounded-lg font-medium">
                  {hero.cta_text || 'Shop Now'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
