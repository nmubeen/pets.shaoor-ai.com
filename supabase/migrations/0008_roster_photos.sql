-- Display photo for each roster item (pet, group, habitat). Stored in the
-- same private "media" Storage bucket created in 0006_gallery.sql, under
-- {tenant_id}/avatars/... — no new bucket or storage.objects policies
-- needed, the existing tenant-prefix policies already cover this path.

alter table menagerie.pets add column photo_path text;
alter table menagerie.pet_groups add column photo_path text;
alter table menagerie.habitats add column photo_path text;
