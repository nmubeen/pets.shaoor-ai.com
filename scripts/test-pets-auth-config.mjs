// Regression: the shared Auth allowlist accepts /auth/sign-in, not /login.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(readFileSync("lib/auth/config.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
function config(siteUrl) {
  const exports = {};
  runInNewContext(source, { exports, URL, process: { env: { NEXT_PUBLIC_SITE_URL: siteUrl } } });
  return exports;
}
for (const site of [undefined, "https://pets.shaoor-ai.com", "https://pets.shaoor-ai.com/", "http://localhost:3005", "http://127.0.0.1:3005"]) {
  assert.equal(config(site).getAuthEmailRedirectTo(), "https://pets.shaoor-ai.com/auth/sign-in");
  assert.equal(config(site).authAppConfig.key, "pets");
}
for (const site of ["https://launcher.shaoor-ai.com", "http://pets.shaoor-ai.com", "https://pets.shaoor-ai.com.example.org", "not-a-url"]) {
  assert.throws(() => config(site).getAuthEmailRedirectTo());
}
console.log("PASS: production and local OTP requests select the approved Pets redirect; other app hosts are rejected.");
