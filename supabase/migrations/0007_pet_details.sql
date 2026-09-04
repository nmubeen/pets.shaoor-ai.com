-- Richer pet records — the original schema only captured name/species/
-- life_stage/notes, which turned out to be too thin for a real pet-care
-- record. RLS is unaffected: the existing can_write_tenant() update policy
-- on menagerie.pets already covers editing these new columns.

alter table menagerie.pets
  add column breed text,
  add column sex text check (sex in ('male', 'female', 'unknown')) default 'unknown',
  add column birth_date date,
  add column weight_kg numeric,
  add column color text,
  add column microchip_id text,
  add column neutered boolean;
