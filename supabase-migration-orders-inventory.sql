-- =============================================
-- ELYVATE — Orders, inventory & coupon safety (safe to run more than once)
-- Run in Supabase -> SQL Editor BEFORE deploying the matching code.
--
-- What it adds
--  1. products.stock_quantity   (empty/NULL = "not tracked", exactly like today)
--  2. orders.idempotency_key    (a double-click / retry can never create 2 orders)
--  3. orders.payment_url        (so a repeated request returns the same pay link)
--  4. orders.stock_items / resources_released
--                               (what stock + coupon an order is holding, and
--                                a flag so it is given back exactly once)
--  5. Database functions that change stock and coupon counts in ONE atomic
--     step, so two customers can never buy the last item, and a coupon with a
--     usage limit can never be over-used.
-- =============================================

alter table products
  add column if not exists stock_quantity int
  check (stock_quantity is null or stock_quantity >= 0);

alter table orders
  add column if not exists idempotency_key     text,
  add column if not exists payment_url         text,
  add column if not exists stock_items         jsonb,
  add column if not exists resources_released  boolean not null default false;

-- One live order per (store, key). A cancelled order frees its key, so a
-- customer whose online payment failed can retry with another method.
create unique index if not exists orders_store_idem_unique
  on orders (store_id, idempotency_key)
  where idempotency_key is not null and order_status <> 'cancelled';

-- Used by the payment reconcile job (finds online payments never confirmed)
create index if not exists orders_pending_auto_idx
  on orders (created_at)
  where payment_status = 'pending'
    and payment_method in ('bkash_auto', 'nagad_auto')
    and order_status <> 'cancelled';

-- ---------------------------------------------------------------
-- reserve_stock: takes stock for a cart. All-or-nothing: if ANY tracked
-- product has too little left, it raises 'out_of_stock:<product id>' and
-- nothing is taken. Returns the list of lines it actually reserved.
-- ---------------------------------------------------------------
create or replace function reserve_stock(p_store_id uuid, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  it       record;
  reserved jsonb := '[]'::jsonb;
  n        int;
begin
  for it in
    select (e->>'product_id')::uuid as pid, sum((e->>'qty')::int)::int as qty
    from jsonb_array_elements(p_items) e
    group by 1
    order by 1                      -- fixed order = no deadlocks between orders
  loop
    update products set
      stock_quantity = stock_quantity - it.qty,
      stock_status   = case when stock_quantity - it.qty <= 0 then 'out_of_stock' else stock_status end
    where id = it.pid
      and store_id = p_store_id
      and stock_quantity is not null
      and stock_quantity >= it.qty;
    get diagnostics n = row_count;

    if n > 0 then
      reserved := reserved || jsonb_build_object('product_id', it.pid, 'qty', it.qty);
    elsif exists (select 1 from products where id = it.pid and store_id = p_store_id and stock_quantity is not null) then
      raise exception 'out_of_stock:%', it.pid;   -- rolls back earlier lines too
    end if;                                       -- else: product is not tracked, nothing to do
  end loop;
  return reserved;
end $$;

-- restore_stock: gives reserved stock back (internal helper)
create or replace function restore_stock(p_store_id uuid, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare it record;
begin
  for it in
    select (e->>'product_id')::uuid as pid, sum((e->>'qty')::int)::int as qty
    from jsonb_array_elements(p_items) e
    group by 1
    order by 1
  loop
    update products set
      stock_quantity = stock_quantity + it.qty,
      stock_status   = 'in_stock'
    where id = it.pid and store_id = p_store_id and stock_quantity is not null;
  end loop;
end $$;

-- ---------------------------------------------------------------
-- Coupons: atomic claim (respects usage_limit) and release
-- ---------------------------------------------------------------
create or replace function claim_coupon(p_store_id uuid, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  update coupons set usage_count = usage_count + 1
  where store_id = p_store_id
    and code = p_code
    and is_active
    and (usage_limit is null or usage_count < usage_limit);
  get diagnostics n = row_count;
  return n > 0;
end $$;

create or replace function release_coupon(p_store_id uuid, p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update coupons set usage_count = greatest(usage_count - 1, 0)
  where store_id = p_store_id and code = p_code;
$$;

-- ---------------------------------------------------------------
-- release_order_resources: when an order is cancelled / its payment fails,
-- give back its stock and coupon use. Runs at most ONCE per order.
-- ---------------------------------------------------------------
create or replace function release_order_resources(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare o orders;
begin
  update orders set resources_released = true
  where id = p_order_id and resources_released = false
  returning * into o;
  if not found then return false; end if;

  if o.stock_items is not null and jsonb_array_length(o.stock_items) > 0 then
    perform restore_stock(o.store_id, o.stock_items);
  end if;
  if o.coupon_code is not null then
    perform release_coupon(o.store_id, o.coupon_code);
  end if;
  return true;
end $$;

-- reopen_order_resources: a merchant un-cancels an order -> take the stock
-- again (fails with 'out_of_stock:<id>' if it has been sold meanwhile).
create or replace function reopen_order_resources(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare o orders;
begin
  select * into o from orders where id = p_order_id for update;
  if not found or not o.resources_released then return true; end if;

  if o.stock_items is not null and jsonb_array_length(o.stock_items) > 0 then
    perform reserve_stock(o.store_id, o.stock_items);
  end if;
  if o.coupon_code is not null then
    update coupons set usage_count = usage_count + 1
    where store_id = o.store_id and code = o.coupon_code;
  end if;
  update orders set resources_released = false where id = p_order_id;
  return true;
end $$;

-- Only the server (service-role key) may call these. NEVER grant to anon.
revoke all on function reserve_stock(uuid, jsonb)            from public, anon, authenticated;
revoke all on function restore_stock(uuid, jsonb)            from public, anon, authenticated;
revoke all on function claim_coupon(uuid, text)              from public, anon, authenticated;
revoke all on function release_coupon(uuid, text)            from public, anon, authenticated;
revoke all on function release_order_resources(uuid)         from public, anon, authenticated;
revoke all on function reopen_order_resources(uuid)          from public, anon, authenticated;
grant execute on function reserve_stock(uuid, jsonb)         to service_role;
grant execute on function restore_stock(uuid, jsonb)         to service_role;
grant execute on function claim_coupon(uuid, text)           to service_role;
grant execute on function release_coupon(uuid, text)         to service_role;
grant execute on function release_order_resources(uuid)      to service_role;
grant execute on function reopen_order_resources(uuid)       to service_role;
