# Menagerie — pets.shaoor-ai.com

A Next.js (App Router) build of the marketing site and app shell described in
`design-doc.html`, now wired to a real multi-tenant Supabase backend per
§04–§08 of the design doc.

## What's here

- **Marketing** — `/` (landing) and `/pricing`, matching §09.
- **Auth & onboarding** — `/signup` (create a workspace + account),
  `/login`, and `/onboarding/pets`, matching §10. Real Supabase Auth
  (email + password); a database trigger creates the tenant, owner
  membership, and trial subscription row atomically at signup.
- **App shell** — `/app`, `/app/pets`, `/app/health`, with a sidebar
  workspace switcher, trial-countdown header, and sign-out — all backed by
  real tenant/roster/health data. `/app/shopping` and `/app/gallery` still
  render sample data from `lib/mock-data.ts` (Phases 5–6, not yet built).
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

**Billing (§05) is scaffolded but intentionally disconnected**: `plans`
(seeded) and `subscriptions` tables exist, and the Stripe Checkout/Portal/
webhook routes (`app/api/stripe/*`, `lib/stripe.ts`) are written and build
cleanly, but the billing page doesn't call them — no payment processing is
live. The 14-day trial and its downgrade-to-Litter (`/api/cron/trial-expiry`)
are DB-only and work with no card ever required.

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

Phases 5–6 of the roadmap (§13): shopping orders/care tasks/expense
reporting, and gallery media/comments/public adoption profiles.
`/app/shopping` and `/app/gallery` still render the original sample data
from `lib/mock-data.ts`. Payment processing (Stripe) is scaffolded but not
wired up — see above.
