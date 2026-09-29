import { supabaseServer } from './supabase-server'
import { supabaseAdmin } from './supabase'

export type OwnedStore = {
  id: string
  store_name: string
  subdomain: string
  admin_path: string
  plan: 'free' | 'premium'
  business_category?: string | null
  // undefined until the onboarding migration has been run — treat only an
  // explicit `false` as "still needs onboarding"
  onboarding_completed?: boolean
}

// Returns the store the currently logged-in merchant owns, or null if
// they're not logged in or don't have a store yet. Every /api/admin/*
// route uses this — instead of just checking "is anyone logged in" — so a
// merchant can only ever read/write their OWN store's data, never
// another merchant's, no matter what id they pass in a request.
export async function getOwnedStore(): Promise<OwnedStore | null> {
  const sb = supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null

  const admin = supabaseAdmin()
  const { data: store } = await admin
    .from('stores')
    .select('*')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  return store
}
