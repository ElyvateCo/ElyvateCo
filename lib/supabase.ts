import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side / shared read-only client (no auth session)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Browser client — singleton, keeps auth session in localStorage
let _browserClient: SupabaseClient | null = null
export function supabaseBrowser(): SupabaseClient {
  if (!_browserClient) {
    _browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return _browserClient
}

// Server-side admin client (never expose to frontend)
export const supabaseAdmin = () =>
  createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

// ─── Types ──────────────────────────────────────────────────────────────────

export type Product = {
  store_id?: string
  id: string
  name: string
  slug: string
  description: string
  bullet_points: string[]
  price: number
  compare_price: number | null
  images: string[]
  product_videos: string[]
  promo_video_url: string | null
  promo_video_enabled: boolean
  category: string
  stock_status: 'in_stock' | 'out_of_stock'
  is_featured: boolean
  rating: number
  review_count: number
  created_at: string
}

export type Category = {
  store_id?: string
  id: string
  name: string
  slug: string
  image_url: string | null
  display_order: number
  created_at: string
}

export type Order = {
  store_id?: string
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  customer_city: string
  customer_country: string
  customer_zip: string
  product_id: string
  product_name: string
  quantity: number
  total_price: number
  payment_status: 'pending' | 'paid' | 'failed'
  payment_method: 'card' | 'crypto_usdt'
  crypto_amount: number | null
  crypto_network: string | null
  order_status: 'processing' | 'fulfilled' | 'shipped' | 'delivered' | 'cancelled'
  twocheckout_ref: string | null
  coupon_code: string | null
  discount_amount: number
  tracking_number: string | null
  tracking_carrier: string | null
  supplier_order_id: string | null
  fulfilled_at: string | null
  notes: string | null
  created_at: string
}

export type HeroSection = {
  store_id?: string
  id: string
  headline: string
  subheadline: string
  cta_text: string
  cta_link: string
  bg_image: string
  bg_image_mobile: string | null
  bg_video: string | null
  bg_video_mobile: string | null
  headline_morph_words: string | null
}

export type SiteSettings = {
  store_id?: string
  id: string
  store_name: string
  logo_url: string | null
  announcement_text: string | null
  announcement_active: boolean
  instagram_url: string | null
  tiktok_url: string | null
  facebook_url: string | null
  custom_font_url: string | null
  custom_font_name: string | null
  theme_preset: string | null
  custom_theme_hex: string | null
  crypto_usdt_enabled: boolean
  crypto_usdt_address: string | null
  crypto_usdt_network: string | null
}

export type ContactMessage = {
  store_id?: string
  id: string
  name: string
  email: string
  order_id: string | null
  message: string
  status: 'new' | 'read' | 'replied'
  created_at: string
}

export type Notification = {
  store_id?: string
  id: string
  type: 'broadcast' | 'order_update'
  title: string
  message: string
  link: string | null
  order_id: string | null
  created_at: string
}

export type ErrorLog = {
  store_id?: string
  id: string
  message: string
  stack: string | null
  url: string | null
  user_agent: string | null
  created_at: string
}
