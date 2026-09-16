import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

// Disposable local PostgreSQL only: creates Supabase API stubs and applies every migration.
// Usage: PETS_TEST_DATABASE_URL=postgresql://.../pets_single_user_test node scripts/test-single-user-migration.mjs
const url = new URL(process.env.PETS_TEST_DATABASE_URL ?? "");
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
assert.equal(url.pathname, "/pets_single_user_test");
const db = new Client({ connectionString: url.href });
const owner = randomUUID(), member = randomUUID(), tenant = randomUUID();
await db.connect();
try {
  assert.equal((await db.query("select to_regnamespace('menagerie') as n")).rows[0].n, null, "Use an empty disposable database");
  await db.query(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', last_sign_in_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.email() returns text language sql stable as $$ select current_setting('request.jwt.claim.email', true) $$;
    grant usage on schema auth to anon, authenticated;
    create table public.app_memberships (user_id uuid, app_key text, status text);
    create table storage.buckets (id text primary key, name text, public boolean);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;
    grant select, insert, delete on storage.objects to authenticated;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1, '/') $$;
  `);
  const dir = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()) {
    if (file.startsWith('0033')) {
      await db.query("insert into auth.users (id,email) values ($1,'owner@example.invalid'),($2,'member@example.invalid')", [owner,member]);
      await db.query("insert into public.app_memberships values ($1,'pets','active'),($2,'pets','active')", [owner,member]);
      await db.query("insert into menagerie.tenants (id,name,plan_code) values ($1,'Legacy pets','household')", [tenant]);
      await db.query("insert into menagerie.memberships (tenant_id,user_id,invited_email,role,status) values ($1,$2,'owner@example.invalid','owner','active'),($1,$3,'member@example.invalid','caregiver','active')", [tenant,owner,member]);
      await db.query("insert into menagerie.subscriptions (tenant_id,status,razorpay_subscription_id) values ($1,'active','preserve-me')",[tenant]);
      await db.query("insert into storage.objects (bucket_id,name) values ('media',$1)",[`${tenant}/photo.jpg`]);
    }
    await db.query('begin');
    try { await db.query(await readFile(new URL(file,dir),'utf8')); await db.query('commit'); }
    catch (error) { await db.query('rollback'); throw new Error(`${file}: ${error.message}`); }
  }
  assert.equal((await db.query('select owner_user_id from menagerie.tenants where id=$1',[tenant])).rows[0].owner_user_id,owner);
  assert.equal((await db.query('select razorpay_subscription_id from menagerie.subscriptions where tenant_id=$1',[tenant])).rows[0].razorpay_subscription_id,'preserve-me');
  assert.equal((await db.query("select to_regclass('menagerie.memberships') as t")).rows[0].t,null);
  assert.equal((await db.query("select to_regprocedure('menagerie.accept_pending_invites()') as f")).rows[0].f,null);
  await db.query('begin');
  await db.query("select set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claim.email','member@example.invalid',true)",[member]);
  await db.query('set local role authenticated');
  assert.equal((await db.query('select * from menagerie.tenants where id=$1',[tenant])).rowCount,0);
  assert.equal((await db.query('select * from storage.objects')).rowCount,0);
  const personal=(await db.query('select * from menagerie.ensure_my_account()')).rows[0];
  assert.notEqual(personal.id,tenant);
  assert.equal(personal.owner_user_id,member);
  await db.query('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claim.email','owner@example.invalid',true)",[owner]);
  await db.query('set local role authenticated');
  assert.equal((await db.query('select * from menagerie.ensure_my_account()')).rows[0].id,tenant);
  assert.equal((await db.query('select * from storage.objects')).rowCount,1);
  await db.query('rollback');
  console.log('PASS: all migrations, legacy owner preservation, former-member isolation, private Storage, personal provisioning.');
} finally { await db.end(); }
process.env.DIRECT_URL=url.href;
await import('./test-pets-provisioning.mjs');
