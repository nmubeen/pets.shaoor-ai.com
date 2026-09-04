-- Predictive vaccination scheduling + a medications tracker. Turns logging
-- ("this happened") into guidance ("this is what's next"), rather than
-- requiring the owner to already know a puppy needs a DHPP booster at 9
-- weeks. General veterinary guidance, not a diagnosis or a substitute for
-- a vet's actual recommendation — the app never locks a due date in,
-- everything generated here stays freely editable like any other
-- vaccination row.

-- ---------------------------------------------------------------------
-- species_group: a light classifier alongside pets.species (which stays
-- free text, per §03 — this doesn't reintroduce per-species tables, it's
-- purely a hint for matching protocols). Optional; scheduling suggestions
-- just don't appear for a pet without one set.
-- ---------------------------------------------------------------------
create type menagerie.species_group as enum ('dog', 'cat', 'bird', 'reptile', 'fish', 'small_mammal', 'other');

alter table menagerie.pets add column species_group menagerie.species_group;

-- ---------------------------------------------------------------------
-- vaccine_protocols: global reference data (no tenant_id) -- the same
-- schedule applies regardless of which workspace is asking. Each row is
-- one concrete due-date rule. Series vaccines (e.g. a puppy's DHPP) get
-- one row per dose with dose_sequence + age_weeks_due; a single-dose or
-- the *last* dose of a series carries booster_interval_months, which is
-- what triggers the recurring reschedule once that dose is marked given
-- (see menagerie.vaccinations.protocol_id below).
-- ---------------------------------------------------------------------
create table menagerie.vaccine_protocols (
  id uuid primary key default gen_random_uuid(),
  species_group menagerie.species_group not null,
  vaccine_name text not null,
  dose_sequence int not null default 1,
  age_weeks_due int not null,
  booster_interval_months int,
  is_core boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create index vaccine_protocols_species_group_idx on menagerie.vaccine_protocols (species_group);

alter table menagerie.vaccine_protocols enable row level security;
create policy "protocols are readable by any signed-in user" on menagerie.vaccine_protocols
  for select using (true);
grant select on menagerie.vaccine_protocols to authenticated;

-- Widely-cited general schedules for dogs and cats. Real protocols vary by
-- vaccine brand, local disease prevalence, and vet judgment -- treat this
-- as a starting suggestion, not a prescription.
insert into menagerie.vaccine_protocols (species_group, vaccine_name, dose_sequence, age_weeks_due, booster_interval_months, is_core, notes) values
  ('dog', 'DHPP (Distemper, Hepatitis, Parvo, Parainfluenza)', 1, 6,  null, true, 'Puppy series, dose 1 of 3'),
  ('dog', 'DHPP (Distemper, Hepatitis, Parvo, Parainfluenza)', 2, 9,  null, true, 'Puppy series, dose 2 of 3'),
  ('dog', 'DHPP (Distemper, Hepatitis, Parvo, Parainfluenza)', 3, 12, 12,   true, 'Puppy series, dose 3 of 3 -- then annual booster'),
  ('dog', 'Rabies',                                            1, 12, 12,   true, 'Some vaccines/jurisdictions allow a 3-year interval after the first booster -- check locally'),
  ('dog', 'Bordetella (kennel cough)',                         1, 8,  12,   false, 'Often required for boarding/daycare'),
  ('cat', 'FVRCP (Rhinotracheitis, Calicivirus, Panleukopenia)', 1, 6,  null, true, 'Kitten series, dose 1 of 3'),
  ('cat', 'FVRCP (Rhinotracheitis, Calicivirus, Panleukopenia)', 2, 9,  null, true, 'Kitten series, dose 2 of 3'),
  ('cat', 'FVRCP (Rhinotracheitis, Calicivirus, Panleukopenia)', 3, 12, 12,   true, 'Kitten series, dose 3 of 3 -- then annual booster'),
  ('cat', 'Rabies',                                             1, 12, 12,   true, 'Some vaccines/jurisdictions allow a 3-year interval after the first booster -- check locally'),
  ('cat', 'FeLV (Feline Leukemia)',                             1, 9,  null, false, 'Kitten/at-risk series, dose 1 of 2'),
  ('cat', 'FeLV (Feline Leukemia)',                             2, 12, 12,   false, 'Kitten/at-risk series, dose 2 of 2 -- then annual if still at risk');

-- Links a generated vaccination back to the rule that created it -- both
-- so repeats aren't re-suggested, and so completing it knows whether (and
-- by how much) to auto-schedule the next one.
alter table menagerie.vaccinations
  add column protocol_id uuid references menagerie.vaccine_protocols (id) on delete set null;

-- ---------------------------------------------------------------------
-- medications: ongoing recurring treatments (heartworm/flea-tick
-- prevention, chronic-condition meds) -- a different shape from
-- vaccinations (which are discrete events): a medication has a dosage,
-- a dosing interval, and an optional end date (null = ongoing/indefinite).
-- Same exactly-one pet/group/habitat scope as vaccinations -- dosing is a
-- per-animal safety concern, not something sensibly shared household-wide.
-- ---------------------------------------------------------------------
create type menagerie.medication_status as enum ('active', 'completed', 'discontinued');

create table menagerie.medications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  pet_id uuid references menagerie.pets (id) on delete cascade,
  group_id uuid references menagerie.pet_groups (id) on delete cascade,
  habitat_id uuid references menagerie.habitats (id) on delete cascade,
  provider_id uuid references menagerie.service_providers (id) on delete set null,
  name text not null,
  dosage text,
  frequency_days int not null default 1,
  start_date date not null default current_date,
  end_date date,
  next_due_date date not null default current_date,
  status menagerie.medication_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  constraint medications_one_scope check (
    (pet_id is not null)::int + (group_id is not null)::int + (habitat_id is not null)::int = 1
  )
);

create index medications_tenant_id_idx on menagerie.medications (tenant_id);

alter table menagerie.medications enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['medications'] loop
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

grant select, insert, update, delete on menagerie.medications to authenticated;
