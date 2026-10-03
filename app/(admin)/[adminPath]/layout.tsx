import { notFound, redirect } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import { supabaseServer } from '@/lib/supabase-server'
import { getOwnedStore } from '@/lib/ownedStore'
import { getCurrentStore } from '@/lib/currentStore'
import { getPublicStoreUrl } from '@/lib/storeUrl'

export const dynamic = 'force-dynamic'

// The admin panel lives at /<adminPath>/..., and each merchant can rename
// that address (Settings -> Admin panel address). Any other first segment
// is a plain 404 — the panel doesn't reveal itself at the wrong address.
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { adminPath: string }
}) {
  const requested = decodeURIComponent(params.adminPath).toLowerCase()

  const { data: { user } } = await supabaseServer().auth.getUser()
  if (!user) {
    // Logged out: only point to the login page if this really is the
    // address of THIS store's admin panel. Anything else is just a 404.
    const hostStore = await getCurrentStore()
    if (hostStore && (hostStore.admin_path || 'admin') === requested) redirect('/login?redirect=/go-admin')
    notFound()
  }

  // Must own the store on this host, and be at that store's admin address
  const store = await getOwnedStore()
  if (!store || (store.admin_path || 'admin') !== requested) notFound()

  const storeUrl = getPublicStoreUrl(store.subdomain)
  const storeLabel = storeUrl.startsWith('http') ? storeUrl.replace(/^https?:\/\//, '') : `Store address: ${store.subdomain}`

  return (
    <AdminShell
      storeName={store.store_name}
      subdomain={store.subdomain}
      storeUrl={storeUrl}
      storeLabel={storeLabel}
      adminPath={requested}
    >
      {children}
    </AdminShell>
  )
}
