# Menagerie — pets.shaoor-ai.com

A Next.js (App Router) build of the marketing site and app shell described in
`design-doc.html`, now wired to a real multi-tenant Supabase backend per
§04, §07, §08 of the design doc — the full roadmap (§13) is built.

## What's here

- **Marketing** — `/` (landing) and `/pricing`, matching §09. Public
  **adoption directory** at `/adopt` and `/adopt/[petId]` (§02, org tier).
- **Auth & onboarding** — `/signup` (create a workspace + account),
  `/login`, `/forgot-password` / `/reset-password`, and `/onboarding/pets`,
  matching §10. Real Supabase Auth (email + password); a database trigger
  creates the tenant, owner membership, and trial subscription row
  atomically at signup.
- **App shell** — `/app`, `/app/pets`, `/app/health`, `/app/shopping`,
  `/app/gallery`, `/app/providers`, with a sidebar workspace switcher,
  trial-countdown header, and sign-out — all backed by real data. Responsive
  down to phone widths: the sidebar becomes a fixed slide-out drawer behind
  a hamburger button below the `md` breakpoint (`components/app-shell/
  AppShell.tsx` holds the shared open/close state; `Sidebar`/`Topbar` stay
  presentational) instead of the fixed 220px column that used to just get
  squeezed on narrow screens; the marketing navbar gets the same treatment.
  Every form's 2-column field grid collapses to 1 column below `sm`, and
  every data table scrolls horizontally within its own card
  (`overflow-x-auto`) instead of overflowing the page. `/app` (the home
  page) dropped its "Your workspace" pet-chip list — a straight repeat of
  `/app/pets` — so it's a real dashboard now: stat tiles, recent health
  events, recent shopping, and care tasks, nothing that duplicates another
  page.
- **Settings** — `/app/settings/billing` (real plan/usage from the DB —
  payment processing intentionally not wired up, see below) and
  `/app/settings/team` (real invites, owner-gated), matching §12.

## Implemented (§04, §07, §08 of the design doc)

- **Foundation** — `menagerie` Postgres schema, `tenants` / `memberships`
  tables, Row Level Security on every tenant-scoped table via
  `menagerie.my_tenant_ids()` / `is_tenant_owner()` / `can_write_tenant()`,
  and a `handle_new_user` trigger that creates the workspace + owner
  membership + trial subscription on signup and reconciles pending invites
  by email. See `supabase/migrations/`.
