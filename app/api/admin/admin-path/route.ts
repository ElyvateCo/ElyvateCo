import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'
import { validateAdminPath } from '@/lib/adminPath'

// Lets a merchant rename their admin panel address (stored in Supabase).
export async function PUT(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const check = validateAdminPath(body.adminPath)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const { error } = await supabaseAdmin().from('stores').update({ admin_path: check.value }).eq('id', store.id)
  if (error) return NextResponse.json({ error: 'Could not save the new address' }, { status: 500 })

  return NextResponse.json({ adminPath: check.value })
}
