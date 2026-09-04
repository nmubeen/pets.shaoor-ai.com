-- Seed every new workspace with the standard online-shop providers
-- (Amazon, Flipkart, Zepto, Blinkit, Supertails, Instamart) at signup,
-- matching the ones already added by hand, rather than starting empty.
--
-- Logos aren't copied — the existing ones live under one specific tenant's
-- Storage folder, and that tenant's own storage.objects RLS policy would
-- correctly refuse to serve them to a different tenant's members. New
-- workspaces start with plain initials and can add a logo per provider
-- from /app/providers themselves.
--
-- Only fires when a brand-new tenant is being created (the existing
-- v_workspace_name is not null branch) — an invited user joining an
-- existing workspace doesn't get a second set seeded into it.

create or replace function menagerie.handle_new_user()
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

    insert into menagerie.subscriptions (tenant_id, status)
    values (v_tenant_id, 'trialing');

    insert into menagerie.service_providers (tenant_id, category, name, website)
    values
      (v_tenant_id, 'online_shop', 'Amazon', 'https://www.amazon.in'),
      (v_tenant_id, 'online_shop', 'Flipkart', 'https://www.flipkart.com/'),
      (v_tenant_id, 'online_shop', 'Zepto', 'https://www.zepto.com/'),
      (v_tenant_id, 'online_shop', 'Blinkit', 'https://blinkit.com/'),
      (v_tenant_id, 'online_shop', 'Supertails', 'https://supertails.com/'),
      (v_tenant_id, 'online_shop', 'Instamart', 'https://instamart.in');
  end if;

  return new;
end;
$$;
