-- A photo of the doctor's handwritten prescription — same "media" Storage
-- bucket and path-prefix convention as pet/habitat/provider photos
-- (lib/storage.ts), just one more optional path column on the visit
-- itself rather than a separate table (a visit has at most one).
alter table menagerie.visits add column prescription_photo_path text;
