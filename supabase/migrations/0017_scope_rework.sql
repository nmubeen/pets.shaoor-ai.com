-- Three scope changes, all from the same round of feedback:
--
-- 1. Health records (vet_visits, illnesses, vaccinations, grooming_visits,
-- medications) become pet-only. A habitat doesn't really have "health" in
-- the individual-creature sense this module tracks (weight, vaccination
-- history, illnesses) — that ambiguity is dropped in favor of clean
-- per-pet tracking. Habitats keep full support everywhere else (roster,
-- shopping, gallery, and care_tasks below).
--
-- 2. care_tasks tightens from "pet, habitat, or household" to "pet or
-- habitat, always one" — habitat-level recurring tasks (tank cleaning,
-- water changes, auto-feeder refills) are legitimate and stay, but the
-- vague "whole household" catch-all goes, so every task is trackable
-- against one specific thing.
--
-- 3. shopping_orders moves from "at most one of pet/habitat" to a proper
-- many-to-many via a new shopping_order_scopes join table — an order can
-- now name any combination of pets and/or habitats (or none, still
-- meaning household-wide), matching how a single order often really does
-- cover more than one animal.
--
-- Checked against the live project before writing this: 1 vet_visit (pet-
-- scoped already), 0 habitat-scoped health rows anywhere, 0 care_tasks,
-- 1 shopping_order (household-wide, no pet/habitat set) — nothing here
-- conflicts with any existing row.

-- ---------------------------------------------------------------------
-- 1. Health tables -> pet-only
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['vet_visits', 'illnesses', 'vaccinations', 'grooming_visits', 'medications'] loop
    execute format('alter table menagerie.%I drop constraint %I', t, t || '_one_scope');
    execute format('alter table menagerie.%I drop column habitat_id', t);
    execute format('alter table menagerie.%I alter column pet_id set not null', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2. care_tasks -> exactly one of pet/habitat (no household)
-- ---------------------------------------------------------------------
alter table menagerie.care_tasks drop constraint care_tasks_at_most_one_scope;
alter table menagerie.care_tasks add constraint care_tasks_one_scope check (
  (pet_id is not null)::int + (habitat_id is not null)::int = 1
);

-- ---------------------------------------------------------------------
-- 3. shopping_orders -> many-to-many via shopping_order_scopes
-- ---------------------------------------------------------------------
create table menagerie.shopping_order_scopes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  order_id uuid not null references menagerie.shopping_orders (id) on delete cascade,
  pet_id uuid references menagerie.pets (id) on delete cascade,
  habitat_id uuid references menagerie.habitats (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint shopping_order_scopes_one_target check (
    (pet_id is not null)::int + (habitat_id is not null)::int = 1
  )
);

create unique index shopping_order_scopes_pet_uidx on menagerie.shopping_order_scopes (order_id, pet_id) where pet_id is not null;
create unique index shopping_order_scopes_habitat_uidx on menagerie.shopping_order_scopes (order_id, habitat_id) where habitat_id is not null;
create index shopping_order_scopes_tenant_id_idx on menagerie.shopping_order_scopes (tenant_id);
create index shopping_order_scopes_order_id_idx on menagerie.shopping_order_scopes (order_id);

alter table menagerie.shopping_order_scopes enable row level security;

create policy "tenant isolation - select" on menagerie.shopping_order_scopes for select using (tenant_id in (select menagerie.my_tenant_ids()));
create policy "tenant isolation - insert" on menagerie.shopping_order_scopes for insert with check (menagerie.can_write_tenant(tenant_id));
create policy "tenant isolation - update" on menagerie.shopping_order_scopes for update using (menagerie.can_write_tenant(tenant_id)) with check (menagerie.can_write_tenant(tenant_id));
create policy "tenant isolation - delete" on menagerie.shopping_order_scopes for delete using (menagerie.can_write_tenant(tenant_id));

grant select, insert, update, delete on menagerie.shopping_order_scopes to authenticated;

alter table menagerie.shopping_orders drop constraint shopping_orders_at_most_one_scope;
alter table menagerie.shopping_orders drop column pet_id;
alter table menagerie.shopping_orders drop column habitat_id;
