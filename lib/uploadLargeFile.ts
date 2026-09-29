import { supabaseBrowser } from './supabase'

/**
 * Uploads a large file (e.g. video) directly to Supabase Storage, bypassing
 * Vercel's ~4.5MB serverless request body limit. Auth is still enforced:
 * the signed upload token can only be obtained by an authenticated admin
 * (via /api/admin/upload-url), even though the file bytes themselves go
 * straight to Supabase rather than through our own API route.
 *
 * Throws an Error with a user-presentable message on failure.
 */
export async function uploadLargeFile(
  file: File,
  opts: { bucket: 'product-videos'; folder: string }
): Promise<string> {
  // 1. Ask our server (admin-authenticated) for a signed, single-use upload token
  const tokenRes = await fetch('/api/admin/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket: opts.bucket, folder: opts.folder, filename: file.name }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenRes.ok) throw new Error(tokenData.error || 'Failed to prepare upload')

  // 2. Upload the actual file bytes directly to Supabase Storage using that token
  const sb = supabaseBrowser()
  const { error } = await sb.storage
    .from(opts.bucket)
    .uploadToSignedUrl(tokenData.path, tokenData.token, file, { contentType: file.type })

  if (error) throw new Error(error.message)

  return tokenData.publicUrl as string
}
