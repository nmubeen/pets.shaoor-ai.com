-- Redesigns "groups": was a first-class scope entity, a peer of pets and
-- habitats with its own group_id slot on every health/shopping/task/media
-- table (§03's original "pet, group, or habitat" scoping). Per user
-- feedback, a group is now just a saved, named collection of 2+ *existing*
-- pets ("Adult cats", "Kittens") — a pet can belong to any number of
-- groups, and a group is never itself the subject of a vet visit, an
-- order, or a photo; only a pet or a habitat can be. Verified against the
-- live project before writing this that no group-scoped rows exist
-- anywhere (pet_groups had a single test row, every group_id column was
-- entirely null) — so this drops the column outright rather than needing
-- a data migration.

create table menagerie.pet_group_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  group_id uuid not null references menagerie.pet_groups (id) on delete cascade,
  pet_id uuid not null references menagerie.pets (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, pet_id)
);

create index pet_group_members_tenant_id_idx on menagerie.pet_group_members (tenant_id);
create index pet_group_members_group_id_idx on menagerie.pet_group_members (group_id);
create index pet_group_members_pet_id_idx on menagerie.pet_group_members (pet_id);

alter table menagerie.pet_group_members enable row level security;

create policy "tenant isolation - select" on menagerie.pet_group_members for select using (tenant_id in (select menagerie.my_tenant_ids()));
create policy "tenant isolation - insert" on menagerie.pet_group_members for insert with check (menagerie.can_write_tenant(tenant_id));
create policy "tenant isolation - update" on menagerie.pet_group_members for update using (menagerie.can_write_tenant(tenant_id)) with check (menagerie.can_write_tenant(tenant_id));
create policy "tenant isolation - delete" on menagerie.pet_group_members for delete using (menagerie.can_write_tenant(tenant_id));

grant select, insert, update, delete on menagerie.pet_group_members to authenticated;

-- pet_groups itself stays (id/tenant_id/name/photo_path/created_at) but
-- loses the fields that only made sense when a group was its own subject.
alter table menagerie.pet_groups drop column species;
alter table menagerie.pet_groups drop column notes;

-- Drop group_id everywhere it was a scope option, and tighten each scope
-- check constraint from three-way to two-way (pet/habitat) accordingly.
alter table menagerie.pets drop column group_id;

alter table menagerie.stat_entries drop constraint stat_entries_one_scope;
alter table menagerie.stat_entries drop column group_id;
alter table menagerie.stat_entries add constraint stat_entries_one_scope check (
  (pet_id is not null)::int + (habitat_id is not null)::int = 1
);

alter table menagerie.vet_visits drop constraint vet_visits_one_scope;
alter table menagerie.vet_visits drop column group_id;
alter table menagerie.vet_visits add constraint vet_visits_one_scope check (
  (pet_id is not null)::int + (habitat_id is not null)::int = 1
);

alter table menagerie.illnesses drop constraint illnesses_one_scope;
alter table menagerie.illnesses drop column group_id;
alter table menagerie.illnesses add constraint illnesses_one_scope check (
  (pet_id is not null)::int + (habitat_id is not null)::int = 1
);

alter table menagerie.vaccinations drop constraint vaccinations_one_scope;
alter table menagerie.vaccinations drop column group_id;
alter table menagerie.vaccinations add constraint vaccinations_one_scope check (
  (pet_id is not null)::int + (habitat_id is not null)::int = 1
);

alter table menagerie.grooming_visits drop constraint grooming_visits_one_scope;
alter table menagerie.grooming_visits drop column group_id;
alter table menagerie.grooming_visits add constraint grooming_visits_one_scope check (
  (pet_id is not null)::int + (habitat_id is not null)::int = 1
);

alter table menagerie.medications drop constraint medications_one_scope;
alter table menagerie.medications drop column group_id;
alter table menagerie.medications add constraint medications_one_scope check (
  (pet_id is not null)::int + (habitat_id is not null)::int = 1
);

alter table menagerie.shopping_orders drop constraint shopping_orders_at_most_one_scope;
alter table menagerie.shopping_orders drop column group_id;
alter table menagerie.shopping_orders add constraint shopping_orders_at_most_one_scope check (
  (pet_id is not null)::int + (habitat_id is not null)::int <= 1
);

alter table menagerie.care_tasks drop constraint care_tasks_at_most_one_scope;
alter table menagerie.care_tasks drop column group_id;
alter table menagerie.care_tasks add constraint care_tasks_at_most_one_scope check (
  (pet_id is not null)::int + (habitat_id is not null)::int <= 1
);

alter table menagerie.media drop constraint media_at_most_one_scope;
alter table menagerie.media drop column group_id;
alter table menagerie.media add constraint media_at_most_one_scope check (
  (pet_id is not null)::int + (habitat_id is not null)::int <= 1
);
