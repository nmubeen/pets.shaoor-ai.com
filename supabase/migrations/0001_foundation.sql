-- Phase 1: Foundation — schema, tenants, memberships, RLS.
-- Design doc §04 / §07 / §08. Everything here lives in its own schema
-- (menagerie) inside the shared shaoor-ai.com Supabase project.

create schema if not exists menagerie;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type menagerie.workspace_type as enum ('household', 'organization');
create type menagerie.membership_role as enum ('owner', 'caregiver', 'viewer');
create type menagerie.membership_status as enum ('invited', 'active', 'removed');

-- ---------------------------------------------------------------------
-- plans — the priced catalog, mirrored from Stripe (§08)
-- ---------------------------------------------------------------------
create table menagerie.plans (
  code text primary key,
  name text not null,
  stripe_price_id_monthly text,
  stripe_price_id_annual text,
  price_monthly_inr numeric,
  pet_limit int,        -- null = unlimited
  seat_limit int,        -- null = unlimited
  location_limit int    -- null = unlimited
);

insert into menagerie.plans (code, name, price_monthly_inr, pet_limit, seat_limit, location_limit) values
  ('litter',    'Litter',            0,    3,    1,    1),
  ('household', 'Household',       349, null,    3,    1),
  ('sanctuary', 'Sanctuary',       799, null, null,    3),
  ('rescue',    'Rescue & Shelter', null, null, null, null);

-- ---------------------------------------------------------------------
-- tenants — the billable workspace, replaces "households" (§08)
-- ---------------------------------------------------------------------
create table menagerie.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  workspace_type menagerie.workspace_type not null default 'household',
  plan_code text not null references menagerie.plans (code) default 'sanctuary',
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- memberships — who can act inside a tenant, and how (§08)
-- ---------------------------------------------------------------------
create table menagerie.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  invited_email text not null,
  role menagerie.membership_role not null default 'caregiver',
  status menagerie.membership_status not null default 'invited',
  created_at timestamptz not null default now(),
  unique (tenant_id, invited_email)
);

create index memberships_user_id_idx on menagerie.memberships (user_id);
create index memberships_tenant_id_idx on menagerie.memberships (tenant_id);

-- ---------------------------------------------------------------------
-- RLS helper functions — reused by every policy in the schema (§04)
-- ---------------------------------------------------------------------
create function menagerie.my_tenant_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select tenant_id from menagerie.memberships
  where user_id = auth.uid() and status = 'active'
$$;

create function menagerie.is_tenant_owner(p_tenant_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from menagerie.memberships
    where tenant_id = p_tenant_id and user_id = auth.uid()
      and role = 'owner' and status = 'active'
  )
$$;

create function menagerie.can_write_tenant(p_tenant_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from menagerie.memberships
    where tenant_id = p_tenant_id and user_id = auth.uid()
      and role in ('owner', 'caregiver') and status = 'active'
  )
$$;

-- ---------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------
alter table menagerie.plans enable row level security;
create policy "plans are public" on menagerie.plans for select using (true);

alter table menagerie.tenants enable row level security;
create policy "tenant isolation - select" on menagerie.tenants for select
  using (id in (select menagerie.my_tenant_ids()));
create policy "tenant isolation - update" on menagerie.tenants for update
  using (menagerie.is_tenant_owner(id)) with check (menagerie.is_tenant_owner(id));

alter table menagerie.memberships enable row level security;
create policy "memberships - select own tenant or own invite" on menagerie.memberships for select
  using (tenant_id in (select menagerie.my_tenant_ids()) or invited_email = auth.email());
create policy "memberships - owner inserts" on menagerie.memberships for insert
  with check (menagerie.is_tenant_owner(tenant_id));
create policy "memberships - owner updates" on menagerie.memberships for update
  using (menagerie.is_tenant_owner(tenant_id)) with check (menagerie.is_tenant_owner(tenant_id));
create policy "memberships - owner deletes" on menagerie.memberships for delete
  using (menagerie.is_tenant_owner(tenant_id));

grant usage on schema menagerie to anon, authenticated;
grant select on menagerie.plans to anon, authenticated;
grant select, update on menagerie.tenants to authenticated;
grant select, insert, update, delete on menagerie.memberships to authenticated;

-- ---------------------------------------------------------------------
-- accept_pending_invites — call after login so an existing user who was
-- invited to another tenant gets linked, not just at signup time.
-- ---------------------------------------------------------------------
create function menagerie.accept_pending_invites()
returns void
language sql security definer set search_path = ''
as $$
  update menagerie.memberships
  set user_id = auth.uid(), status = 'active'
  where invited_email = auth.email() and status = 'invited' and user_id is null;
$$;

grant execute on function menagerie.accept_pending_invites() to authenticated;

-- ---------------------------------------------------------------------
-- handle_new_user — on signup, reconcile pending invites for this email
-- and, if the signup carried workspace_name/workspace_type metadata
-- (the "create a workspace" signup form), create that tenant + the
-- owner membership. Re-defined in 0002_billing.sql to also seed the
-- trial subscription row once menagerie.subscriptions exists.
-- ---------------------------------------------------------------------
create function menagerie.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_workspace_name text := new.raw_user_meta_data ->> 'workspace_name';
  v_workspace_type text := coalesce(new.raw_user_meta_data ->> 'workspace_type', 'household');
  v_tenant_id uuid;
begin
  update menagerie.memberships
  set user_id = new.id, status = 'active'
  where invited_email = new.email and status = 'invited' and user_id is null;

  if v_workspace_name is not null and length(trim(v_workspace_name)) > 0 then
    insert into menagerie.tenants (name, workspace_type, plan_code, trial_ends_at)
    values (v_workspace_name, v_workspace_type::menagerie.workspace_type, 'sanctuary', now() + interval '14 days')
    returning id into v_tenant_id;

    insert into menagerie.memberships (tenant_id, user_id, invited_email, role, status)
    values (v_tenant_id, new.id, new.email, 'owner', 'active');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function menagerie.handle_new_user();
