-- The pet owner's no-login share link (app/v/[token]/page.tsx) for handing
-- a vet the read-only Vet View — a WhatsApp number is typed in, a token is
-- generated, and a wa.me link opens with it prefilled. Unlike a parent
-- link (one parent, one link), a household can have several of these live
-- at once — one per vet, or a fresh one per visit — so there's no
-- "one active link" uniqueness constraint here, just an owner-controlled
-- revoke on whichever row they no longer want serving traffic.
--
-- No grant to anon: the public page reads this table via the service-role
-- admin client (lib/supabase/admin.ts), same pattern as the Razorpay
-- webhook — token possession is the authorization boundary for that page,
-- not RLS/a Supabase session.

create table menagerie.vet_share_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  whatsapp_number text not null,
  token text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_viewed_at timestamptz
);

create index vet_share_links_tenant_id_idx on menagerie.vet_share_links (tenant_id);
create index vet_share_links_token_idx on menagerie.vet_share_links (token);

alter table menagerie.vet_share_links enable row level security;
create policy "tenant isolation - select" on menagerie.vet_share_links for select
  using (tenant_id in (select menagerie.my_tenant_ids()));
create policy "tenant isolation - insert" on menagerie.vet_share_links for insert
  with check (menagerie.can_write_tenant(tenant_id));
create policy "tenant isolation - update" on menagerie.vet_share_links for update
  using (menagerie.can_write_tenant(tenant_id)) with check (menagerie.can_write_tenant(tenant_id));

-- No delete grant — revoke (setting revoked_at) keeps the audit trail of
-- what was ever shared, same as elsewhere links get revoked instead of removed.
grant select, insert, update on menagerie.vet_share_links to authenticated;
