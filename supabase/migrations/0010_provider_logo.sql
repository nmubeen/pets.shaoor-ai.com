-- Display photo/logo for a service provider — same private "media" Storage
-- bucket and path-prefix pattern as roster photos (0008) and gallery
-- photos (0006), under {tenant_id}/providers/...

alter table menagerie.service_providers add column logo_path text;
