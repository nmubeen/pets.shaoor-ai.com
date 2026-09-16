# Shaoor-AI Pets ? pets.shaoor-ai.com

A single-user pet-care product built with Next.js and Supabase. Track pets,
habitats, health, care schedules, shopping and photos. Vet View and printable
Pet Passports provide health summaries; public adoption profiles remain available.

## Authentication and accounts

`/login`, `/signup` and `/auth/sign-in` use email codes only. Password sign-in,
password signup and password recovery pages have been removed. Shared Shaoor
Auth identity and active `pets` app enrollment remain required; that enrollment
is independent of the product subscription and does not grant team access.

Each user owns one personal account (`menagerie.tenants.owner_user_id`). There
are no invitations, team roles, workspace switching or seat limits. Private
record and Storage policies allow only the account owner. Billing remains
available when a subscription is paused. Reminder and expense emails go to the
owner's current Auth email. The shared control-plane subscription mirror remains.

## Single-user migration

Apply `0033_single_user_accounts.sql` before deploying this app version. It:

- Backfills ownership from active legacy owners, preserving records and subscriptions.
- Stops with an error on conflicting owners or multiple accounts owned by one user;
  resolve those accounts explicitly before retrying. Accounts without an owner
  remain inaccessible until ownership is resolved by an administrator.
- Removes invitation RPCs and archives membership records and enums in the private
  `menagerie_archive` schema. Do not expose that schema through the Data API.
- Replaces team-based record and Storage authorization with account ownership.
  Former members get their own account on their next sign-in.
- Removes the obsolete seat-limit column. Historical migrations remain unchanged.

Coordinate the separate shaoor-ai.com/admin update with this deployment: admin
queries must use account ownership instead of `menagerie.memberships` or seat limits.
This repo does not modify shared Auth settings or the admin application.

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

If the dashboard includes `menagerie` but the API reports `PGRST106`, check
the `authenticator` role's `pgrst.db_schemas` override as well. It can still
contain an older list. Preserve existing entries when adding a schema and
notify PostgREST to reload both configuration and schema. During the OTP
rollout, `menagerie` was appended to this existing override after approval;
the shared Auth email hook and redirect allowlist were left unchanged.

Auth is shared with the other Shaoor apps. Keep the existing shared Auth
settings and Send Email Hook. Set `NEXT_PUBLIC_SITE_URL` to
`https://pets.shaoor-ai.com` in production, and match the shared OTP length
with `NEXT_PUBLIC_SUPABASE_OTP_LENGTH` (default 6). Localhost OTP requests
also use `https://pets.shaoor-ai.com/auth/sign-in` for email branding. This
exact path is accepted by the shared Auth redirect allowlist; `/login`
falls back to Launcher and must not be used as `emailRedirectTo`.

`node scripts/test-pets-provisioning.mjs` checks database membership gates,
idempotency, subscription preservation, ownership protection, and account isolation
inside a rolled-back transaction. It uses `DIRECT_URL`.

For a real email integration check, build and start locally on port 3005,
then run `node scripts/test-pets-otp.mjs <authorized-email>`. The harness
sends two real OTP emails, accepts the received codes, verifies the local
server actions and session cookies, and compares household/subscription
state between sign-ins. Confirm email branding in the inbox separately.
This creates real account data when needed; it never deletes test accounts.

For a disposable local PostgreSQL regression run, create an empty database named
`pets_single_user_test`, set `PETS_TEST_DATABASE_URL` to its localhost connection
URL, and run `node scripts/test-single-user-migration.mjs`. This creates local
Supabase stubs, applies all migrations, and checks legacy ownership, former-member
isolation, private Storage, and account provisioning. Use a fresh cluster because
the harness also creates the Supabase database roles.
