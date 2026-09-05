-- Replaces GPS coordinates with a single location URL — a pasted Google
-- Maps (or any map) share link is what most people actually have to hand,
-- and it also covers a place with no fixed lat/lng worth pinning (a
-- shopping mall wing, a multi-entrance complex). Backfills existing
-- latitude/longitude pairs into the same maps.google.com URL the app used
-- to build for "View on map" before dropping the two numeric columns and
-- their check constraints.
alter table menagerie.service_providers add column location_url text;

update menagerie.service_providers
set location_url = 'https://www.google.com/maps?q=' || latitude || ',' || longitude
where latitude is not null and longitude is not null;

alter table menagerie.service_providers drop constraint service_providers_gps_pair;
alter table menagerie.service_providers drop constraint service_providers_lat_range;
alter table menagerie.service_providers drop constraint service_providers_lng_range;
alter table menagerie.service_providers drop column latitude;
alter table menagerie.service_providers drop column longitude;

-- Vets/Hospitals need a way to reach out by email — most other provider
-- categories transact by phone/in person, so this stays optional for all
-- categories at the DB level (like phone/address already are) rather than
-- a vet-only column; the form only surfaces it for that category.
alter table menagerie.service_providers add column email text;
