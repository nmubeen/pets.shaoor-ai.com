-- Phase 5: Shopping & tasks (§13 roadmap phase 5). Unlike health records,
-- a shopping order or care task can be scoped to the whole tenant, not just
-- a pet/group/habitat (§03: "scope_type of pet, group, or household") — so
-- the one-of-three check constraint here allows *zero* set, meaning
-- household-wide, rather than requiring exactly one.
--
-- "Expense reporting" (the other half of this phase) is a computed rollup
-- across shopping_orders.cost + vet_visits.cost + grooming_visits.cost
-- rather than a separate expenses ledger table — see lib/shopping.ts —
-- so spend isn't double-entered between a health record and an expense row.

create table menagerie.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  name text not null,
  category text,
  notes text,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table menagerie.shopping_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  product_id uuid not null references menagerie.products (id) on delete cascade,
  pet_id uuid references menagerie.pets (id) on delete cascade,
  group_id uuid references menagerie.pet_groups (id) on delete cascade,
  habitat_id uuid references menagerie.habitats (id) on delete cascade,
  order_date date not null default current_date,
  cost numeric,
  notes text,
  created_at timestamptz not null default now(),
  constraint shopping_orders_at_most_one_scope check (
    (pet_id is not null)::int + (group_id is not null)::int + (habitat_id is not null)::int <= 1
  )
);

create table menagerie.care_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  pet_id uuid references menagerie.pets (id) on delete cascade,
  group_id uuid references menagerie.pet_groups (id) on delete cascade,
  habitat_id uuid references menagerie.habitats (id) on delete cascade,
  title text not null,
  due_date date,
  repeat_interval_days int,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  constraint care_tasks_at_most_one_scope check (
    (pet_id is not null)::int + (group_id is not null)::int + (habitat_id is not null)::int <= 1
  )
);

create index products_tenant_id_idx on menagerie.products (tenant_id);
create index shopping_orders_tenant_id_idx on menagerie.shopping_orders (tenant_id);
create index care_tasks_tenant_id_idx on menagerie.care_tasks (tenant_id);

alter table menagerie.products enable row level security;
alter table menagerie.shopping_orders enable row level security;
alter table menagerie.care_tasks enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['products', 'shopping_orders', 'care_tasks'] loop
    execute format(
      'create policy "tenant isolation - select" on menagerie.%I for select using (tenant_id in (select menagerie.my_tenant_ids()))',
      t
    );
    execute format(
      'create policy "tenant isolation - insert" on menagerie.%I for insert with check (menagerie.can_write_tenant(tenant_id))',
      t
    );
    execute format(
      'create policy "tenant isolation - update" on menagerie.%I for update using (menagerie.can_write_tenant(tenant_id)) with check (menagerie.can_write_tenant(tenant_id))',
      t
    );
    execute format(
      'create policy "tenant isolation - delete" on menagerie.%I for delete using (menagerie.can_write_tenant(tenant_id))',
      t
    );
  end loop;
end $$;

grant select, insert, update, delete on
  menagerie.products, menagerie.shopping_orders, menagerie.care_tasks
  to authenticated;
