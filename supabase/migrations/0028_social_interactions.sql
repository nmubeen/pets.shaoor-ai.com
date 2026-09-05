-- Follow-up to 0027 (which only added the enum values) — everything that
-- actually references 'social' goes here, in its own transaction so
-- Postgres will let us use the new enum value.
--
-- Social needs write access to exactly two things (liking a photo,
-- posting a comment) — narrower than menagerie.can_write_tenant()'s
-- owner/caregiver, wider than "read only". A new helper function, used
-- only by comments' insert policy and the new media_likes table, keeps
-- every other table's existing can_write_tenant()-gated policies
-- untouched (social still can't upload/edit/delete media, add pets,
-- log visits, etc.).
create function menagerie.can_social_interact_tenant(p_tenant_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from menagerie.memberships
    where tenant_id = p_tenant_id and user_id = auth.uid()
      and role in ('owner', 'caregiver', 'social') and status = 'active'
  )
$$;

-- Widen comments' insert policy only — select/update/delete are
-- untouched, so a comment still can't be edited or removed by anyone but
-- owner/caregiver, matching "no edit" for Social beyond posting new ones.
drop policy "tenant isolation - insert" on menagerie.comments;
create policy "tenant isolation - insert" on menagerie.comments for insert
  with check (menagerie.can_social_interact_tenant(tenant_id));

-- ---------------------------------------------------------------------
-- media_likes — brand new; there was no "like" feature at all before this.
-- A like is binary (insert to like, delete to unlike), so there's no
-- update policy. Select is the normal tenant-wide read (everyone sees
-- like counts, including viewer/vet_view); insert/delete are further
-- restricted to your own row so one member can't remove another's like.
-- ---------------------------------------------------------------------
create table menagerie.media_likes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  media_id uuid not null references menagerie.media (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (media_id, user_id)
);

create index media_likes_media_id_idx on menagerie.media_likes (media_id);

alter table menagerie.media_likes enable row level security;

create policy "tenant isolation - select" on menagerie.media_likes for select
  using (tenant_id in (select menagerie.my_tenant_ids()));
create policy "social can like" on menagerie.media_likes for insert
  with check (menagerie.can_social_interact_tenant(tenant_id) and user_id = auth.uid());
create policy "social can unlike own" on menagerie.media_likes for delete
  using (menagerie.can_social_interact_tenant(tenant_id) and user_id = auth.uid());

grant select, insert, delete on menagerie.media_likes to authenticated;
