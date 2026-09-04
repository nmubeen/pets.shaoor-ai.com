-- GPS location + business timings for providers with a physical location
-- to visit (vet, grooming, offline_shop — the same "not online" split the
-- form already draws for phone/address; online shops are just websites,
-- no location or opening hours to speak of).

alter table menagerie.service_providers add column latitude numeric;
alter table menagerie.service_providers add column longitude numeric;
alter table menagerie.service_providers add column business_hours text;

-- Both-or-neither, and sane coordinate ranges, so a half-entered or typo'd
-- GPS pin can't silently produce a broken "view on map" link.
alter table menagerie.service_providers add constraint service_providers_gps_pair check (
  (latitude is null) = (longitude is null)
);
alter table menagerie.service_providers add constraint service_providers_lat_range check (
  latitude is null or (latitude >= -90 and latitude <= 90)
);
alter table menagerie.service_providers add constraint service_providers_lng_range check (
  longitude is null or (longitude >= -180 and longitude <= 180)
);
