'use client'
import { createContext, useContext } from 'react'

// Lets client components (search, checkout, notifications…) know which
// store they're inside without trusting anything from the browser — the
// value is set on the server in app/(store)/layout.tsx from the hostname.
const StoreContext = createContext<string | null>(null)

export function StoreProvider({ storeId, children }: { storeId: string; children: React.ReactNode }) {
  return <StoreContext.Provider value={storeId}>{children}</StoreContext.Provider>
}

export function useStoreId(): string | null {
  return useContext(StoreContext)
}
