-- Phase 3: Core records — pets, groups, and habitats as peers (§03, §07).
-- A "roster" item is one of these three; the app layer merges them for
-- unified listings (dashboard, /app/pets) rather than a DB-side view, since
-- each keeps its own species-appropriate fields.

create table menagerie.pet_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  name text not null,
  species text,
  notes text,
  created_at timestamptz not null default now()
);

create table menagerie.habitats (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  name text not null,
  habitat_type text not null,
  capacity_note text,
  notes text,
  created_at timestamptz not null default now()
);

create table menagerie.pets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  group_id uuid references menagerie.pet_groups (id) on delete set null,
  name text not null,
  species text not null,
  life_stage text,
  notes text,
  created_at timestamptz not null default now()
);

-- Polymorphic scope, always exactly one of pet_id / group_id / habitat_id —
-- the same pattern §03 describes for care events generally. Used for things
-- like "weight logged 3d ago" on the dashboard.
create table menagerie.stat_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  pet_id uuid references menagerie.pets (id) on delete cascade,
  group_id uuid references menagerie.pet_groups (id) on delete cascade,
  habitat_id uuid references menagerie.habitats (id) on delete cascade,
  stat_type text not null,
  value numeric,
  unit text,
  note text,
  recorded_at timestamptz not null default now(),
  constraint stat_entries_one_scope check (
    (pet_id is not null)::int + (group_id is not null)::int + (habitat_id is not null)::int = 1
  )
);

create index pets_tenant_id_idx on menagerie.pets (tenant_id);
create index pet_groups_tenant_id_idx on menagerie.pet_groups (tenant_id);
create index habitats_tenant_id_idx on menagerie.habitats (tenant_id);
create index stat_entries_tenant_id_idx on menagerie.stat_entries (tenant_id);

alter table menagerie.pets enable row level security;
alter table menagerie.pet_groups enable row level security;
alter table menagerie.habitats enable row level security;
alter table menagerie.stat_entries enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['pets', 'pet_groups', 'habitats', 'stat_entries'] loop
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

grant select, insert, update, delete on menagerie.pets, menagerie.pet_groups, menagerie.habitats, menagerie.stat_entries to authenticated;
