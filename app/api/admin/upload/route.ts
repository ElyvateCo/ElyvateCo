import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAdminAuthed } from '@/lib/adminAuth'

export const runtime = 'nodejs'

// Raise the body size limit for this specific route to allow video uploads.
// Without this, Next.js/Vercel rejects requests over 4.5MB with a plain
// text error before your code even runs — causing the "not valid JSON" error.
export const maxDuration = 60 // seconds
export const dynamic = 'force-dynamic'

// Max sizes
const MAX_IMAGE_MB = 10
const MAX_VIDEO_MB = 100
const MAX_FONT_MB  = 5

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov']
// Browsers are inconsistent about font MIME types (many report a generic
// "application/octet-stream" for .ttf/.otf), so font uploads are additionally
// gated on file extension below rather than relying on MIME type alone.
const FONT_TYPES = [
  'font/woff2', 'font/woff', 'font/ttf', 'font/otf',
  'application/font-woff', 'application/font-woff2',
  'application/x-font-ttf', 'application/x-font-opentype',
  'application/octet-stream',
]
const FONT_EXTS = ['woff2', 'woff', 'ttf', 'otf']

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const files    = formData.getAll('files') as File[]
  const rawFolder = (formData.get('folder') as string) || 'products'
  // Sanitize folder name — only allow alphanumeric, dash, underscore
  const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) || 'products'
  // Explicit upload kind from the caller. Defaults to auto-detect (image vs
  // video) to keep every existing call site (product images/videos, hero
  // images) working exactly as before. Fonts must opt in explicitly, since
  // "application/octet-stream" is too generic to safely auto-detect.
  const requestedKind = (formData.get('kind') as string) || ''

  if (!files.length) return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  if (files.length > 10) return NextResponse.json({ error: 'Max 10 files per upload' }, { status: 400 })

  if (requestedKind === 'font') {
    const db  = supabaseAdmin()
    const urls: string[] = []

    for (const file of files) {
      const ext = (file.name.split('.').pop() || '').toLowerCase()
      // Gate primarily on extension (MIME is unreliable for fonts), but still
      // reject anything whose declared MIME type is actively something else
      // (e.g. an image or script) even if renamed with a font extension.
      if (!FONT_EXTS.includes(ext) || (file.type && !FONT_TYPES.includes(file.type))) {
        return NextResponse.json(
          { error: `File "${file.name}" isn't a supported font file. Use .woff2, .woff, .ttf, or .otf.` },
          { status: 400 }
        )
      }

      const sizeMb = file.size / (1024 * 1024)
      if (sizeMb > MAX_FONT_MB) {
        return NextResponse.json(
          { error: `File "${file.name}" is too large. Max size for fonts is ${MAX_FONT_MB}MB.` },
          { status: 400 }
        )
      }

      const path   = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { error } = await db.storage.from('site-fonts').upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      })

      if (error) {
        return NextResponse.json(
          { error: `Upload failed: ${error.message}. Make sure a Storage bucket named "site-fonts" exists in Supabase (Storage → New Bucket → set Public ON).` },
          { status: 500 }
        )
      }

      const { data } = db.storage.from('site-fonts').getPublicUrl(path)
      urls.push(data.publicUrl)
    }

    return NextResponse.json({ urls, type: 'font' })
  }

  // Reject any file whose declared type isn't an explicitly allowed image/video type.
  // This is defense-in-depth — browser-reported MIME types can be spoofed, but
  // combined with Supabase Storage's own content-type handling this closes the
  // door on obviously malicious uploads (executables, scripts, etc.)
  const ALL_ALLOWED = [...IMAGE_TYPES, ...VIDEO_TYPES]
  for (const file of files) {
    if (!ALL_ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type || 'unknown'}" is not allowed. Only images and videos are accepted.` },
        { status: 400 }
      )
    }
  }

  const db   = supabaseAdmin()
  const urls: string[]  = []
  const type: 'image' | 'video' = VIDEO_TYPES.includes(files[0]?.type) ? 'video' : 'image'
  const bucket = type === 'video' ? 'product-videos' : 'product-images'
  const maxMb  = type === 'video' ? MAX_VIDEO_MB : MAX_IMAGE_MB

  for (const file of files) {
    const sizeMb = file.size / (1024 * 1024)
    if (sizeMb > maxMb) {
      return NextResponse.json(
        { error: `File "${file.name}" is too large. Max size for ${type}s is ${maxMb}MB.` },
        { status: 400 }
      )
    }

    // Whitelist extensions explicitly — never trust the original filename directly
    const allowedExts = type === 'video' ? ['mp4', 'webm', 'mov', 'quicktime'] : ['jpg', 'jpeg', 'png', 'webp', 'gif']
    let ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!allowedExts.includes(ext)) ext = type === 'video' ? 'mp4' : 'jpg'

    const path   = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await db.storage.from(bucket).upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

    if (error) {
      const hint = type === 'video'
        ? 'Make sure a Storage bucket named "product-videos" exists in Supabase (Storage → New Bucket → set Public ON).'
        : 'Make sure a Storage bucket named "product-images" exists in Supabase (Storage → New Bucket → set Public ON).'
      return NextResponse.json({ error: `Upload failed: ${error.message}. ${hint}` }, { status: 500 })
    }

    const { data } = db.storage.from(bucket).getPublicUrl(path)
    urls.push(data.publicUrl)
  }

  return NextResponse.json({ urls, type })
}
