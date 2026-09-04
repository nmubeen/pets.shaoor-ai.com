-- Phase 2: Billing — subscriptions is the source of truth for what a
-- tenant is actually paying for. Only the Stripe webhook (via the service
-- role / admin client) ever writes to it — see design doc §05, §08.

create type menagerie.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');

create table menagerie.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references menagerie.tenants (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status menagerie.subscription_status not null default 'trialing',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create index subscriptions_stripe_customer_id_idx on menagerie.subscriptions (stripe_customer_id);
create index subscriptions_stripe_subscription_id_idx on menagerie.subscriptions (stripe_subscription_id);

alter table menagerie.subscriptions enable row level security;
create policy "subscriptions - members can read" on menagerie.subscriptions for select
  using (tenant_id in (select menagerie.my_tenant_ids()));
-- Deliberately no insert/update/delete policy for anon/authenticated: the
-- app never writes plan state from the client, only Stripe (via the
-- service-role admin client, which bypasses RLS) does.

grant select on menagerie.subscriptions to authenticated;

-- Re-define handle_new_user so a fresh tenant also gets its trialing
-- subscriptions row at signup time (menagerie.subscriptions didn't exist
-- yet when 0001_foundation.sql first created this function).
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
  end if;

  return new;
end;
$$;
