import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAdminAuthed } from '@/lib/adminAuth'

// Whitelist of buckets this route is allowed to issue upload tokens for —
// prevents a caller from requesting a signed URL into an arbitrary bucket.
const ALLOWED_BUCKETS = ['product-videos']

// This exists specifically for LARGE files (videos) that exceed Vercel's
// ~4.5MB request body limit for serverless functions — a hard platform
// limit that isn't fixable via Next.js config (maxDuration/bodySizeLimit
// control execution time and Server Actions respectively, not this).
//
// Instead of uploading the file's bytes through this API route, the client
// gets a short-lived, single-use signed upload token from here (which does
// require admin auth), then uploads the actual file DIRECTLY to Supabase
// Storage using that token — the large payload never touches Vercel at all.
//
// This keeps the security property that mattered: only an authenticated
// admin can ever obtain a valid upload token, even though the file bytes
// bypass our own server.
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { bucket, folder, filename } = await req.json()

    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
    }

    const safeFolder = String(folder || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) || 'misc'
    const ext = String(filename || '').split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'mp4'
    const path = `${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const db = supabaseAdmin()
    const { data, error } = await db.storage.from(bucket).createSignedUploadUrl(path)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: pub } = db.storage.from(bucket).getPublicUrl(path)

    return NextResponse.json({ token: data.token, path: data.path, publicUrl: pub.publicUrl })
  } catch (err) {
    console.error('Signed upload URL error:', err)
    return NextResponse.json({ error: 'Failed to prepare upload' }, { status: 500 })
  }
}
