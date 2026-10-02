import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminLightModeGuard from '@/components/admin/AdminLightModeGuard'
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

  return (
    <div className="min-h-screen bg-surface-50 flex">
      <AdminLightModeGuard />
      <AdminSidebar storeName={store.store_name} storeUrl={getPublicStoreUrl(store.subdomain)} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-10 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
