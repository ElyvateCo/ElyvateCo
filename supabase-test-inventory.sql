-- =============================================
-- ELYVATE — self-test for supabase-migration-orders-inventory.sql
-- Paste into Supabase -> SQL Editor and Run (needs at least one store).
-- It creates temporary test rows, checks the stock/coupon rules, and then
-- ALWAYS ends with an "error" that rolls everything back, so nothing is left
-- behind. SUCCESS looks like:  ALL TESTS PASSED (test data rolled back)
-- Any other message = something is wrong; send it to me.
-- =============================================
do $$
declare
  s uuid; a uuid; b uuid; r jsonb; q int; st text; o uuid; ok boolean; cid text; n int;
begin
  select id into s from stores limit 1;
  if s is null then raise exception 'Create a store first (sign up in the app), then run this again'; end if;

  insert into products (store_id, name, slug, price, stock_quantity)
    values (s, '__test A', '__test-a-' || gen_random_uuid(), 100, 2) returning id into a;
  insert into products (store_id, name, slug, price, stock_quantity)
    values (s, '__test B', '__test-b-' || gen_random_uuid(), 100, 1) returning id into b;

  -- 1. reserving everything that is left works and flips the product to out of stock
  r := reserve_stock(s, jsonb_build_array(jsonb_build_object('product_id', a, 'qty', 2)));
  select stock_quantity, stock_status into q, st from products where id = a;
  assert q = 0 and st = 'out_of_stock', 'TEST 1 failed: reserve should empty the stock';

  -- 2. buying one more than exists is refused (no overselling)
  begin
    perform reserve_stock(s, jsonb_build_array(jsonb_build_object('product_id', a, 'qty', 1)));
    raise exception 'TEST 2 failed: oversell was allowed';
  exception when others then
    if sqlerrm not like 'out_of_stock:%' then raise; end if;
  end;

  -- 3. all-or-nothing: if B is short, A must not lose stock either
  update products set stock_quantity = 5, stock_status = 'in_stock' where id = a;
  begin
    perform reserve_stock(s, jsonb_build_array(
      jsonb_build_object('product_id', a, 'qty', 2),
      jsonb_build_object('product_id', b, 'qty', 2)));
    raise exception 'TEST 3 failed: partial cart was accepted';
  exception when others then
    if sqlerrm not like 'out_of_stock:%' then raise; end if;
  end;
  select stock_quantity into q from products where id = a;
  assert q = 5, 'TEST 3 failed: product A lost stock although the cart was refused';

  -- 4. an order gives its stock back exactly once
  r := reserve_stock(s, jsonb_build_array(jsonb_build_object('product_id', a, 'qty', 3)));
  insert into orders (store_id, customer_name, customer_email, customer_phone, customer_address,
                      customer_city, customer_country, customer_zip, product_id, product_name,
                      quantity, total_price, stock_items)
    values (s, 'test', '', '01700000000', 'x', 'x', 'Bangladesh', '', a::text, '__test', 3, 300, r)
    returning id into o;
  select stock_quantity into q from products where id = a;
  assert q = 2, 'TEST 4 failed: stock should be 2 after taking 3 of 5';
  ok := release_order_resources(o);
  select stock_quantity into q from products where id = a;
  assert ok and q = 5, 'TEST 4 failed: stock was not given back';
  ok := release_order_resources(o);
  select stock_quantity into q from products where id = a;
  assert (not ok) and q = 5, 'TEST 4 failed: stock was given back twice';

  -- 5. reopening a cancelled order takes the stock again
  perform reopen_order_resources(o);
  select stock_quantity into q from products where id = a;
  assert q = 2, 'TEST 5 failed: reopen should take the stock again';

  -- 6. a coupon with a usage limit cannot be over-used
  cid := '__T' || substr(md5(random()::text), 1, 8);
  insert into coupons (store_id, code, type, value, usage_limit) values (s, cid, 'fixed', 10, 1);
  assert claim_coupon(s, cid) = true,  'TEST 6 failed: first coupon use should work';
  assert claim_coupon(s, cid) = false, 'TEST 6 failed: coupon used beyond its limit';
  perform release_coupon(s, cid);
  select usage_count into n from coupons where store_id = s and code = cid;
  assert n = 0, 'TEST 6 failed: coupon release';

  -- 7. the same checkout key cannot create two live orders
  update orders set idempotency_key = 'test-key-1' where id = o;
  begin
    insert into orders (store_id, customer_name, customer_email, customer_phone, customer_address,
                        customer_city, customer_country, customer_zip, product_id, product_name,
                        quantity, total_price, idempotency_key)
      values (s, 'test', '', '01700000000', 'x', 'x', 'Bangladesh', '', a::text, '__test', 1, 100, 'test-key-1');
    raise exception 'TEST 7 failed: duplicate order accepted';
  exception when unique_violation then
    null; -- expected
  end;

  raise exception 'ALL TESTS PASSED (test data rolled back)';
end $$;
