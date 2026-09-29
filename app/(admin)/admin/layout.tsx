import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminLightModeGuard from '@/components/admin/AdminLightModeGuard'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-50 flex">
      <AdminLightModeGuard />
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-10 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
