-- Phase 6: Gallery & org tier (§13 roadmap phase 6). media/comments follow
-- the same zero-or-one pet/group/habitat scope as shopping_orders/care_tasks
-- (§03) — a photo can be of the whole household, not just one roster item.
--
-- Public adoption profiles (§02, org-tier differentiator): pets.is_adoptable
-- plus an additive "public" RLS policy — a row is visible if the caller
-- belongs to the tenant OR the pet is marked adoptable, no auth needed for
-- the latter. Photos are intentionally NOT exposed publicly (the media
-- bucket stays private, signed URLs only for tenant members) — that needs
-- a service-role bypass this project doesn't have configured yet, so public
-- profiles are text-only for now (name/species/adoption_note/org name).

create table menagerie.media (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  pet_id uuid references menagerie.pets (id) on delete cascade,
  group_id uuid references menagerie.pet_groups (id) on delete cascade,
  habitat_id uuid references menagerie.habitats (id) on delete cascade,
  storage_path text not null,
  caption text,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint media_at_most_one_scope check (
    (pet_id is not null)::int + (group_id is not null)::int + (habitat_id is not null)::int <= 1
  )
);

create table menagerie.comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  media_id uuid not null references menagerie.media (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index media_tenant_id_idx on menagerie.media (tenant_id);
create index comments_media_id_idx on menagerie.comments (media_id);

alter table menagerie.media enable row level security;
alter table menagerie.comments enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['media', 'comments'] loop
    execute format(
      'create policy "tenant isolation - select" on menagerie.%I for select using (tenant_id in (select menagerie.my_tenant_ids()))',
      t
    );
    execute format(
      'create policy "tenant isolation - insert" on menagerie.%I for insert with check (menagerie.can_write_tenant(tenant_id))',
      t
    );
    execute format(
      'create policy "tenant isolation - update" on menagerie.%I for update using (menagerie.can_write_tenant(tenant_id)) with check (menagerie.can_write_tenant(tenant_id))',
      t
    );
    execute format(
      'create policy "tenant isolation - delete" on menagerie.%I for delete using (menagerie.can_write_tenant(tenant_id))',
      t
    );
  end loop;
end $$;

grant select, insert, update, delete on menagerie.media, menagerie.comments to authenticated;

-- ---------------------------------------------------------------------
-- Public adoption profiles
-- ---------------------------------------------------------------------
alter table menagerie.pets add column is_adoptable boolean not null default false;
alter table menagerie.pets add column adoption_note text;

create policy "adoption profiles are public" on menagerie.pets for select using (is_adoptable = true);
grant select on menagerie.pets to anon;

create policy "tenant name is public for adoptable pets" on menagerie.tenants for select
  using (exists (select 1 from menagerie.pets p where p.tenant_id = tenants.id and p.is_adoptable));
grant select on menagerie.tenants to anon;

-- ---------------------------------------------------------------------
-- Storage — one private bucket, tenant_id as the first path segment
-- (media/{tenant_id}/{file}), matching §06 of the design doc.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

create policy "tenant members can read own media"
  on storage.objects for select
  using (bucket_id = 'media' and (storage.foldername(name))[1]::uuid in (select menagerie.my_tenant_ids()));

create policy "tenant members can upload own media"
  on storage.objects for insert
  with check (bucket_id = 'media' and menagerie.can_write_tenant((storage.foldername(name))[1]::uuid));

create policy "tenant members can delete own media"
  on storage.objects for delete
  using (bucket_id = 'media' and menagerie.can_write_tenant((storage.foldername(name))[1]::uuid));
