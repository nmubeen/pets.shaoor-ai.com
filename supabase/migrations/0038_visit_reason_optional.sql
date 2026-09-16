-- The visit form no longer collects "Reason" — it never carried information
-- the Services list (and now the mandatory provider field) didn't already
-- give more usefully: "Consultation" was the default for nearly every
-- visit, and a free-text reason duplicated what Services already listed.
-- Made nullable rather than dropped: existing visits keep whatever reason
-- text they already have on file, the app just stops reading/writing it.
alter table menagerie.visits alter column reason drop not null;
