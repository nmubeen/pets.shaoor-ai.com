# Menagerie — pets.shaoor-ai.com

A Next.js (App Router) build of the marketing site and app shell described in
`design-doc.html`, now wired to a real multi-tenant Supabase backend and
Stripe billing per §04–§08 of the design doc.

## What's here

- **Marketing** — `/` (landing) and `/pricing`, matching §09.
- **Auth & onboarding** — `/signup` (create a workspace + account),
  `/login`, and `/onboarding/pets`, matching §10. Real Supabase Auth
  (email + password); a database trigger creates the tenant, owner
  membership, and trial subscription row atomically at signup.
- **App shell** — `/app`, `/app/pets`, with a sidebar workspace switcher,
  trial-countdown header, and sign-out — all backed by real tenant/roster
  data. `/app/health`, `/app/shopping`, `/app/gallery` still render sample
  data from `lib/mock-data.ts` (Phases 4–6, not yet built).
- **Settings** — `/app/settings/billing` (real plan/usage + Stripe
  Checkout/Portal) and `/app/settings/team` (real invites, owner-gated),
  matching §12.

## Implemented (§04–§08 of the design doc)

- **Foundation** — `menagerie` Postgres schema, `tenants` / `memberships`
  tables, Row Level Security on every tenant-scoped table via
  `menagerie.my_tenant_ids()` / `is_tenant_owner()` / `can_write_tenant()`,
  and a `handle_new_user` trigger that creates the workspace + owner
  membership + trial subscription on signup and reconciles pending invites
  by email. See `supabase/migrations/`.
- **Billing** — `plans` (seeded) and `subscriptions` tables, Stripe
  Checkout (`/api/stripe/checkout`) and Customer Portal
  (`/api/stripe/portal`) routes, a webhook (`/api/stripe/webhook`) that is
  the only writer of `subscriptions`, and a trial-expiry cron
  (`/api/cron/trial-expiry`, scheduled in `vercel.json`).
- **Core records** — `pets`, `pet_groups`, `habitats` tables with RLS,
  Server Actions to create them (`lib/actions/roster.ts`), and a merged
  "roster" view (`lib/roster.ts`) powering the dashboard, `/app/pets`, and
  onboarding.

## Local setup

```bash
npm install
```

Copy `.env.local.example` to `.env` (or `.env.local`) and fill in your
Supabase and Stripe credentials, then:

```bash
npm run db:migrate          # applies supabase/migrations/*.sql
npm run stripe:seed-plans   # creates Household/Sanctuary Stripe products+prices
npm run dev
```

**One manual dashboard step is required before the app can reach the
database**: in Supabase, go to **Project Settings → Data API → Exposed
schemas** and add `menagerie` alongside `public`. The migration creates the
schema and tables, but PostgREST won't serve a schema it isn't told to
expose.

For the Stripe webhook locally, run `stripe listen --forward-to
localhost:3000/api/stripe/webhook` and put the signing secret it prints
into `STRIPE_WEBHOOK_SECRET`.

## What's not built yet

Phases 4–6 of the roadmap (§13): vet visits/illnesses/vaccinations/grooming,
shopping orders/care tasks/expense reporting, and gallery media/comments/
public adoption profiles. `/app/health`, `/app/shopping`, and `/app/gallery`
still render the original sample data from `lib/mock-data.ts`.
