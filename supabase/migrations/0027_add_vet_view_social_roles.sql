-- Two new read-mostly roles: vet_view (a mobile-friendly, read-only
-- one-page summary meant to be shown to or shared with a vet) and social
-- (read-only pet cards + Gallery, with like/comment access, meant for
-- family and friends). Deliberately its own migration with nothing else
-- in it — Postgres forbids using a freshly added enum value in the same
-- transaction that added it, and scripts/migrate.mjs runs each file in
-- one transaction, so anything that references these literals (the new
-- can_social_interact_tenant() helper, RLS policies, etc.) has to live in
-- a later migration. See 0028_social_interactions.sql.
alter type menagerie.membership_role add value 'vet_view';
alter type menagerie.membership_role add value 'social';
