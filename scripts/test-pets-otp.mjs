// Local production-server integration test. Sends REAL OTP emails to the
// supplied inbox; run only with its owner's authorization. Codes are read
// from stdin. Cookies stay in memory and are never printed or written.
// Usage: npm run build; npm start -- --port 3005
//        node scripts/test-pets-otp.mjs <email>
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createServer } from "node:http";
import { Client } from "pg";
import { createRequire } from "node:module";
const { encodeReply } = createRequire(import.meta.url)("next/dist/compiled/react-server-dom-turbopack/client");
process.loadEnvFile(".env");
const email = process.argv[2];
if (!email) throw new Error("Provide the authorized test inbox");
const base = "http://localhost:3005";
const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8"));
const actionId = (name) => Object.entries(manifest.node).find(([, value]) => value.exportedName === name)?.[0];
const cookies = new Map();
const lines = createInterface({ input: process.stdin, terminal: false })[Symbol.asyncIterator]();
const db = new Client({ connectionString: process.env.DIRECT_URL });
// Optional loopback-only input for runners without an interactive stdin.
// The harness keeps codes and cookies in memory, never on disk.
let receiveCode;
const inputServer = process.argv.includes("--http-input") ? createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/code" || !receiveCode) {
    res.writeHead(400).end(); return;
  }
  let code = "";
  for await (const part of req) {
    code += part;
    if (code.length > 32) { res.writeHead(400).end(); return; }
  }
  if (!/^\d{6,10}$/.test(code.trim())) { res.writeHead(400).end(); return; }
  const resolve = receiveCode;
  receiveCode = undefined;
  resolve({ value: code.trim(), done: false });
  res.end("Code received");
}) : null;
if (inputServer) await new Promise(resolve => inputServer.listen(3006, "127.0.0.1", resolve));
async function snapshot() {
  const { rows } = await db.query(`select t.id, t.plan_code, t.trial_ends_at, s.status,
    s.razorpay_subscription_id from menagerie.tenants t
    join auth.users u on u.id=t.owner_user_id
    left join menagerie.subscriptions s on s.tenant_id=t.id
    where lower(u.email)=lower($1) order by t.id`, [email]);
  return rows;
}
async function action(name, mode, token) {
  const form = new FormData();
  form.set("email", email);
  if (token) form.set("token", token);
  const body = await encodeReply(name === "signOut" ? [] : [mode, form]);
  const response = await fetch(base + (name === "signOut" ? "/auth/error" : "/login"), {
    method: "POST", redirect: "manual",
    headers: { "Next-Action": actionId(name), Origin: base, Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join("; ") }, body,
  });
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(";");
    const split = pair.indexOf("=");
    cookies.set(pair.slice(0,split), pair.slice(split+1));
  }
  const text = await response.text();
  if (name === "signOut") {
    assert.match(response.headers.get("x-action-redirect") ?? "", /\/login/);
    return;
  }
  const line = text.split("\n").find(line => line.startsWith("1:"));
  assert.ok(line, `Missing action result (HTTP ${response.status})`);
  const result = JSON.parse(line.slice(2));
  assert.ok(!result.error, result.error);
  return result;
}
async function verifyCycle(number) {
  if (!(number === 1 && process.argv.includes("--code-already-sent"))) {
    assert.equal((await action("submitAuth", "email-code")).codeSent, true);
  }
  console.log(`OTP ${number} sent. Confirm Shaoor-AI Pets branding and enter the received code on stdin.`);
  const input = inputServer ? await new Promise(resolve => { receiveCode = resolve; }) : await lines.next();
  if (input.done) throw new Error("A received email code is required");
  assert.equal((await action("submitAuth", "verify-code", input.value.trim())).redirect, "/app");
  const response = await fetch(base + "/app", { redirect: "manual", headers: { Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join("; ") } });
  assert.ok(response.status === 200 || response.headers.get("location")?.startsWith("/app/pending"), `Unexpected app response ${response.status}`);
  console.log(`Verification ${number} passed; session reaches the household/billing route.`);
  return snapshot();
}
try {
  await db.connect();
  const before = await snapshot();
  const existed = (await db.query("select exists(select 1 from auth.users where lower(email)=lower($1)) as present", [email])).rows[0].present;
  console.log(`Before: shared identity ${existed ? "exists" : "is new"}; ${before.length} active household(s).`);
  const first = await verifyCycle(1);
  assert.ok(first.length > 0);
  if (!before.length) assert.equal(first.length, 1);
  else assert.deepEqual(first, before);
  await action("signOut");
  const signedOut = await fetch(base + "/app", { redirect: "manual", headers: { Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join("; ") } });
  assert.match(signedOut.headers.get("location") ?? "", /\/login/);
  console.log("Sign-out verified. Waiting for the email resend cooldown.");
  await new Promise(resolve => setTimeout(resolve, 61000));
  const second = await verifyCycle(2);
  assert.deepEqual(second, first);
  await action("signOut");
  console.log("PASS: email verification, household access, sign-out, repeat email verification; household IDs, plans, trial dates and subscription state unchanged on repeat login. Test session signed out.");
} finally {
  await db.end();
  inputServer?.close();
  process.stdin.destroy();
}
