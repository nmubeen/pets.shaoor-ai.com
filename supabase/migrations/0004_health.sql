-- Phase 4: Health & vets (§07 domain map, §13 roadmap phase 4).
-- vet_visits / illnesses / vaccinations / grooming_visits share the same
-- polymorphic pet_id/group_id/habitat_id scope as stat_entries (§03).

create table menagerie.vets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  name text not null,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table menagerie.vet_visits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  vet_id uuid references menagerie.vets (id) on delete set null,
  pet_id uuid references menagerie.pets (id) on delete cascade,
  group_id uuid references menagerie.pet_groups (id) on delete cascade,
  habitat_id uuid references menagerie.habitats (id) on delete cascade,
  visit_date date not null default current_date,
  reason text not null,
  cost numeric,
  notes text,
  created_at timestamptz not null default now(),
  constraint vet_visits_one_scope check (
    (pet_id is not null)::int + (group_id is not null)::int + (habitat_id is not null)::int = 1
  )
);

create table menagerie.illnesses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  pet_id uuid references menagerie.pets (id) on delete cascade,
  group_id uuid references menagerie.pet_groups (id) on delete cascade,
  habitat_id uuid references menagerie.habitats (id) on delete cascade,
  reason text not null,
  status text not null default 'active' check (status in ('active', 'resolved')),
  diagnosed_date date not null default current_date,
  resolved_date date,
  notes text,
  created_at timestamptz not null default now(),
  constraint illnesses_one_scope check (
    (pet_id is not null)::int + (group_id is not null)::int + (habitat_id is not null)::int = 1
  )
);

create table menagerie.vaccinations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  pet_id uuid references menagerie.pets (id) on delete cascade,
  group_id uuid references menagerie.pet_groups (id) on delete cascade,
  habitat_id uuid references menagerie.habitats (id) on delete cascade,
  reason text not null,
  status text not null default 'due' check (status in ('due', 'scheduled', 'complete')),
  due_date date,
  administered_date date,
  notes text,
  created_at timestamptz not null default now(),
  constraint vaccinations_one_scope check (
    (pet_id is not null)::int + (group_id is not null)::int + (habitat_id is not null)::int = 1
  )
);

create table menagerie.grooming_visits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  pet_id uuid references menagerie.pets (id) on delete cascade,
  group_id uuid references menagerie.pet_groups (id) on delete cascade,
  habitat_id uuid references menagerie.habitats (id) on delete cascade,
  service text not null,
  visit_date date not null default current_date,
  cost numeric,
  notes text,
  created_at timestamptz not null default now(),
  constraint grooming_visits_one_scope check (
    (pet_id is not null)::int + (group_id is not null)::int + (habitat_id is not null)::int = 1
  )
);

create index vets_tenant_id_idx on menagerie.vets (tenant_id);
create index vet_visits_tenant_id_idx on menagerie.vet_visits (tenant_id);
create index illnesses_tenant_id_idx on menagerie.illnesses (tenant_id);
create index vaccinations_tenant_id_idx on menagerie.vaccinations (tenant_id);
create index grooming_visits_tenant_id_idx on menagerie.grooming_visits (tenant_id);

alter table menagerie.vets enable row level security;
alter table menagerie.vet_visits enable row level security;
alter table menagerie.illnesses enable row level security;
alter table menagerie.vaccinations enable row level security;
alter table menagerie.grooming_visits enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['vets', 'vet_visits', 'illnesses', 'vaccinations', 'grooming_visits'] loop
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
  menagerie.vets, menagerie.vet_visits, menagerie.illnesses, menagerie.vaccinations, menagerie.grooming_visits
  to authenticated;
