import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'

type Customer = {
  key: string
  name: string | null
  email: string | null
  phone: string | null
  hasAccount: boolean
  joined: string | null
  orders: number
  spent: number
  lastOrder: string | null
}

// This store's customers: shoppers who made an account on THIS store, plus
// everyone who ordered (accounts and guests together, merged by email/phone).
export async function GET() {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  const [{ data: members }, { data: orders }] = await Promise.all([
    db.from('store_customers').select('email, full_name, phone, created_at').eq('store_id', store.id).limit(2000),
    db.from('orders').select('customer_name, customer_email, customer_phone, total_price, payment_status, created_at').eq('store_id', store.id).limit(5000),
  ])

  const map = new Map<string, Customer>()
  const keyOf = (email?: string | null, phone?: string | null) => (email ? email.toLowerCase() : phone ? `tel:${phone}` : '')

  for (const m of members ?? []) {
    const key = keyOf(m.email, m.phone)
    if (!key) continue
    map.set(key, { key, name: m.full_name, email: m.email, phone: m.phone, hasAccount: true, joined: m.created_at, orders: 0, spent: 0, lastOrder: null })
  }

  for (const o of orders ?? []) {
    const key = keyOf(o.customer_email, o.customer_phone)
    if (!key) continue
    const c = map.get(key) ?? { key, name: null, email: o.customer_email || null, phone: null, hasAccount: false, joined: null, orders: 0, spent: 0, lastOrder: null }
    c.orders += 1
    if (o.payment_status === 'paid') c.spent += Number(o.total_price) || 0
    c.name = c.name || o.customer_name || null
    c.phone = c.phone || o.customer_phone || null
    if (!c.lastOrder || o.created_at > c.lastOrder) c.lastOrder = o.created_at
    map.set(key, c)
  }

  const list = Array.from(map.values())
    .sort((a, b) => (b.lastOrder ?? b.joined ?? '').localeCompare(a.lastOrder ?? a.joined ?? ''))
    .slice(0, 500)
  return NextResponse.json(list)
}
