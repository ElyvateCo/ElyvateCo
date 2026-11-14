-- =============================================
-- ELYVATE — Extra indexes for the pages that hit the database most
-- Safe to run more than once. Indexes only make reads faster; they change no data.
-- (Existing: store_id on every tenant table, products/categories slug per store,
--  coupon code per store, orders by gateway id, fraud checks per day.)
-- =============================================
create index if not exists orders_store_phone_idx     on orders        (store_id, customer_phone);        -- track order, customer lookups
create index if not exists orders_store_paystatus_idx on orders        (store_id, payment_status, created_at desc); -- dashboard totals
create index if not exists products_store_category_idx on products     (store_id, category);              -- category pages
create index if not exists notifications_store_idx    on notifications (store_id, created_at desc);       -- notification bell
create index if not exists reviews_store_created_idx  on reviews       (store_id, created_at desc);       -- admin reviews list
