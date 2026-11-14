-- =============================================
-- ELYVATE — Store isolation fixes (safe to run more than once)
-- =============================================

-- 1. Coupon codes must be unique PER STORE, not across the whole platform.
--    (Before, if one store had the code SAVE10, no other store could create
--    it — and the error revealed that another store used it.)
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.coupons'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (code)'
  loop
    execute format('alter table public.coupons drop constraint %I', c.conname);
  end loop;
end $$;
create unique index if not exists coupons_store_code_uniq on coupons (store_id, code);

-- 2. Nobody may write straight into these tables with the public (anon) key.
--    Every real insert goes through our API routes (service-role key), which
--    check the store, rate-limit and validate. With these open, anyone could
--    post fake reviews / orders / messages to ANY store directly.
drop policy if exists "Anyone can submit a review"            on reviews;
drop policy if exists "Anyone can create orders"              on orders;
drop policy if exists "Anyone can submit a contact message"   on contact_messages;
drop policy if exists "Anyone can report an error"            on error_logs;

-- 3. RLS must be ON for every tenant table (a table with RLS off is fully
--    readable AND writable with the public key).
do $$
declare t text;
begin
  foreach t in array array[
    'stores','products','categories','orders','hero_section','site_settings',
    'contact_messages','notifications','error_logs','coupons','reviews',
    'delivery_zones','store_payment_gateways','store_gateway_secrets',
    'store_customers','wishlist_items','plan_features','platform_settings',
    'landing_content','video_templates','fraud_cache','fraud_checks','rate_limits'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

-- 4. Indexes so each store's pages only read that store's rows
create index if not exists orders_store_created_idx   on orders   (store_id, created_at desc);
create index if not exists products_store_created_idx on products (store_id, created_at desc);
create index if not exists reviews_store_product_idx  on reviews  (store_id, product_id) where is_approved;
