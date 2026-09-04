-- The vet/hospital (service_providers) is the facility; the actual
-- consulting doctor within it can vary visit to visit, so it's a free-text
-- field per vet_visit rather than another linked entity.
alter table menagerie.vet_visits add column vet_name text;
