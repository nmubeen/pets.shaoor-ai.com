-- Shared Auth identities must never automatically provision Pets data.
-- Run transactionally through scripts/migrate.mjs. No historical backfill.
-- Pets supports multiple memberships; existing households remain authoritative.
-- This nullable key only identifies households created by the new provisioner.
alter table menagerie.tenants add column owner_user_id uuid unique
  references auth.users(id) on delete set null;

create function menagerie.ensure_account(p_user_id uuid, p_email text, p_name text)
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
  if not found then
    -- Reuse legacy households and invited memberships without backfilling
    -- ownership or promoting a caregiver/viewer to owner.
    select t.* into v_tenant
    from menagerie.tenants t join menagerie.memberships m on m.tenant_id = t.id
    where m.user_id = p_user_id and m.status = 'active'
    order by (m.role = 'owner') desc, m.created_at, m.id limit 1;
  end if;

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
    insert into menagerie.memberships (tenant_id, user_id, invited_email, role, status)
    values (v_tenant.id, p_user_id, p_email, 'owner', 'active');

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

create function menagerie.ensure_my_account()
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
  -- Reconcile invitations only AFTER the shared Pets membership gate.
  perform menagerie.accept_pending_invites();
  return menagerie.ensure_account(v_user_id, v_email, null);
end;
$$;
revoke all on function menagerie.ensure_my_account() from public, anon, service_role;
grant execute on function menagerie.ensure_my_account() to authenticated;

-- The original Pets trigger name was also used by public.handle_new_user.
-- Match the backing schema, never drop another app's trigger by name.
do $$
declare v_trigger record;
begin
  for v_trigger in
    select t.tgname from pg_trigger t join pg_proc p on p.oid = t.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where t.tgrelid = 'auth.users'::regclass and n.nspname = 'menagerie'
  loop
    execute format('drop trigger %I on auth.users', v_trigger.tgname);
  end loop;
end;
$$;
drop function menagerie.handle_new_user();
notify pgrst, 'reload schema';
