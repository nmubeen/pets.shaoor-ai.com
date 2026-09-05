-- /app/settings/team wants to show each member's last sign-in time.
-- auth.users isn't exposed to PostgREST (and RLS on menagerie tables has
-- no way to read another schema's data anyway), so this is a thin
-- SECURITY DEFINER wrapper — same pattern as accept_pending_invites() —
-- that looks up last_sign_in_at for every member of a tenant the caller
-- actually belongs to, and nothing else.
create function menagerie.team_last_logins(p_tenant_id uuid)
returns table (user_id uuid, last_sign_in_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select u.id, u.last_sign_in_at
  from auth.users u
  join menagerie.memberships m on m.user_id = u.id
  where m.tenant_id = p_tenant_id
    and exists (
      select 1 from menagerie.memberships my
      where my.tenant_id = p_tenant_id and my.user_id = auth.uid() and my.status = 'active'
    )
$$;

grant execute on function menagerie.team_last_logins(uuid) to authenticated;
