-- Extends the "a visit can carry any mix of things" model
-- (0020_unified_visits.sql, which did this for services + vaccinations
-- given) to illnesses and medications too — the Visits form can now also
-- capture an illness diagnosed or a medication prescribed during the same
-- trip, appearing in the Illnesses/Medications lists exactly like a
-- visit-given vaccination already does (same visit_id linkage, same
-- on delete set null — deleting the visit unlinks these records rather
-- than deleting them, so the diagnosis/prescription history survives).
alter table menagerie.illnesses add column visit_id uuid references menagerie.visits (id) on delete set null;
alter table menagerie.medications add column visit_id uuid references menagerie.visits (id) on delete set null;

-- Clinic name for vaccinations: a visit-given vaccination's clinic is
-- just the visit's own provider (no new column needed there); a direct
-- (standalone) vaccination entry had no way to record one at all until
-- now — mirrors medications.provider_id, added in 0014_predictive_scheduling.sql.
alter table menagerie.vaccinations add column provider_id uuid references menagerie.service_providers (id) on delete set null;
