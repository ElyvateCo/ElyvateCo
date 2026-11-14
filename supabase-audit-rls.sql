-- =============================================
-- ELYVATE — read-only audit of your LIVE database security
-- Paste into Supabase -> SQL Editor and Run. It changes nothing.
-- =============================================

-- A. Tables WITHOUT row level security (should return ZERO rows)
select c.relname as table_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
order by 1;

-- B. Every policy that lets the public / any logged-in user in. Review each:
--    "select ... true" on storefront tables is intended; any INSERT/UPDATE/
--    DELETE policy, or any policy on stores / orders / gateways, needs a reason.
select tablename, policyname, cmd, roles, qual as using_clause, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

-- C. Functions the public key could call (should show ONLY service_role for
--    the rate-limit / stock / coupon functions)
select p.proname as function, array_agg(distinct g.grantee) as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
left join information_schema.routine_privileges g
  on g.routine_name = p.proname and g.routine_schema = 'public'
where n.nspname = 'public'
  and p.proname in ('rate_limit_hit','reserve_stock','restore_stock','claim_coupon',
                    'release_coupon','release_order_resources','reopen_order_resources')
group by 1;
