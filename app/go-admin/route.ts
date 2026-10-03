import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getOwnedStore } from '@/lib/ownedStore'

export const dynamic = 'force-dynamic'

// One stable door into the admin panel. Because each merchant can rename
// their admin address, everything that needs to "go to the admin" (login,
// password reset, emails, onboarding) comes through here and gets sent to
// the right place:   /go-admin            -> /<admin_path>
//                    /go-admin?to=orders  -> /<admin_path>/orders
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const to = (url.searchParams.get('to') || '').replace(/^\/+/, '')
  const safeTo = /^[a-z0-9\-/]{0,60}$/.test(to) ? to : ''

  const { data: { user } } = await supabaseServer().auth.getUser()
  if (!user) {
    const login = new URL('/login', url.origin)
    login.searchParams.set('redirect', `/go-admin${safeTo ? `?to=${safeTo}` : ''}`)
    return NextResponse.redirect(login)
  }

  const store = await getOwnedStore()
  if (!store) return NextResponse.redirect(new URL('/onboarding', url.origin))

  return NextResponse.redirect(new URL(`/${store.admin_path || 'admin'}${safeTo ? `/${safeTo}` : ''}`, url.origin))
}
