-- Services (and their reminder frequency) often differ by species — e.g.
-- Deworming might be every 30 days for a dog but every 60 for a cat, or a
-- service might only apply to one species at all (wing clipping, for a
-- bird). species_group is nullable: null means "applies to any species"
-- (a generic catalog entry, e.g. "Consultation"); set means it's specific
-- to that species and tracked/reminded separately from the same-named
-- service for a different one — see findOrCreateServiceType in
-- lib/actions/health.ts for how a visit picks between them.
--
-- Checked against the live project before writing this: 0 care_service_types
-- rows exist yet, so no data migration is needed for the uniqueness change.

alter table menagerie.care_service_types add column species_group menagerie.species_group;
create index care_service_types_species_group_idx on menagerie.care_service_types (species_group);

drop index menagerie.care_service_types_tenant_name_uidx;
-- Two partial indexes instead of one coalesce-based one (an enum->text
-- cast isn't reliably usable in an index expression) — together they mean
-- "Deworming" can exist once per species plus once generically, but never
-- duplicated within either.
create unique index care_service_types_tenant_name_species_uidx
  on menagerie.care_service_types (tenant_id, lower(name), species_group) where species_group is not null;
create unique index care_service_types_tenant_name_generic_uidx
  on menagerie.care_service_types (tenant_id, lower(name)) where species_group is null;
