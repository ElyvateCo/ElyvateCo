'use client'
import { createContext, useContext } from 'react'

// The admin panel lives at /<adminPath>/... and the merchant can rename it,
// so admin pages never hardcode "/admin" — they read it from here.
const AdminPathContext = createContext<string>('admin')

export const AdminPathProvider = AdminPathContext.Provider
export function useAdminPath(): string {
  return useContext(AdminPathContext)
}
