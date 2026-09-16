-- Lets someone who already owns a household switch to one they've been
-- invited to instead — deliberately not "belong to both": the household
-- model stays exactly one per user (owned or joined, never several), so
-- switching means abandoning the old one entirely. The app's own
-- confirmation step (type the household name) is the only thing standing
-- between a click and permanently losing every pet/visit/order/photo in
-- it — this function is the point of no return, so it re-validates
-- everything itself rather than trusting the caller.

-- ---------------------------------------------------------------------
-- 1. A pending invite needs to be visible to the person it's for before
--    they've joined anything (my_tenant_ids() only covers tenants
--    they're already active in) — same "or invited_email = auth.email()"
--    escape hatch the original (now-archived) memberships table had. The
--    tenants policy needs the matching escape hatch too, so the
--    switch-household prompt can show *which* household they're invited
--    to by name before they've joined it.
-- ---------------------------------------------------------------------
drop policy "tenant isolation - select" on menagerie.household_members;
create policy "tenant isolation - select" on menagerie.household_members for select
  using (tenant_id in (select menagerie.my_tenant_ids()) or invited_email = auth.email());

drop policy "tenant isolation - select" on menagerie.tenants;
create policy "tenant isolation - select" on menagerie.tenants for select
  using (
    id in (select menagerie.my_tenant_ids())
    or id in (select tenant_id from menagerie.household_members where invited_email = auth.email() and status = 'invited')
  );

-- Declining (vs. accepting) an invite is the one case where the invitee
-- themself — not yet a member of that tenant, so can_write_tenant() would
-- say no — needs to remove their own pending row.
drop policy "tenant isolation - delete" on menagerie.household_members;
create policy "tenant isolation - delete" on menagerie.household_members for delete
  using (menagerie.can_write_tenant(tenant_id) or (invited_email = auth.email() and status = 'invited'));

-- ---------------------------------------------------------------------
-- 2. ensure_account() must NOT auto-claim a pending invite for someone
--    who already owns a household — that would silently make
--    my_tenant_ids() return two tenants (their own + the invited one),
--    which breaks every "exactly one household" assumption in the app
--    (starting with lib/tenant.ts's own .maybeSingle() lookup). Owning a
--    household now takes priority; claiming an invite while already an
--    owner only ever happens through switch_to_household() below, after
--    the person has explicitly chosen to abandon the old one.
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

  select * into v_tenant from menagerie.tenants where owner_user_id = p_user_id;

  if v_tenant.id is null then
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

-- ---------------------------------------------------------------------
-- 3. The actual switch: delete the caller's own owned household (cascades
--    to every pet/visit/order/photo row — every tenant_id foreign key in
--    the schema is `on delete cascade`) and claim the invite, atomically.
--    Deliberately not exposed as a general "delete my tenant" capability
--    (there's no DELETE policy/grant on menagerie.tenants at all) — this
--    only ever fires in the one narrow, pre-validated circumstance the
--    app's switch-household flow calls it from. Razorpay
--    cancellation and Storage cleanup happen in application code around
--    this call (neither is reachable from SQL) — see
--    lib/actions/tenant.ts's switchToInvitedHousehold.
-- ---------------------------------------------------------------------
create or replace function menagerie.switch_to_household(p_invite_id uuid)
returns menagerie.tenants
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_invite menagerie.household_members;
  v_old_tenant_id uuid;
  v_new_tenant menagerie.tenants;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select email into v_email from auth.users where id = v_user_id;
  if nullif(v_email, '') is null then raise exception 'Authenticated email required'; end if;

  select * into v_invite from menagerie.household_members
    where id = p_invite_id and lower(invited_email) = lower(v_email) and status = 'invited';
  if v_invite.id is null then raise exception 'That invite is no longer available'; end if;

  select id into v_old_tenant_id from menagerie.tenants where owner_user_id = v_user_id;
  if v_old_tenant_id is null then raise exception 'No existing household to switch from'; end if;
  if v_old_tenant_id = v_invite.tenant_id then raise exception 'Already the same household'; end if;

  delete from menagerie.tenants where id = v_old_tenant_id;

  update menagerie.household_members
    set user_id = v_user_id, status = 'active', joined_at = now()
    where id = v_invite.id;

  select * into v_new_tenant from menagerie.tenants where id = v_invite.tenant_id;
  if v_new_tenant.id is null then raise exception 'Unable to resolve the household you were invited to'; end if;
  return v_new_tenant;
end;
$$;
revoke all on function menagerie.switch_to_household(uuid) from public, anon, service_role;
grant execute on function menagerie.switch_to_household(uuid) to authenticated;
