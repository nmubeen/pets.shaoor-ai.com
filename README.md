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
  trial-countdown header, and sign-out — all backed by real data.
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
- **Core records** — `pets`, `pet_groups`, `habitats` tables with RLS,
  Server Actions to add *and edit* them (`lib/actions/roster.ts`), and a
  merged "roster" view (`lib/roster.ts`) powering the dashboard, `/app/pets`,
  and onboarding. A pet record captures breed, sex, birth date, life stage,
  weight, color/markings, microchip ID, spay/neuter status, and notes —
  `/app/pets` shows a computed age from birth date and has a real "Edit"
  affordance on every card. Onboarding stays deliberately quick (name/
  species/life stage only — "add now, fill in details later"); the full
  field set lives on `/app/pets`. Every pet, group, and habitat can also
  carry a display photo (`photo_path`, uploaded straight into the same
  private "media" Storage bucket the gallery uses, under
  `{tenant_id}/avatars/...` — see `lib/storage.ts`, shared with
  `lib/actions/gallery.ts`) — shown wherever its avatar circle appears
  instead of initials; replacing or removing a photo cleans up the old
  Storage object.
- **Health & vets** — `vet_visits`, `illnesses`, `vaccinations`,
  `grooming_visits` tables with RLS, sharing the same polymorphic
  pet/group/habitat scope as the roster tables (§03). `/app/health` has
  four tabs (Visits, Illnesses, Vaccinations, Grooming), each with a real
  log form (`lib/actions/health.ts`, `lib/health.ts`); the dashboard's
  "Recent health events" and "Vaccines due" tiles pull from the same data.
  Visits and grooming pick a provider from the maintained list below
  instead of typing a name each time.
- **Predictive vaccination scheduling & medications** — beyond passive
  record-keeping: an optional `species_group` on `pets` (dog/cat/bird/
  reptile/fish/small_mammal/other — deliberately a scheduling classifier
  only, not a reintroduction of per-species tables per §03) matches a pet
  against a global, non-tenant-scoped `vaccine_protocols` reference table
  (`0014_predictive_scheduling.sql`) seeded with the standard puppy/kitten
  core series (DHPP, Rabies, Bordetella for dogs; FVRCP, Rabies, FeLV for
  cats — dose sequence, age-in-weeks due, and booster interval). Set a
  pet's species group and birth date, and "Suggest schedule" on its roster
  card (`generateVaccinationSchedule`, idempotent — safe to click again)
  creates a concrete, due-dated `vaccinations` row per protocol step
  (`birth_date + age_weeks_due`). Marking a protocol-linked vaccination
  "given" (`markVaccinationGiven`) auto-creates the next occurrence when
  its protocol has a `booster_interval_months` (e.g. the annual DHPP/Rabies
  booster), dated from the actual administered date — a series step with
  no booster interval (e.g. the last Bordetella dose) just completes with
  nothing scheduled after it. A new `medications` table (same polymorphic
  pet/group/habitat scope, optional prescribing provider) tracks ongoing
  courses on their own tab in `/app/health` — "Log dose" advances
  `next_due_date` by the medication's repeat interval (UTC-safe date math
  throughout, same pattern as care tasks), automatically flipping the
  medication to `completed` instead of scheduling past its `end_date`.
  Verified end-to-end against the live Supabase project, including the
  UTC-safe reschedule math and the booster-vs-no-booster branch.
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
  wanted.
- **Shopping & tasks** — `products`, `shopping_orders`, `care_tasks` tables
  with RLS. Unlike health records, an order or task can be scoped to the
  whole workspace, not just a pet/group/habitat (§03's "pet, group, or
  household" scoping) — see `lib/scope.ts`. `/app/shopping` logs an order
  with ordered/delivered dates, quantity + unit, an item URL (for online
  orders), which shop it came from, and an optional item photo — the photo
  belongs to the `product` (reused across every order of that item, not
  re-uploaded each time), same private Storage pattern as roster photos.
  An All/Pet/Group/Habitat/Household filter (`lib/shopping.ts`); the
  dashboard's "Care tasks" card lets you add and complete recurring tasks
  (`lib/actions/tasks.ts`) — completing one that repeats immediately
  schedules the next occurrence. "Spent · 30d" is a computed rollup across
  shopping/vet/grooming costs rather than a separate expenses ledger, so
  nothing gets double-entered.
- **Gallery, comments & adoption profiles** — `media` and `comments`
  tables with RLS, plus a private Supabase Storage bucket (`media`, one
  bucket with `{tenant_id}/...` path prefixes per §06) with its own
  `storage.objects` policies scoped the same way. `/app/gallery` has a
  real upload form (photo + caption + scope) and a per-photo comment
  thread. Rescue & Shelter workspaces can list an individual pet for
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

**Also deferred**: surfacing Menagerie subscriptions in the shared
`shaoor-ai.com/admin/subscriptions` control plane (like `construct.shaoor-ai.com`
already does) — investigated, genuinely a bigger cross-repo task with an open
design question (self-serve trial vs. admin-gated activation), paused to
finish this roadmap first.

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

Live Razorpay and live Zeptomail verification (both blocked on API
credentials, see above) and the shared admin control-plane integration
(`shaoor-ai.com/admin/subscriptions`) — investigated, genuinely a bigger
cross-repo task with an open design question, intentionally paused. Every
product phase from the roadmap (§13, phases 1–6) is otherwise implemented
and verified end-to-end against the live Supabase project.
