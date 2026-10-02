import { redirect } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import { supabaseServer } from '@/lib/supabase-server'
import { getOwnedStore } from '@/lib/ownedStore'
import { getPublicStoreUrl } from '@/lib/storeUrl'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: { user } } = await supabaseServer().auth.getUser()
  if (!user) redirect('/login?redirect=/admin')

  // Logged in, but this host isn't their store (or they have no store yet):
  // never render another merchant's admin shell.
  const store = await getOwnedStore()
  if (!store) redirect('/')

  const storeUrl = getPublicStoreUrl(store.subdomain)
  // Real address when it exists (shop.elyvateco.com); on the Vercel preview
  // URL there is no separate address yet, so just show the store's short name.
  const storeLabel = storeUrl.startsWith('http') ? storeUrl.replace(/^https?:\/\//, '') : `Store address: ${store.subdomain}`

  return (
    <AdminShell storeName={store.store_name} subdomain={store.subdomain} storeUrl={storeUrl} storeLabel={storeLabel}>
      {children}
    </AdminShell>
  )
}
