-- "At home" services (bathing, deworming, nail clipping, ...) done without
-- a physical provider. Not a service_providers row — that table models
-- real-world businesses/clinics with their own category, contact info,
-- etc., and "At home" is neither of those; it's a single synthetic choice
-- in the visit form's provider dropdown. provider_id stays null for these
-- visits (same as it always could), this flag is what tells "at home" and
-- "no provider recorded" apart now that the field is mandatory going
-- forward — see lib/actions/health.ts's addVisit/updateVisit.
alter table menagerie.visits add column at_home boolean not null default false;
