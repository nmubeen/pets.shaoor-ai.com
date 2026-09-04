-- lib/supabase/admin.ts's service-role client (used by the Razorpay
-- webhook and every /api/cron/* route) bypasses RLS by role membership,
-- but RLS bypass doesn't imply schema/table GRANTs — those are a separate
-- privilege system. Every migration so far granted anon/authenticated
-- explicitly on each table but never granted service_role at all, which
-- surfaced as "permission denied for schema menagerie" the first time an
-- admin-client query actually ran against real credentials.

grant usage on schema menagerie to service_role;
grant select, insert, update, delete on all tables in schema menagerie to service_role;
grant execute on all functions in schema menagerie to service_role;

-- So a future migration's new tables/functions don't need this repeated
-- by hand — applies to objects created afterward by the role running this
-- (the migration runner, same role that creates every table already).
alter default privileges in schema menagerie grant select, insert, update, delete on tables to service_role;
alter default privileges in schema menagerie grant execute on functions to service_role;
