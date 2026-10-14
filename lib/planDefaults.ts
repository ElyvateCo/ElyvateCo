// Plans and the features each one gets. The platform owner edits these in the
// main admin panel (/rafiixr → Plans & features); this list is what the app
// uses until a feature has been saved there, and the values the database is
// seeded with. null limit = unlimited.
export type Plan = 'free' | 'pro' | 'business'

export type Feature = {
  key: string
  label: string
  description: string
  kind: 'flag' | 'limit'
  enabled: boolean
  min_plan: Plan            // flag features: the cheapest plan that includes it
  free_limit: number | null // limit features: how many each plan gets
  pro_limit: number | null
  business_limit: number | null
  sort: number
}

export const DEFAULT_FEATURES: Feature[] = [
  { key: 'products_limit',       label: 'Products',                     description: 'How many products a store can have',               kind: 'limit', enabled: true, min_plan: 'free', free_limit: 5,    pro_limit: 500,  business_limit: null, sort: 1 },
  { key: 'delivery_zones_limit', label: 'Delivery areas',               description: 'How many delivery areas a store can set up',       kind: 'limit', enabled: true, min_plan: 'free', free_limit: 2,    pro_limit: null, business_limit: null, sort: 2 },
  { key: 'coupons_limit',        label: 'Coupons',                      description: 'How many coupons a store can create',              kind: 'limit', enabled: true, min_plan: 'free', free_limit: 2,    pro_limit: null, business_limit: null, sort: 3 },
  { key: 'fraud_checks_daily',   label: 'Fraud checks per day',         description: 'Customer phone lookups per day (courier delivery history)', kind: 'limit', enabled: true, min_plan: 'free', free_limit: 3, pro_limit: 20, business_limit: 100, sort: 9 },
  { key: 'auto_payments',        label: 'Automatic bKash & Nagad',      description: 'Customers pay online with the store\'s own merchant keys', kind: 'flag', enabled: true, min_plan: 'pro', free_limit: null, pro_limit: null, business_limit: null, sort: 4 },
  { key: 'video_templates',      label: 'Ready-made background videos', description: 'Pick a video template for the homepage',          kind: 'flag',  enabled: true, min_plan: 'pro',  free_limit: null, pro_limit: null, business_limit: null, sort: 5 },
  { key: 'hero_video',           label: 'Background video',             description: 'Use a video link as the homepage background',     kind: 'flag',  enabled: true, min_plan: 'pro',  free_limit: null, pro_limit: null, business_limit: null, sort: 6 },
  { key: 'custom_font',          label: 'Custom font',                  description: 'Use your own font on the storefront',             kind: 'flag',  enabled: true, min_plan: 'pro',  free_limit: null, pro_limit: null, business_limit: null, sort: 7 },
  { key: 'admin_rename',         label: 'Rename admin address',         description: 'Change /admin to any name',                       kind: 'flag',  enabled: true, min_plan: 'pro',  free_limit: null, pro_limit: null, business_limit: null, sort: 8 },
]
