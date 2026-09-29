import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import BottomNav from '@/components/store/BottomNav'
import AnnouncementBar from '@/components/store/AnnouncementBar'
import { supabase } from '@/lib/supabase'
import { requireCurrentStore } from '@/lib/currentStore'
import { StoreProvider } from '@/lib/storeContext'

// Same revalidation window as the rest of the storefront pages.
export const dynamic = 'force-dynamic'

async function getAnnouncement(storeId: string) {
  const { data } = await supabase
    .from('site_settings')
    .select('announcement_text, announcement_active')
    .eq('store_id', storeId)
    .maybeSingle()
  return data?.announcement_active ? (data.announcement_text ?? null) : null
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  // 404s automatically if this hostname doesn't belong to any store
  const store = await requireCurrentStore()
  const announcementText = await getAnnouncement(store.id)

  return (
    <StoreProvider storeId={store.id}>
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar text={announcementText} />
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <div className="hidden md:block">
        <Footer />
      </div>
      <BottomNav />
    </div>
    </StoreProvider>
  )
}
