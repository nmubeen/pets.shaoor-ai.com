-- Two unrelated changes, bundled because both came out of the same round
-- of user feedback on the 0015 groups redesign.

-- 1. Groups are gone entirely — turned out not to earn their keep even in
-- the lighter "saved collection of pets" form from 0015. Drops both
-- tables outright (DROP TABLE takes its policies/grants with it); nothing
-- else in the schema references them (groups were never a scope target
-- after 0015, so no FK cleanup needed elsewhere).
drop table menagerie.pet_group_members;
drop table menagerie.pet_groups;

-- 2. Weight is normally checked at every vet or grooming visit — capture
-- it right on those two tables (optional; not every visit involves a
-- scale) rather than a separate log-weight flow. A pet's growth chart
-- (lib/growth.ts) is just these two columns merged and sorted by date;
-- pets.weight_kg (the manually-set "current weight" on the pet's own
-- record) is intentionally left alone — a separate, simpler snapshot
-- field, not auto-synced from visit history.
alter table menagerie.vet_visits add column weight_kg numeric;
alter table menagerie.grooming_visits add column weight_kg numeric;
