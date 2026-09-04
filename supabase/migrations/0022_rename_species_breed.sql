-- Renames the two overlapping "what animal is this" concepts to remove
-- the confusion between them: the old free-text `species` column (which
-- in practice held things like "Persian Cat" or "Labrador" — really a
-- breed) becomes `breed`; the old `species_group` enum (dog/cat/bird/...)
-- becomes `species` — now the one structured, required field that answers
-- "what species", with `breed` the one free-text required field for the
-- specifics. Both become required (§ "explore phase, don't worry about
-- existing data" — but there IS live data: 3 real pets, all named "Persian
-- Cat" with no species_group set, so this backfills a sensible species
-- from the old free text rather than just defaulting everything to
-- "other").

update menagerie.pets set species_group = (case
  when species ilike '%cat%' then 'cat'
  when species ilike '%dog%' then 'dog'
  when species ilike '%bird%' then 'bird'
  when species ilike '%fish%' then 'fish'
  when species ilike '%reptile%' or species ilike '%lizard%' or species ilike '%snake%' or species ilike '%turtle%' then 'reptile'
  else 'other'
end)::menagerie.species_group
where species_group is null;

update menagerie.pets set breed = species where breed is null;

alter table menagerie.pets drop column species;
alter table menagerie.pets rename column species_group to species;
alter table menagerie.pets alter column species set not null;
alter table menagerie.pets alter column breed set not null;

-- Same rename everywhere else species_group appeared, for consistency.
alter table menagerie.vaccine_protocols rename column species_group to species;
alter index menagerie.vaccine_protocols_species_group_idx rename to vaccine_protocols_species_idx;

alter table menagerie.care_service_types rename column species_group to species;
alter index menagerie.care_service_types_species_group_idx rename to care_service_types_species_idx;

alter type menagerie.species_group rename to species;
