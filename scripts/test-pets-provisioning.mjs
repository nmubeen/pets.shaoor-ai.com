// Integration checks against DIRECT_URL. All fixtures and changes roll back.
// Never scans, changes or deletes historical business data.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
if (!process.env.DIRECT_URL) process.loadEnvFile(".env");
const client = new Client({ connectionString: process.env.DIRECT_URL });
const uid = randomUUID();
const otherUid = randomUUID();
const email = `pets-test-${uid}@example.invalid`;
const otherEmail = `pets-test-${otherUid}@example.invalid`;
const query = (sql, args) => client.query(sql, args);
async function rejected(sql, message) {
  await query("savepoint negative_test");
  let error;
  try { await query(sql); } catch (cause) { error = cause; }
  await query("rollback to savepoint negative_test");
  assert.match(error?.message ?? "", message);
}
async function identity(id, address) {
  await query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: id, email: address, role: "authenticated" })]);
  await query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.email', $2, true)", [id, address]);
}
try {
  await client.connect();
  await query("begin");
  await query("insert into auth.users (id,email) values ($1,$2),($3,$4)", [uid, email, otherUid, otherEmail]);
  await identity(uid, email);
  await query("set local role authenticated");
  await rejected("select menagerie.ensure_my_account()", /Active Pets membership required/);
  await rejected(`select menagerie.ensure_account('${uid}', '${email}', null)`, /permission denied/);
  await query("reset role");
  await query("insert into public.app_memberships (user_id,app_key,status) values ($1,'pets','inactive')", [uid]);
  await query("set local role authenticated");
  await rejected("select menagerie.ensure_my_account()", /Active Pets membership required/);
  await query("reset role");
  await query("update public.app_memberships set status='suspended' where user_id=$1 and app_key='pets'", [uid]);
  await query("set local role authenticated");
  await rejected("select menagerie.ensure_my_account()", /Active Pets membership required/);
  await query("reset role");
  await query("update public.app_memberships set status='active' where user_id=$1 and app_key='pets'", [uid]);
  await query("set local role authenticated");
  const first = (await query("select * from menagerie.ensure_my_account()")).rows[0];
  const second = (await query("select * from menagerie.ensure_my_account()")).rows[0];
  assert.equal(first.id, second.id);
  assert.equal(first.plan_code, "sanctuary");
  await query("reset role");
  assert.equal((await query("select count(*)::int as n from menagerie.tenants where owner_user_id=$1", [uid])).rows[0].n, 1);
  assert.equal((await query("select count(*)::int as n from menagerie.service_providers where tenant_id=$1", [first.id])).rows[0].n, 6);
  assert.equal((await query("select count(*)::int as n from menagerie.shopping_categories where tenant_id=$1", [first.id])).rows[0].n, 8);
  await query("update menagerie.subscriptions set status='canceled', razorpay_subscription_id='test-preserve' where tenant_id=$1", [first.id]);
  const before = (await query("select * from menagerie.subscriptions where tenant_id=$1", [first.id])).rows[0];
  await query("set local role authenticated");
  await query("select menagerie.ensure_my_account()");
  await query("reset role");
  assert.deepEqual((await query("select * from menagerie.subscriptions where tenant_id=$1", [first.id])).rows[0], before);
  // Only this transaction's fixture is removed; verify convergence when
  // a pre-existing household has no initial subscription row yet.
  await query("delete from menagerie.subscriptions where tenant_id=$1", [first.id]);
  await query("set local role authenticated");
  await query("select menagerie.ensure_my_account()");
  await query("reset role");
  assert.equal((await query("select status from menagerie.subscriptions where tenant_id=$1", [first.id])).rows[0].status, "trialing");
  // A second user gets a separate account, never access to the first.
  await query("insert into public.app_memberships (user_id,app_key,status) values ($1,'pets','active')", [otherUid]);
  await identity(otherUid, otherEmail);
  await query("set local role authenticated");
  const other = (await query("select * from menagerie.ensure_my_account()")).rows[0];
  assert.notEqual(other.id, first.id);
  assert.equal((await query("select count(*)::int as n from menagerie.tenants where id=$1", [first.id])).rows[0].n, 0);
  assert.equal((await query("select menagerie.can_write_tenant($1) as allowed", [first.id])).rows[0].allowed, false);
  await query("insert into menagerie.habitats (tenant_id,name,habitat_type) values ($1,'Personal habitat','aquarium')", [other.id]);
  await rejected(`insert into menagerie.habitats (tenant_id,name,habitat_type) values ('${first.id}','Wrong account','aquarium')`, /row-level security/);
  await query("update menagerie.tenants set name='My pets' where id=$1", [other.id]);
  await rejected(`update menagerie.tenants set owner_user_id='${uid}' where id='${other.id}'`, /permission denied/);
  await rejected("select * from menagerie_archive.memberships", /permission denied/);
  await query("reset role");
  await query("set local role anon");
  await rejected("select menagerie.ensure_my_account()", /permission denied/);
  await query("reset role");
  console.log("PASS: membership gates, helper privileges, idempotency, starter data, subscription preservation, personal account isolation, ownership protection, archive rejection, anonymous rejection. All fixtures rolled back.");
} finally {
  await query("rollback");
  await client.end();
}
