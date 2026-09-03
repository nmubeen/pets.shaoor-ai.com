# Menagerie — pets.shaoor-ai.com

A Next.js (App Router) build of the marketing site and app shell described in
`design-doc.html`. This is the **UI surface only** — every screen from the
design doc's mockup sections is a real, working page, but there is no
Supabase, Stripe, or auth wired up yet. All data on the app-shell pages comes
from `lib/mock-data.ts`.

## What's here

- **Marketing** — `/` (landing) and `/pricing`, matching §09 of the design doc.
- **Signup & onboarding** — `/signup` (create workspace) and
  `/onboarding/pets` (add pets/habitats), matching §10.
- **App shell** — `/app` (home dashboard), `/app/pets`, `/app/health`,
  `/app/shopping`, `/app/gallery`, matching §11, with a sidebar + workspace
  switcher + trial-countdown header.
- **Settings** — `/app/settings/billing` and `/app/settings/team`, matching §12.

Design tokens (colors, type — Fraunces / Public Sans / IBM Plex Mono) are
lifted directly from the design doc's palette in `app/globals.css`, mapped
into a Tailwind v4 `@theme`.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## What's not built yet

Everything in §04–§08 of the design doc — the actual Supabase schema, Row
Level Security policies, Stripe billing wiring, and Supabase Auth — is not
implemented. The forms on `/signup` and `/onboarding/pets` navigate you
through the flow but don't persist anything; "Add pet", "Log a visit",
"Send invite", etc. are UI-only for now. Wiring those up is the natural next
phase, following the roadmap in §13 of the design doc (Foundation → Billing →
Core records → Health & vets → Shopping & tasks → Gallery & org tier).
