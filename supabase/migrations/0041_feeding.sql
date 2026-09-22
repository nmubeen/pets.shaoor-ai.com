-- Feeding schedules + a daily feeding log. A schedule row is a recurring
-- meal slot for one pet (e.g. "Breakfast, 8am, 2 scoops dry") — pet-only,
-- same reasoning as medications/vaccinations (0017_scope_rework.sql):
-- feeding is a per-animal concern, not something a habitat has.
--
-- Logging is a separate table, not a boolean/timestamp on the schedule
-- row itself, because a schedule repeats forever but a log entry is one
-- day's instance of it — modeled the same way medications separates
-- "the prescription" (medications) from "each dose" (medications.next_due_date
-- reschedule) rather than folding history into the recurring row.
--
-- given_at is a plain `time`, not `timestamptz` — this app has no stored
-- per-tenant timezone (every due-date elsewhere is date-only, compared in
-- UTC by the cron jobs), so there's nothing to correctly convert a wall-
-- clock feeding time against. Storing the wall-clock time the owner typed
-- or that their browser reported avoids a false-precision timezone
-- conversion that this codebase has no infrastructure to get right.
create table menagerie.feeding_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  pet_id uuid not null references menagerie.pets (id) on delete cascade,
  meal_name text not null,
  scheduled_time time not null,
  portion text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index feeding_schedules_tenant_id_idx on menagerie.feeding_schedules (tenant_id);
create index feeding_schedules_pet_id_idx on menagerie.feeding_schedules (pet_id);

-- One row per (schedule, day) it was logged — the unique constraint is
-- what makes "mark fed" an upsert: clicking it again the same day edits
-- that day's time instead of creating a duplicate entry.
create table menagerie.feeding_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references menagerie.tenants (id) on delete cascade,
  schedule_id uuid not null references menagerie.feeding_schedules (id) on delete cascade,
  log_date date not null default current_date,
  given_at time not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint feeding_logs_one_per_schedule_per_day unique (schedule_id, log_date)
);

create index feeding_logs_tenant_id_idx on menagerie.feeding_logs (tenant_id);
create index feeding_logs_log_date_idx on menagerie.feeding_logs (log_date);

alter table menagerie.feeding_schedules enable row level security;
alter table menagerie.feeding_logs enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['feeding_schedules', 'feeding_logs'] loop
    execute format(
      'create policy "tenant isolation - select" on menagerie.%I for select using (tenant_id in (select menagerie.my_tenant_ids()))',
      t
    );
    execute format(
      'create policy "tenant isolation - insert" on menagerie.%I for insert with check (menagerie.can_write_tenant(tenant_id))',
      t
    );
    execute format(
      'create policy "tenant isolation - update" on menagerie.%I for update using (menagerie.can_write_tenant(tenant_id)) with check (menagerie.can_write_tenant(tenant_id))',
      t
    );
    execute format(
      'create policy "tenant isolation - delete" on menagerie.%I for delete using (menagerie.can_write_tenant(tenant_id))',
      t
    );
  end loop;
end $$;

grant select, insert, update, delete on menagerie.feeding_schedules to authenticated;
grant select, insert, update, delete on menagerie.feeding_logs to authenticated;
