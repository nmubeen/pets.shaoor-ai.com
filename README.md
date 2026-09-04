# Menagerie — pets.shaoor-ai.com

A Next.js (App Router) build of the marketing site and app shell described in
`design-doc.html`, now wired to a real multi-tenant Supabase backend per
§04, §07, §08 of the design doc — the full roadmap (§13) is built.

## What's here

- **Marketing** — `/` (landing) and `/pricing`, matching §09. Public
  **adoption directory** at `/adopt` and `/adopt/[petId]` (§02, org tier).
- **Auth & onboarding** — `/signup` (create a workspace + account),
  `/login`, and `/onboarding/pets`, matching §10. Real Supabase Auth
  (email + password); a database trigger creates the tenant, owner
  membership, and trial subscription row atomically at signup.
- **App shell** — `/app`, `/app/pets`, `/app/health`, `/app/shopping`,
  `/app/gallery`, with a sidebar workspace switcher, trial-countdown
  header, and sign-out — all backed by real data.
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
  Server Actions to create them (`lib/actions/roster.ts`), and a merged
  "roster" view (`lib/roster.ts`) powering the dashboard, `/app/pets`, and
  onboarding.
- **Health & vets** — `vets`, `vet_visits`, `illnesses`, `vaccinations`,
  `grooming_visits` tables with RLS, sharing the same polymorphic
  pet/group/habitat scope as the roster tables (§03). `/app/health` has
  four tabs (Visits, Illnesses, Vaccinations, Grooming), each with a real
  log form (`lib/actions/health.ts`, `lib/health.ts`); the dashboard's
  "Recent health events" and "Vaccines due" tiles pull from the same data.
- **Shopping & tasks** — `products`, `shopping_orders`, `care_tasks` tables
  with RLS. Unlike health records, an order or task can be scoped to the
  whole workspace, not just a pet/group/habitat (§03's "pet, group, or
  household" scoping) — see `lib/scope.ts`. `/app/shopping` has a real
  log-order form and an All/Pet/Group/Habitat/Household filter
  (`lib/shopping.ts`); the dashboard's "Care tasks" card lets you add and
  complete recurring tasks (`lib/actions/tasks.ts`) — completing one that
  repeats immediately schedules the next occurrence. "Spent · 30d" is a
  computed rollup across shopping/vet/grooming costs rather than a separate
  expenses ledger, so nothing gets double-entered.
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

**Billing (§05) is scaffolded but intentionally disconnected**: `plans`
(seeded) and `subscriptions` tables exist, and the Stripe Checkout/Portal/
webhook routes (`app/api/stripe/*`, `lib/stripe.ts`) are written and build
cleanly, but the billing page doesn't call them — no payment processing is
live. The 14-day trial and its downgrade-to-Litter (`/api/cron/trial-expiry`)
are DB-only and work with no card ever required.

**Also deferred**: surfacing Menagerie subscriptions in the shared
`shaoor-ai.com/admin/subscriptions` control plane (like `construct.shaoor-ai.com`
already does) — investigated, genuinely a bigger cross-repo task with an open
design question (self-serve trial vs. admin-gated activation), paused to
finish this roadmap first.

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
default shared email sender is rate-limited and not meant for real use; a
proper SMTP provider (Resend/Postmark/SendGrid) belongs under Authentication
→ Settings → SMTP Settings before going live.

## What's not built yet

Payment processing (Stripe) and the shared admin control-plane integration —
both scaffolded/investigated but intentionally paused, see above. Every
product phase from the roadmap (§13, phases 1–6) is otherwise implemented
and verified end-to-end against the live Supabase project.
