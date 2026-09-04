-- Part of the auth/subscription architecture unification (see
-- shaoor-ai.com's 20260905100000_construct_sync_and_pets_direct_integration
-- migration for the other half of this change, and the approved plan for
-- full context).
--
-- This app talks to Postgres exclusively via supabase-js/PostgREST,
-- scoped to the exposed `menagerie` schema — it has no way to directly
-- call control.sync_shaoor_pets_subscription(), which lives in the
-- `control` schema of this SAME physical database (shaoor-ai.com and
-- construct.shaoor-ai.com's own schemas live here too — confirmed this
-- session; the HTTP bridge lib/control-sync.ts used to call
-- pets.shaoor-ai.com -> shaoor-ai.com over HTTP was built on the mistaken
-- belief this was a separate database).
--
-- Rather than adding a whole new raw-Postgres connection/credential to
-- this app just to reach one function, this adds a thin passthrough
-- wrapper *inside* menagerie schema — Postgres itself has no cross-schema
-- restriction inside a function body (only PostgREST's HTTP surface is
-- schema-scoped), so `security definer` here is enough for this wrapper,
-- owned by the migration role, to call into `control` regardless of the
-- caller's own grants. Called via supabase.rpc('sync_control_subscription',
-- ...) from the service-role admin client, same pattern as the existing
-- accept_pending_invites() RPC.
create function menagerie.sync_control_subscription(
  p_tenant_id uuid, p_tenant_name text, p_owner_subject uuid, p_owner_email text,
  p_plan_code text, p_status text, p_trial_ends_at timestamptz,
  p_current_period_start timestamptz, p_current_period_end timestamptz,
  p_reason text, p_correlation_id text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  return control.sync_shaoor_pets_subscription(
    p_tenant_id, p_tenant_name, p_owner_subject, p_owner_email,
    p_plan_code, p_status, p_trial_ends_at,
    p_current_period_start, p_current_period_end,
    p_reason, p_correlation_id
  );
end;
$$;

-- Only server-side code using the service-role client should call this
-- (it's a billing/control-plane write, not something a signed-in user
-- should trigger directly) — mirrors how control.sync_shaoor_pets_subscription
-- itself is locked to service_role only.
revoke all on function menagerie.sync_control_subscription(uuid,text,uuid,text,text,text,timestamptz,timestamptz,timestamptz,text,text) from public, anon, authenticated;
grant execute on function menagerie.sync_control_subscription(uuid,text,uuid,text,text,text,timestamptz,timestamptz,timestamptz,text,text) to service_role;
