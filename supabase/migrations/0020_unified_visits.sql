-- Unifies "Vet visits" and "Grooming visits" into one concept: a real-world
-- visit is very often a mix of things (a health check that turns into a
-- grooming session too, or a vaccination given alongside a checkup) — the
-- old model forced a separate record per visit *type*, which meant
-- multiple entries for what was actually one trip. Now there's one
-- `visits` row per trip, carrying any combination of:
--   - free-form services (visit_services) — Deworming, Nail Clipping,
--     Grooming/Bath & trim, Consultation, Ear cleaning, etc. — drawn from
--     a tenant-editable catalog (care_service_types) that optionally
--     carries a reminder frequency (Settings)
--   - vaccinations given (vaccinations.visit_id, extended below)
-- The visit's total cost is the sum of whatever line items were entered
-- for it at logging time (app-layer, not a DB trigger — see
-- lib/actions/health.ts).
--
-- Checked against the live project before writing this: 1 vet_visits row
-- (real user data, not test data — preserved as-is by the rename, no
-- migration needed since it predates line items), 0 grooming_visits rows
-- (safe to drop outright), 0 vaccinations rows.

alter table menagerie.vet_visits rename to visits;
alter index menagerie.vet_visits_tenant_id_idx rename to visits_tenant_id_idx;

drop table menagerie.grooming_visits;

-- ---------------------------------------------------------------------
-- Service catalog + line items
-- ---------------------------------------------------------------------
create table menagerie.care_service_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  name text not null,
  -- How often this service recurs, e.g. Deworming every 30 days. Null
  -- means no reminder is generated (e.g. Consultation, a one-off).
  frequency_days int,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness per tenant, so "Deworming" and "deworming"
-- typed on two different visits resolve to the same catalog entry
-- (findOrCreateServiceType — see lib/actions/health.ts).
create unique index care_service_types_tenant_name_uidx on menagerie.care_service_types (tenant_id, lower(name));

create table menagerie.visit_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  visit_id uuid not null references menagerie.visits (id) on delete cascade,
  -- Nullable + a denormalized name snapshot: if the catalog entry is later
  -- renamed or deleted, historical line items keep the label they were
  -- logged with rather than silently changing or breaking.
  service_type_id uuid references menagerie.care_service_types (id) on delete set null,
  name text not null,
  cost numeric,
  created_at timestamptz not null default now()
);

create index care_service_types_tenant_id_idx on menagerie.care_service_types (tenant_id);
create index visit_services_tenant_id_idx on menagerie.visit_services (tenant_id);
create index visit_services_visit_id_idx on menagerie.visit_services (visit_id);

alter table menagerie.care_service_types enable row level security;
alter table menagerie.visit_services enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['care_service_types', 'visit_services'] loop
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

grant select, insert, update, delete on menagerie.care_service_types, menagerie.visit_services to authenticated;

-- ---------------------------------------------------------------------
-- Vaccinations given during a visit
-- ---------------------------------------------------------------------
alter table menagerie.vaccinations add column visit_id uuid references menagerie.visits (id) on delete set null;
alter table menagerie.vaccinations add column cost numeric;

-- ---------------------------------------------------------------------
-- Tenant-editable vaccination plans, alongside the built-in dog/cat
-- defaults -- same vaccine_protocols table, tenant_id null means "global
-- built-in" (unchanged, still read-only reference data), tenant_id set
-- means a workspace's own custom plan entry (e.g. for a species with no
-- built-in default, or one the defaults miss).
-- ---------------------------------------------------------------------
alter table menagerie.vaccine_protocols add column tenant_id uuid references menagerie.tenants (id) on delete cascade;
create index vaccine_protocols_tenant_id_idx on menagerie.vaccine_protocols (tenant_id);

drop policy "protocols are readable by any signed-in user" on menagerie.vaccine_protocols;

create policy "tenant isolation - select" on menagerie.vaccine_protocols for select
  using (tenant_id is null or tenant_id in (select menagerie.my_tenant_ids()));
create policy "tenant isolation - insert" on menagerie.vaccine_protocols for insert
  with check (tenant_id is not null and menagerie.can_write_tenant(tenant_id));
create policy "tenant isolation - update" on menagerie.vaccine_protocols for update
  using (tenant_id is not null and menagerie.can_write_tenant(tenant_id))
  with check (tenant_id is not null and menagerie.can_write_tenant(tenant_id));
create policy "tenant isolation - delete" on menagerie.vaccine_protocols for delete
  using (tenant_id is not null and menagerie.can_write_tenant(tenant_id));

grant insert, update, delete on menagerie.vaccine_protocols to authenticated;
