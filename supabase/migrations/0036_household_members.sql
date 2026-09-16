-- Re-introduces multi-user households — deliberately not a restoration of
-- the old menagerie_archive.memberships table (0033_single_user_accounts.sql
-- archived that one for good, with its own role/status enums; it stays
-- untouched as inert history). This is a fresh, intentionally simpler
-- table: no roles. Every household member — owner or invited — has
-- identical full access to everything in the household, including billing
-- and inviting/removing other members. That's a real product decision
-- (not a placeholder for "add roles later"): the whole point was to avoid
-- reintroducing role/permission complexity.
create table menagerie.household_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  -- Null until the invited email actually signs in and claims this row
  -- (see ensure_account below).
  user_id uuid references auth.users (id) on delete cascade,
  invited_email text not null,
  status text not null default 'invited' check (status in ('invited', 'active')),
  invited_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (tenant_id, invited_email)
);

create index household_members_tenant_id_idx on menagerie.household_members (tenant_id);
create index household_members_user_id_idx on menagerie.household_members (user_id);

alter table menagerie.household_members enable row level security;

create policy "tenant isolation - select" on menagerie.household_members for select
  using (tenant_id in (select menagerie.my_tenant_ids()));
create policy "tenant isolation - insert" on menagerie.household_members for insert
  with check (menagerie.can_write_tenant(tenant_id));
create policy "tenant isolation - delete" on menagerie.household_members for delete
  using (menagerie.can_write_tenant(tenant_id));

grant select, insert, delete on menagerie.household_members to authenticated;

-- ---------------------------------------------------------------------
-- Widen "who can act as this tenant" from just its owner to the owner
-- plus every active household member — every other table's RLS policy in
-- the schema already calls can_write_tenant()/my_tenant_ids() rather than
-- checking owner_user_id directly, so this one change is what actually
-- grants members full read/write access everywhere, with no other policy
-- edits needed. Same function names as before (not renamed) to avoid
-- touching every call site across the schema; the meaning has just
-- widened from "owner" to "owner or member".
-- ---------------------------------------------------------------------
create or replace function menagerie.my_tenant_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select id from menagerie.tenants where owner_user_id = auth.uid()
  union
  select tenant_id from menagerie.household_members where user_id = auth.uid() and status = 'active'
$$;

create or replace function menagerie.is_tenant_owner(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from menagerie.tenants where id = p_tenant_id and owner_user_id = auth.uid())
      or exists (
        select 1 from menagerie.household_members
        where tenant_id = p_tenant_id and user_id = auth.uid() and status = 'active'
      )
$$;

-- ---------------------------------------------------------------------
-- Claiming an invite on first sign-in takes priority over provisioning a
-- brand-new household — an invited email's first sign-in should join the
-- household it was invited to, never spin up a separate one of its own.
-- ---------------------------------------------------------------------
create or replace function menagerie.ensure_account(p_user_id uuid, p_email text, p_name text)
returns menagerie.tenants
language plpgsql security definer set search_path = ''
as $$
declare
  v_tenant menagerie.tenants;
  v_created boolean := false;
  v_invite menagerie.household_members;
begin
  if p_user_id is null or nullif(p_email, '') is null then
    raise exception 'Authenticated email required';
  end if;

  select * into v_invite from menagerie.household_members
    where lower(invited_email) = lower(p_email) and status = 'invited'
    order by created_at limit 1;

  if v_invite.id is not null then
    update menagerie.household_members
      set user_id = p_user_id, status = 'active', joined_at = now()
      where id = v_invite.id;
    select * into v_tenant from menagerie.tenants where id = v_invite.tenant_id;
    if v_tenant.id is null then raise exception 'Unable to resolve the household you were invited to'; end if;
    return v_tenant;
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

  insert into menagerie.subscriptions (tenant_id, status)
  values (v_tenant.id, 'trialing') on conflict (tenant_id) do nothing;
  return v_tenant;
end;
$$;