- **Core records** — `pets` and `habitats` tables with RLS, Server Actions
  to add, edit, *and delete* them (`lib/actions/roster.ts` — delete cascades
  every health/shopping/task/media row scoped to that pet or habitat at the
  DB level, plus best-effort cleanup of its Storage photos; the UI always
  confirms first), and a merged "roster" view (`lib/roster.ts`) powering the
  dashboard, `/app/pets`, and onboarding. **`species` and `breed` were
  renamed and swapped from the original design** (`0022_rename_species_breed.sql`)
  — the old pair (a required free-text `species`, e.g. "Persian Cat", plus a
  separate optional `breed`) described the same thing at two different
  specificities and was confusing; now `species` is the one structured,
  required field (dog/cat/bird/reptile/fish/small_mammal/other — the same
  enum the predictive-scheduling and service-catalog features already
  matched pets against, previously called `species_group`) and `breed` the
  one free-text, required field (e.g. "Labrador") — asked in that order,
  species first, on the roster form. A pet record also captures sex,
  birth date, life stage, weight, color/markings, microchip ID, spay/neuter
  status, and notes — `/app/pets` shows a computed age from birth date and
  has real "Edit" and "Delete" affordances on every card. Onboarding stays
  deliberately quick (species/breed/life stage only — "add now, fill in
  details later"); the full field set lives on `/app/pets`. Every pet and
  habitat can also carry a display photo (`photo_path`, uploaded straight
  into the same private "media" Storage bucket the gallery uses, under
  `{tenant_id}/avatars/...` — see `lib/storage.ts`, shared with
  `lib/actions/gallery.ts`) — shown wherever its avatar circle appears
  instead of initials; replacing or removing a photo cleans up the old
  Storage object.
- **Health & unified visits** — `visits` (renamed from `vet_visits`,
  `0020_unified_visits.sql`), `illnesses`, `vaccinations`, pet-only
  (`pet_id` required, `0017_scope_rework.sql` dropped `habitat_id` —
  habitats don't have "health" in the individual-creature sense this
  module tracks). A real-world visit is very often a mix of things — a
  health check that turns into a grooming session too, a vaccination given
  alongside a checkup — so `/app/health`'s **Visits** tab merged what used
  to be separate Vet-visit and Grooming-visit records into one entry per
  trip (`components/health/VisitForm.tsx`) that can carry any combination
  of:
  - **Services** — a multi-row list (Deworming, Nail Clipping, Grooming,
    Consultation, Ear cleaning, whatever actually happened), each with its
    own optional cost; the visit's total cost is the sum, computed at save
    time rather than entered separately. Typing a service name not seen
    before adds it to a tenant-wide catalog (`care_service_types`,
    `findOrCreateServiceType` — same pattern as shopping's
    `findOrCreateProduct`), tagged to the pet&rsquo;s own species; one with
    a configured **frequency** auto-manages a `care_tasks` reminder
    (completes whatever was already open for that pet+service, schedules
    the next one that many days out) — so "when was the last deworming" is
    just its due-date's reminder, always current. A service can be
    **species-scoped** (`0021_service_type_species.sql`) — Deworming might
    be every 30 days for a dog but 60 for a cat, or something like Wing
    Clipping might not apply to a dog at all — so the same name can exist
    once per species (each with its own frequency and its own independent
    reminder) plus once generically for anything not species-specific
    (Consultation); the suggestion list in the form narrows to the
    selected pet's species plus the generic ones as you pick a pet.
  - **Vaccinations given** — a second multi-row list; each entry matches
    the pet's existing *due* vaccination by name (completing it and
    triggering the same booster-reschedule `markVaccinationGiven` already
    does — refactored into a shared `scheduleBoosterIfDue` helper used by
    both) or, for anything unscheduled, inserts a fresh already-complete
    row. Either way it's linked back to the visit (`vaccinations.visit_id`
    and `.cost`, both new) and its cost rolls into the visit total too.
  - **Illnesses diagnosed** and **Medications prescribed** — two more
    multi-row lists, added alongside the two above (`0025_visit_linked_
    illness_medication_vaccination_clinic.sql` gave `illnesses` and
    `medications` their own nullable `visit_id`, same FK shape as
    vaccinations'). Each row becomes a real `illnesses`/`medications` row
    linked back to the visit, so it shows up on the Illnesses/Medications
    tabs exactly like a directly-logged entry — just with its origin
    remembered.
  
  A visit still has its own reason, provider (vet **or** grooming, picked
  from one combined list), consulting doctor (`vet_name`,
  `0019_vet_visit_doctor.sql` — the facility is fixed, who actually saw
  the pet varies visit to visit), date, weight, and notes. Illnesses and
  Vaccinations (as a due/complete tracking list, not the "given during a
  visit" flow above) keep their own simple single-event tabs for anything
  logged directly rather than as part of a visit — both paths coexist. A
  direct-entry vaccination can also name its own clinic now
  (`vaccinations.provider_id`, same migration as above) via a Clinic
  picker on its own form; a visit-linked one instead shows that visit's
  own provider live (derived, not duplicated onto the vaccination row) —
  see `getVaccinations`' `visitProviderById` lookup. The **Growth** tab
  (`lib/growth.ts`, `components/health/GrowthPanel.tsx`) plots
  `visits.weight_kg` per pet as a hand-rolled SVG line chart (no charting
  dependency for one simple plot) — independent of `pets.weight_kg`, which
  stays a separate, manually-set "current weight" snapshot, never
  auto-synced from visit history.
- **Edit/Delete on every Health and Shopping entry, and a pet filter
  everywhere in Health** — visits, illnesses, vaccinations, medications,
  and shopping orders all gained real Edit and Delete actions
  (`lib/actions/health.ts`, `lib/actions/medications.ts`,
  `lib/actions/shopping.ts`), gated to owner/caregiver
  (`menagerie.can_write_tenant()`'s actual RLS boundary — the buttons
  themselves were previously ungated everywhere on these two pages, so a
  viewer could see and click "Log a visit" and have it silently fail
  against RLS; hiding them now matches what actually works, not just a
  new restriction). A visit's edit now covers every one of its line items
  too (services, vaccinations given, illnesses diagnosed, medications
  prescribed), diffed by id against what's already linked rather than
  blindly deleted-and-reinserted (`updateVisit`, `lib/actions/health.ts`):
  an unchanged row is left alone; a changed row (same id) gets a plain
  field update, never re-running reminder scheduling
  (`upsertServiceReminder`) or due-vaccination matching
  (`recordVaccinationGiven`) a second time; a new row (no id) gets a full
  insert with every side effect a freshly-logged one would get; a row
  removed from the form deletes outright for services (no lifecycle of
  their own) but only **unlinks** (`visit_id = null`) for vaccinations/
  illnesses/medications, so the record survives as a direct entry instead
  of vanishing. That same asymmetry governs Edit and Delete on the
  Illnesses/Vaccinations/Medications tabs themselves: a row with a
  `visit_id` can only be changed by editing its source visit — its own
  Edit button opens that visit instead (scrolled and focused to the exact
  row, `focusRowId` threaded down through `VisitForm`'s `RowList`), and
  Delete is hidden for it (also enforced server-side by
  `deleteIllness`/`deleteVaccination`/`deleteMedication`, which check
  `visit_id` first) — only a direct entry can be edited/deleted in place.
  Medication's Delete is a real removal, distinct from the
  existing Discontinue (a status flip that keeps history). Editing a
  shopping order replaces its `shopping_order_scopes` wholesale (clear +
  re-insert), same pattern the add path already used; deleting one
  cascades its scopes but leaves the shared product (and its photo)
  alone, since another order may still reference it. The pet-narrowing
  filter Growth already had (`components/health/GrowthPanel.tsx`) is now
  a shared `PetFilterSelect` ("All pets" + one option per pet) on Visits,
  Illnesses, Vaccinations, and Medications too, which previously showed
  every pet mixed together with no way to narrow the list. Every date
  shown in any list across the app now includes the year (`fmtDate`
  helpers in `lib/health.ts`, `lib/medications.ts`, `lib/growth.ts`,
  `lib/gallery.ts`, `lib/shopping.ts`, and the billing page) — a
  short-month/day-only date reads ambiguously once a workspace has more
  than a year of history. The Vaccinations tab's table also got three
  small fixes: its second column now reads "Vaccine" (was "Reason",
  which never fit what it actually shows), a new "Clinic" column shows
  where it happened, and cost is no longer appended to the Status column
  (it wasn't a status).
- **Predictive vaccination scheduling, medications & Settings → Care** —
  beyond passive record-keeping: `pets.species` (dog/cat/bird/reptile/fish/
  small_mammal/other — required; see Core records above for the rename
  from `species_group`) matches a pet against `vaccine_protocols`
  (`0014_predictive_scheduling.sql`) seeded with the standard puppy/kitten
  core series (DHPP, Rabies, Bordetella for dogs; FVRCP, Rabies, FeLV for
  cats). **`/app/settings/care`** (`0020_unified_visits.sql` widened
  `vaccine_protocols` with a nullable `tenant_id` — null means the
  built-in defaults, unchanged and still read-only; set means a
  workspace's own custom plan entry) lets a workspace add its own
  vaccination plans (name, purpose, age when due, booster interval) —
  useful for a species with no built-in default, or a vaccine the
  defaults miss — alongside a **service types** editor for the Visits
  form's catalog above (name + optional species + optional reminder
  frequency). "Suggest schedule" on a pet's card (`generateVaccinationSchedule`, idempotent)
  picks up both built-in and custom protocols for its species — one query,
  RLS returns the union, no code-level merge needed. Completing a
  protocol-linked vaccination auto-creates the next occurrence when its
  protocol has a `booster_interval_months`, dated from the actual
  administered date. A `medications` table (same pet-only scope, optional
  prescribing provider) tracks ongoing courses on their own tab — "Log
  dose" advances `next_due_date` by the medication's repeat interval
  (UTC-safe date math throughout), automatically flipping to `completed`
  instead of scheduling past its `end_date`. Verified end-to-end against
  the live Supabase project: cost totaling, the auto-catalog and
  reminder-reschedule behavior, both vaccination-given paths (matched and
  ad hoc), the built-in/custom protocol union, and the RLS policies that
  keep the built-in defaults read-only.
- **Service providers** — `/app/providers`: one unified `service_providers`
  table (`category`: vet, grooming, offline_shop, online_shop) maintained
  once and selected from everywhere else via `ProviderPicker`
  (`components/providers/`) — vet/hospital in Health, grooming center in
  Health, and "bought from" in Shopping. Originally a narrower `vets` table
  used only by vet visits; migration `0009_service_providers.sql` folded it
  in (preserving ids, so existing vet visits kept resolving) rather than
  leaving two parallel concepts. Shown as a card grid — same layout as
  `/app/pets` — with a logo/photo per provider (`logo_path`, same private
  Storage pattern as roster and product photos, added in
  `0010_provider_logo.sql`). Every new workspace starts with the 6 common
  online shops pre-added (Amazon, Flipkart, Zepto, Blinkit, Supertails,
  Instamart) — seeded by the same `handle_new_user` trigger that creates
  the tenant at signup (`0011_seed_online_shops.sql`), so a brand-new
  workspace doesn't start with an empty shop list. Seeded rows have no
  logo (a logo lives in its owning tenant's private Storage folder, so
  copying the file reference alone would point at a file the new tenant's
  RLS correctly can't read) — add one per shop from `/app/providers` if
  wanted. Vet, grooming, and offline-shop providers (anywhere with a
  physical location — the same "not online" split the form already drew
  for phone/address) can also carry GPS coordinates and business hours
  (`0018_provider_location_hours.sql`) — latitude/longitude are entered
  as plain numbers (paste what Google Maps shows when you right-click a
  spot; both-or-neither and valid-range check constraints back this up),
  rendered as a "View on map" link (`lib/providers.ts` derives the
  `https://www.google.com/maps?q=lat,lng` URL) rather than embedding an
  actual map. Business hours is free text (e.g. "Mon–Sat 9am–8pm, Sun
  closed") rather than a structured weekly schedule — simpler, and
  consistent with how every other provider field is just text. Online
  shops get neither field, same reasoning as phone/address: a website
  has no location or opening hours.
- **Shopping** — `products` and `shopping_orders` tables with RLS, plus a
  many-to-many `shopping_order_scopes` join table (`0017_scope_rework.sql`)
  — an order can now name *any combination* of pets and/or habitats (a
  shared bag of litter for two cats, a filter for one tank, both at once),
  not just one thing, or none (still means household-wide, same convention
  as before, just now zero-or-*many* instead of zero-or-one). Picked via a
  checklist (`components/scope/MultiScopePicker.tsx`, shared with Gallery
  below) — no explicit "Household" toggle (removed; selecting nothing is
  already household-wide, so a dedicated checkbox for that was redundant).
  `/app/shopping` logs an order with ordered/delivered dates,
  quantity + unit, an item URL (for online orders), which shop it came
  from, and an optional item photo — the photo belongs to the `product`
  (reused across every order of that item, not re-uploaded each time),
  same private Storage pattern as roster photos. The All/Pet/Habitat/
  Household filter now means "includes at least one of this kind" rather
  than "is only this kind" (`lib/shopping.ts`), since one order can match
  more than one filter. "Spent · 30d" is a computed rollup across
  shopping/vet/grooming costs rather than a separate expenses ledger, so
  nothing gets double-entered. Every currency amount across the app goes
  through one shared `lib/format.ts#formatCurrency` (Indian digit grouping,
  always 2 decimal places — `₹1,234.50`) instead of the five slightly
  different, decimal-dropping inline formatters this used to be.
- **Care tasks** — `care_tasks` table with RLS, exactly one of pet/habitat
  required (`0017_scope_rework.sql` tightened this from "pet, habitat, or
  household" — the vague household catch-all is gone, so every task is
  trackable against one specific thing). Habitat-level recurring tasks
  (tank cleaning, water changes, auto-feeder refills) are just as valid a
  target as a pet — habitats didn't lose anything here, only the
  "household" option did. The dashboard's "Care tasks" card lets you add
  and complete recurring tasks (`lib/actions/tasks.ts`) — completing one
  that repeats immediately schedules the next occurrence, same pet/habitat
  as the original.
- **Gallery, comments & adoption profiles** — `media` and `comments`
  tables with RLS, plus a private Supabase Storage bucket (`media`, one
  bucket with `{tenant_id}/...` path prefixes per §06) with its own
  `storage.objects` policies scoped the same way. Scope went many-to-many
  here too (`media_scopes`, `0023_gallery_multiscope_clicked_date.sql`,
  same shape and `MultiScopePicker` as Shopping) — a photo can tag any
  combination of pets/habitats (a shot of two cats together tags both),
  not just one. Deleting a pet or habitat only removes *its* tag from a
  photo (cascades away on its own) — the photo itself is never deleted by
  that anymore, since it may still be tagged to something else, or was
  always meant to be untagged/household. Every photo also carries a
  `clicked_date` — the date it was actually *taken*, separate from
  `created_at` (when it was uploaded), since backfilling old photos
  shouldn't make them sort as new — `/app/gallery` always sorts newest
  clicked date first, and a "Whose gallery" filter (`GalleryView.tsx`)
  narrows the grid to one pet/habitat (or an "untagged" bucket) at a time.
  `/app/gallery` has a real upload form (photo + caption + clicked date +
  scope) and a per-photo comment thread. Rescue & Shelter workspaces can
  list an individual pet for
  adoption (`is_adoptable`, `adoption_note` on `pets`) — an additive public
  RLS policy makes just that pet (and its tenant's name) readable with no
  auth, surfaced at `/adopt` and `/adopt/[petId]`. Photos themselves stay
  private (no service-role key configured to safely sign public URLs), so
  public profiles are text-only for now.

**Billing (§05) uses Razorpay, not Stripe** — Stripe stopped onboarding new
India-based businesses in 2016, and Razorpay's Subscriptions API supports
UPI Autopay natively alongside cards, which matters for an India-priced
consumer product. `plans`/`subscriptions` carry `razorpay_plan_id_*` /
`razorpay_customer_id`/`razorpay_subscription_id` (migration
`0012_razorpay.sql`, renamed from the original Stripe scaffold's columns).
The flow: `/api/razorpay/subscription` creates a Razorpay Subscription
(there's no Stripe-style hosted redirect — `components/billing/
RazorpayCheckout.tsx` loads Checkout.js client-side and opens it as a
modal); `/api/razorpay/webhook` is the **only** writer of
`menagerie.subscriptions`, verified via the SDK's own
`Razorpay.validateWebhookSignature`, same trust boundary as the original
Stripe design — the client-side checkout callback is never trusted on its
own. Razorpay has no built-in Customer Portal equivalent, so "Cancel plan"
(`lib/actions/billing.ts`) is a small hand-built action calling
`subscriptions.cancel(id, /* cancelAtCycleEnd */ true)` directly — keeps
the plan through the period already paid for, then the webhook's
`subscription.cancelled` event downgrades to Litter once that period ends.
`npm run razorpay:seed-plans` creates the Household/Sanctuary Plans via API
and records their ids. The 14-day trial and its downgrade-to-Litter
(`/api/cron/trial-expiry`) are DB-only and work with no card ever required,
unaffected by any of this.

**Verified without live credentials**: the DB migration, and the webhook's
signature verification (valid/wrong-secret/tampered-body, all behave
correctly). **Not yet verified** — needs real `RAZORPAY_KEY_ID` /
`RAZORPAY_KEY_SECRET` (test mode works immediately after account creation,
before KYC completes) and `SUPABASE_SECRET_KEY`: creating a live Plan/
Subscription, an actual checkout completing, and the webhook actually
writing to the DB end-to-end.

**Cross-repo control-plane sync** (`lib/control-sync.ts`): Pets shares the
same physical Postgres database as shaoor-ai.com and construct.shaoor-ai.com
(this Supabase project's `menagerie` schema sits alongside their
`control`/`construct`/`chat` schemas) — confirmed live this session, after
this integration was first built on the mistaken assumption Pets was a
separate project. Since Pets only ever talks to Postgres via
supabase-js/PostgREST (scoped to `menagerie`), it can't call a `control`
schema function directly — `syncSubscriptionToControlPlane()` instead
calls a thin `menagerie.sync_control_subscription(...)` wrapper RPC
(`supabase/migrations/0024_control_sync_wrapper.sql`, `security definer`,
callable via `supabase.rpc(...)`) that internally invokes
`control.sync_shaoor_pets_subscription` — no HTTP, no env vars, no
separate credential. Called on every subscription-relevant event: new
workspace signup (`/onboarding/pets`), Razorpay webhook events, trial
expiry (`/api/cron/trial-expiry`), and owner-initiated cancellation
(`lib/actions/billing.ts`) — best-effort and non-blocking, a sync failure
never blocks the underlying action, it just logs. shaoor-ai.com's
`/admin/subscriptions` resolves tenant names via a plain SQL join into
`menagerie.tenants` (no read-side HTTP endpoint needed either).

Access is gated live on every request (`lib/access/pets-commercial-access.ts`,
wired into `requireActiveMembership()`) instead of the old no-check-at-all
behavior — `litter` (free) is always allowed; trialing/active/past-due
subscriptions are allowed; a cancelled-but-still-in-period subscription is
allowed; everything else redirects to `/app/pending`. Plan limits
(`menagerie.plans.pet_limit`/`seat_limit`, previously displayed but never
enforced) are now actually checked before adding a pet or inviting a team
member (`lib/entitlements.ts`). Admin lifecycle actions from
shaoor-ai.com's `/admin/subscriptions` write through to
`menagerie.tenants`/`menagerie.subscriptions` directly (cross-schema SQL
from that app's own Prisma connection), not just the `control.*` mirror,
so they actually take effect here. See shaoor-ai.com's own README for the
dashboard side, and construct.shaoor-ai.com's for the same architecture
now shared there too. Verified end-to-end against the live database this
session (real signups/reconciliation, gating boundary cases, admin
write-through) — see git history for the verification scripts used (all
deleted after, per this repo's normal discipline).

### Transactional email — Zeptomail

`pets.shaoor-ai.com` is verified as its own domain in Zeptomail (isolated
sending reputation from any other shaoor-ai.com product using the same
Zeptomail account). Two separate things use it:

- **Our own emails** (`lib/email.ts`, `lib/email-templates.ts`) — team
  invites (`lib/actions/team.ts`'s `inviteMember` now actually notifies the
  invitee, which it never did before) and the two cron digests the design
  doc's §06 "Jobs" section promised but nothing sent until now:
  `/api/cron/reminders` (nightly vaccination/care-task digest) and
  `/api/cron/expense-summary` (weekly spend rollup), both added to
  `vercel.json`. `sendEmail()` soft-fails (logs and returns an error
  instead of throwing) when `ZEPTOMAIL_API_TOKEN` isn't set, so none of
  this blocks the action/cron it's attached to — verified live: an invite
  still writes its `memberships` row correctly with no token configured.
- **Supabase Auth's own emails** (confirmation, password reset) go through
  Supabase's *SMTP* relay instead — a separate credential set (Zeptomail's
  SMTP host/user/pass, not the API token) entered directly in
  Authentication → Settings → SMTP Settings in the Supabase dashboard, a
  step outside what I can reach via API.
- `/forgot-password` + `/reset-password` are new — a real "forgot
  password" flow didn't exist before.

**Not yet verified**: needs `ZEPTOMAIL_API_TOKEN` (for our own emails) and
the SMTP credentials entered in the Supabase dashboard (for Auth's), plus
`SUPABASE_SECRET_KEY` for the two new cron routes' admin client — same
already-known gap the Razorpay webhook has. Once `Confirm email` is
re-enabled with real SMTP behind it, real signups start requiring email
confirmation again (currently off for local-dev convenience per an earlier
step).

Vercel Cron note: this project now has 3 cron entries
(`trial-expiry`/`reminders`/`expense-summary`). Vercel's Hobby (free) tier
has historically limited both cron frequency (daily minimum) and the
*number* of cron jobs per project — worth checking your plan's current
limits before deploying in case one needs consolidating or a Pro upgrade.

## Local setup

```bash
npm install
```

Copy `.env.local.example` to `.env` (or `.env.local`) and fill in your
Supabase credentials, then:

```bash
npm run db:migrate   # applies supabase/migrations/*.sql
npm run dev
```

**One manual dashboard step is required before the app can reach the
database**: in Supabase, go to **Project Settings → Data API → Exposed
schemas** and add `menagerie` alongside `public`. The migration creates the
schema and tables, but PostgREST won't serve a schema it isn't told to
expose.

For local testing without email deliverability issues, turn off
**Authentication → Sign In / Providers → Email → Confirm email** — Supabase's
default shared email sender is rate-limited and not meant for real use.
Zeptomail (see below) is the real provider for both Supabase Auth's SMTP
relay and the app's own emails; re-enable `Confirm email` once its SMTP
credentials are in place.

## What's not built yet

Live Razorpay and live Zeptomail verification (both blocked on real API
credentials — see above). The shaoor-ai.com control-plane sync, live
access gating and entitlement enforcement are all built and verified
end-to-end against the live database (see above). Every product phase
from the roadmap (§13, phases 1–6) is otherwise implemented and verified
end-to-end against the live Supabase project.
