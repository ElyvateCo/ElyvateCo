'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabaseBrowser } from './supabase'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = supabaseBrowser()

    sb.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // A shopper who is logged in becomes a customer of THIS store (the server
  // records it). Done once per login per store.
  useEffect(() => {
    const token = session?.access_token
    const uid = session?.user?.id
    if (!token || !uid) return
    const preview = document.cookie.split('; ').find(c => c.startsWith('elyvate_preview_store='))?.split('=')[1] || ''
    const key = `joined:${uid}:${window.location.host}:${preview}`
    try { if (sessionStorage.getItem(key)) return } catch { /* storage blocked */ }
    fetch('/api/customer/join', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.ok) { try { sessionStorage.setItem(key, '1') } catch { /* ignore */ } } })
      .catch(() => {})
  }, [session])

  async function signOut() {
    const sb = supabaseBrowser()
    await sb.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
