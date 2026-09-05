-- Tenant-editable Shopping order category catalog (Settings → Care →
-- Categories, alongside Service Types and Vaccinations) — supersedes the
-- plan in 0030's own comment of keeping the option list in application
-- code. shopping_orders.category itself is unchanged (still the plain
-- text column 0030 added): a category name here is just a label to pick
-- from, same "type it, it's just a label" glue as an order's own item
-- name, so renaming or deleting a category never touches past orders'
-- already-recorded label. Same shape/RLS/grant pattern as
-- care_service_types (0020_unified_visits.sql).
create table menagerie.shopping_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness per tenant, same reasoning as
-- care_service_types_tenant_name_uidx.
create unique index shopping_categories_tenant_name_uidx on menagerie.shopping_categories (tenant_id, lower(name));
create index shopping_categories_tenant_id_idx on menagerie.shopping_categories (tenant_id);

alter table menagerie.shopping_categories enable row level security;

create policy "tenant isolation - select" on menagerie.shopping_categories
  for select using (tenant_id in (select menagerie.my_tenant_ids()));
create policy "tenant isolation - insert" on menagerie.shopping_categories
  for insert with check (menagerie.can_write_tenant(tenant_id));
create policy "tenant isolation - update" on menagerie.shopping_categories
  for update using (menagerie.can_write_tenant(tenant_id)) with check (menagerie.can_write_tenant(tenant_id));
create policy "tenant isolation - delete" on menagerie.shopping_categories
  for delete using (menagerie.can_write_tenant(tenant_id));

grant select, insert, update, delete on menagerie.shopping_categories to authenticated;

-- Backfill every existing tenant with the same starter set the app used
-- to hardcode, so the new Settings page isn't empty for anyone already
-- using Shopping — same idea as 0011_seed_online_shops.sql, just applied
-- retroactively here instead of only forward from signup.
insert into menagerie.shopping_categories (tenant_id, name)
select t.id, c.name
from menagerie.tenants t
cross join (values
  ('Food'), ('Treats'), ('Toys'), ('Grooming & Hygiene'),
  ('Health & Medicine'), ('Accessories'), ('Bedding & Litter'), ('Other')
) as c(name)
where not exists (select 1 from menagerie.shopping_categories existing where existing.tenant_id = t.id);

-- Seed the same starter set for every brand-new tenant going forward,
-- same trigger/condition 0011_seed_online_shops.sql added its own seed
-- to (full function body carried forward from there — CREATE OR REPLACE
-- FUNCTION replaces the whole body, not just one insert).
create or replace function menagerie.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_workspace_name text := new.raw_user_meta_data ->> 'workspace_name';
  v_workspace_type text := coalesce(new.raw_user_meta_data ->> 'workspace_type', 'household');
  v_tenant_id uuid;
begin
  update menagerie.memberships
  set user_id = new.id, status = 'active'
  where invited_email = new.email and status = 'invited' and user_id is null;

  if v_workspace_name is not null and length(trim(v_workspace_name)) > 0 then
    insert into menagerie.tenants (name, workspace_type, plan_code, trial_ends_at)
    values (v_workspace_name, v_workspace_type::menagerie.workspace_type, 'sanctuary', now() + interval '14 days')
    returning id into v_tenant_id;

    insert into menagerie.memberships (tenant_id, user_id, invited_email, role, status)
    values (v_tenant_id, new.id, new.email, 'owner', 'active');

    insert into menagerie.subscriptions (tenant_id, status)
    values (v_tenant_id, 'trialing');

    insert into menagerie.service_providers (tenant_id, category, name, website)
    values
      (v_tenant_id, 'online_shop', 'Amazon', 'https://www.amazon.in'),
      (v_tenant_id, 'online_shop', 'Flipkart', 'https://www.flipkart.com/'),
      (v_tenant_id, 'online_shop', 'Zepto', 'https://www.zepto.com/'),
      (v_tenant_id, 'online_shop', 'Blinkit', 'https://blinkit.com/'),
      (v_tenant_id, 'online_shop', 'Supertails', 'https://supertails.com/'),
      (v_tenant_id, 'online_shop', 'Instamart', 'https://instamart.in');

    insert into menagerie.shopping_categories (tenant_id, name)
    values
      (v_tenant_id, 'Food'),
      (v_tenant_id, 'Treats'),
      (v_tenant_id, 'Toys'),
      (v_tenant_id, 'Grooming & Hygiene'),
      (v_tenant_id, 'Health & Medicine'),
      (v_tenant_id, 'Accessories'),
      (v_tenant_id, 'Bedding & Litter'),
      (v_tenant_id, 'Other');
  end if;

  return new;
end;
$$;
