-- Unified service providers — vets/hospitals, grooming centers, offline
-- shops, and online shops — replacing the narrower menagerie.vets table
-- (grooming/shopping never had an equivalent). Maintained on their own
-- page (/app/providers) and selected from elsewhere, rather than the old
-- "type a name, we'll create it" pattern vet_visits used.

create type menagerie.service_provider_category as enum ('vet', 'grooming', 'offline_shop', 'online_shop');

create table menagerie.service_providers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  category menagerie.service_provider_category not null,
  name text not null,
  phone text,
  address text,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  unique (tenant_id, category, name)
);

create index service_providers_tenant_id_idx on menagerie.service_providers (tenant_id);

alter table menagerie.service_providers enable row level security;
create policy "tenant isolation - select" on menagerie.service_providers for select
  using (tenant_id in (select menagerie.my_tenant_ids()));
create policy "tenant isolation - insert" on menagerie.service_providers for insert
  with check (menagerie.can_write_tenant(tenant_id));
create policy "tenant isolation - update" on menagerie.service_providers for update
  using (menagerie.can_write_tenant(tenant_id)) with check (menagerie.can_write_tenant(tenant_id));
create policy "tenant isolation - delete" on menagerie.service_providers for delete
  using (menagerie.can_write_tenant(tenant_id));

grant select, insert, update, delete on menagerie.service_providers to authenticated;

-- Migrate existing vets -> service_providers (category 'vet'), preserving
-- ids so vet_visits' existing references keep resolving.
insert into menagerie.service_providers (id, tenant_id, category, name, phone, address, notes, created_at)
select id, tenant_id, 'vet', name, phone, address, notes, created_at from menagerie.vets;

alter table menagerie.vet_visits rename column vet_id to provider_id;
alter table menagerie.vet_visits drop constraint vet_visits_vet_id_fkey;
alter table menagerie.vet_visits
  add constraint vet_visits_provider_id_fkey foreign key (provider_id)
  references menagerie.service_providers (id) on delete set null;

drop table menagerie.vets;

alter table menagerie.grooming_visits
  add column provider_id uuid references menagerie.service_providers (id) on delete set null;

-- ---------------------------------------------------------------------
-- Shopping: order tracking + provider (offline/online shop) + optional
-- product photo.
-- ---------------------------------------------------------------------
alter table menagerie.shopping_orders
  add column provider_id uuid references menagerie.service_providers (id) on delete set null,
  add column delivered_date date,
  add column item_url text,
  add column qty numeric,
  add column qty_unit text;

alter table menagerie.products add column image_path text;
