-- Gallery gets the same many-to-many "who" as shopping_orders
-- (0017_scope_rework.sql's shopping_order_scopes) — a photo can tag any
-- combination of pets and/or habitats, not just one, and the explicit
-- "household" option is gone from both (an order/photo with zero scope
-- rows is still valid and still reads as household-wide — it just no
-- longer has a dedicated checkbox calling that out).
--
-- Also adds clicked_date: the date the photo was actually taken, distinct
-- from created_at (when it was uploaded) — a photo uploaded well after the
-- fact shouldn't sort as if it were new. Defaults to today (uploaded ==
-- taken is the common case) but is editable, same as visit_date/order_date
-- elsewhere.
--
-- Checked against the live project before writing this: 0 media rows
-- exist yet, so no data migration is needed.

create table menagerie.media_scopes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  media_id uuid not null references menagerie.media (id) on delete cascade,
  pet_id uuid references menagerie.pets (id) on delete cascade,
  habitat_id uuid references menagerie.habitats (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint media_scopes_one_target check (
    (pet_id is not null)::int + (habitat_id is not null)::int = 1
  )
);

create unique index media_scopes_pet_uidx on menagerie.media_scopes (media_id, pet_id) where pet_id is not null;
create unique index media_scopes_habitat_uidx on menagerie.media_scopes (media_id, habitat_id) where habitat_id is not null;
create index media_scopes_tenant_id_idx on menagerie.media_scopes (tenant_id);
create index media_scopes_media_id_idx on menagerie.media_scopes (media_id);

alter table menagerie.media_scopes enable row level security;

create policy "tenant isolation - select" on menagerie.media_scopes for select using (tenant_id in (select menagerie.my_tenant_ids()));
create policy "tenant isolation - insert" on menagerie.media_scopes for insert with check (menagerie.can_write_tenant(tenant_id));
create policy "tenant isolation - update" on menagerie.media_scopes for update using (menagerie.can_write_tenant(tenant_id)) with check (menagerie.can_write_tenant(tenant_id));
create policy "tenant isolation - delete" on menagerie.media_scopes for delete using (menagerie.can_write_tenant(tenant_id));

grant select, insert, update, delete on menagerie.media_scopes to authenticated;

alter table menagerie.media drop constraint media_at_most_one_scope;
alter table menagerie.media drop column pet_id;
alter table menagerie.media drop column habitat_id;

alter table menagerie.media add column clicked_date date not null default current_date;
