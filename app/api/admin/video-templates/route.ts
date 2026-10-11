import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'
import { parseHttpsUrl } from '@/lib/mediaLinks'

// Ready-made background videos (added by the platform owner in Supabase),
// offered to every merchant in Admin -> Hero.
export async function GET() {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin()
    .from('video_templates')
    .select('id, title, video_url, thumbnail_url')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json([])   // table not created yet → just no templates

  // Only hand out proper https links
  const clean = (data ?? [])
    .map(t => ({ id: t.id, title: t.title, video_url: parseHttpsUrl(t.video_url), thumbnail_url: parseHttpsUrl(t.thumbnail_url) }))
    .filter(t => t.video_url)
  return NextResponse.json(clean)
}
