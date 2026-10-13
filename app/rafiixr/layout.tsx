import { notFound } from 'next/navigation'
import { getPlatformAdmin } from '@/lib/platformAdmin'
import PanelShell from '@/components/rafiixr/PanelShell'

export const dynamic = 'force-dynamic'

// The main (platform owner) admin panel. Only the owner's account can open it,
// and only on the platform's own address — everyone else sees a plain 404.
export default async function RafiixrLayout({ children }: { children: React.ReactNode }) {
  const admin = await getPlatformAdmin()
  if (!admin) notFound()
  return <PanelShell email={admin.email ?? ''}>{children}</PanelShell>
}
