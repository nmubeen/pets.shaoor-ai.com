-- Single-user accounts. Apply after 0032, before deploying the matching app.
-- Preserve business records, subscription state and historical contributors.
-- Never turn an invited/shared member into the owner of someone else's data.
-- Ambiguous legacy ownership must be resolved explicitly before retrying.
do $$
begin
  if exists (
    select tenant_id from menagerie.memberships
    where role = 'owner' and status = 'active' and user_id is not null
    group by tenant_id having count(distinct user_id) > 1
  ) then
    raise exception 'Multiple owners found for a Pets account; resolve ownership before migrating';
  end if;
  if exists (
    select 1 from menagerie.tenants t join menagerie.memberships m on m.tenant_id = t.id
    where m.role = 'owner' and m.status = 'active' and m.user_id is not null
      and t.owner_user_id is not null and t.owner_user_id <> m.user_id
  ) then
    raise exception 'Pets account ownership conflicts with its legacy owner; resolve before migrating';
  end if;
  if exists (
    select owner_id from (
      select t.id, coalesce(t.owner_user_id, m.user_id) as owner_id
      from menagerie.tenants t left join menagerie.memberships m
        on m.tenant_id = t.id and m.role = 'owner' and m.status = 'active' and m.user_id is not null
    ) owners where owner_id is not null
    group by owner_id having count(distinct id) > 1
  ) then
    raise exception 'A user owns multiple Pets accounts; consolidate or reassign them before migrating';
  end if;
end;
$$;

update menagerie.tenants t set owner_user_id = m.user_id
from menagerie.memberships m
where t.id = m.tenant_id and t.owner_user_id is null
  and m.role = 'owner' and m.status = 'active' and m.user_id is not null;

-- Keep helper signatures used by existing record and Storage policies.
-- Their only authority is now the account owner, never a team membership.
create or replace function menagerie.my_tenant_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select id from menagerie.tenants where owner_user_id = auth.uid()
$$;
create or replace function menagerie.is_tenant_owner(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from menagerie.tenants where id = p_tenant_id and owner_user_id = auth.uid())
$$;
create or replace function menagerie.can_write_tenant(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select menagerie.is_tenant_owner(p_tenant_id)
$$;

-- Protect the ownership key from direct client changes.
revoke update on menagerie.tenants from authenticated;
grant update (name, workspace_type) on menagerie.tenants to authenticated;

drop policy "tenant isolation - insert" on menagerie.comments;
create policy "tenant isolation - insert" on menagerie.comments for insert
  with check (menagerie.can_write_tenant(tenant_id) and author_id = auth.uid());
drop policy "social can like" on menagerie.media_likes;
drop policy "social can unlike own" on menagerie.media_likes;
create policy "owner can like" on menagerie.media_likes for insert
  with check (menagerie.can_write_tenant(tenant_id) and user_id = auth.uid());
create policy "owner can unlike" on menagerie.media_likes for delete
  using (menagerie.can_write_tenant(tenant_id) and user_id = auth.uid());
drop function menagerie.can_social_interact_tenant(uuid);

create or replace function menagerie.ensure_account(p_user_id uuid, p_email text, p_name text)
returns menagerie.tenants
language plpgsql security definer set search_path = ''
as $$
declare
  v_tenant menagerie.tenants;
  v_created boolean := false;
begin
  if p_user_id is null or nullif(p_email, '') is null then
    raise exception 'Authenticated email required';
  end if;

  select * into v_tenant from menagerie.tenants where owner_user_id = p_user_id;

  if v_tenant.id is null then
    insert into menagerie.tenants (owner_user_id, name, workspace_type, plan_code, trial_ends_at)
    values (p_user_id, coalesce(nullif(btrim(p_name), ''), split_part(p_email, '@', 1) || '''s household'),
      'household', 'sanctuary', now() + interval '14 days')
    on conflict (owner_user_id) do nothing returning * into v_tenant;
    v_created := found;
    if not v_created then
      select * into v_tenant from menagerie.tenants where owner_user_id = p_user_id;
    end if;
  end if;

  if v_tenant.id is null then raise exception 'Unable to resolve Pets household'; end if;

  if v_created then
    insert into menagerie.service_providers (tenant_id, category, name, website)
    values
      (v_tenant.id, 'online_shop', 'Amazon', 'https://www.amazon.in'),
      (v_tenant.id, 'online_shop', 'Flipkart', 'https://www.flipkart.com/'),
      (v_tenant.id, 'online_shop', 'Zepto', 'https://www.zepto.com/'),
      (v_tenant.id, 'online_shop', 'Blinkit', 'https://blinkit.com/'),
      (v_tenant.id, 'online_shop', 'Supertails', 'https://supertails.com/'),
      (v_tenant.id, 'online_shop', 'Instamart', 'https://instamart.in');
    insert into menagerie.shopping_categories (tenant_id, name)
    select v_tenant.id, name from (values ('Food'), ('Treats'), ('Toys'),
      ('Grooming & Hygiene'), ('Health & Medicine'), ('Accessories'),
      ('Bedding & Litter'), ('Other')) as defaults(name);
  end if;

  -- Converges for existing, new and concurrent requests. Never UPDATE a
  -- subscription, reset a trial, change a plan or touch payment fields.
  insert into menagerie.subscriptions (tenant_id, status)
  values (v_tenant.id, 'trialing') on conflict (tenant_id) do nothing;
  return v_tenant;
end;
$$;
revoke all on function menagerie.ensure_account(uuid, text, text)
  from public, anon, authenticated, service_role;

create or replace function menagerie.ensure_my_account()
returns menagerie.tenants
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.app_memberships
    where user_id = v_user_id and app_key = 'pets' and status = 'active') then
    raise exception 'Active Pets membership required';
  end if;
  select email into v_email from auth.users where id = v_user_id;
  return menagerie.ensure_account(v_user_id, v_email, null);
end;
$$;
revoke all on function menagerie.ensure_my_account() from public, anon, service_role;
grant execute on function menagerie.ensure_my_account() to authenticated;


drop function menagerie.accept_pending_invites();
drop function menagerie.team_last_logins(uuid);

-- Retain historical invitation/attribution data outside the exposed schema.
-- No application code, RPC or RLS helper consults this archive.
drop policy "memberships - select own tenant or own invite" on menagerie.memberships;
drop policy "memberships - owner inserts" on menagerie.memberships;
drop policy "memberships - owner updates" on menagerie.memberships;
drop policy "memberships - owner deletes" on menagerie.memberships;
revoke all on menagerie.memberships from public, anon, authenticated;
create schema if not exists menagerie_archive;
revoke all on schema menagerie_archive from public, anon, authenticated;
alter table menagerie.memberships set schema menagerie_archive;
alter type menagerie.membership_role set schema menagerie_archive;
alter type menagerie.membership_status set schema menagerie_archive;

alter table menagerie.plans drop column seat_limit;
notify pgrst, 'reload schema';
