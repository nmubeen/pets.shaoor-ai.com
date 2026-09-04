// Applies supabase/migrations/*.sql, in filename order, against DIRECT_URL.
// Tracks what's already run in a `_migrations` bookkeeping table so it's
// safe to re-run. Usage: node scripts/migrate.mjs (reads .env / .env.local).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// Minimal .env loader — avoids an extra dependency just for this script.
async function loadEnvFile(file) {
  try {
    const text = await readFile(file, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

await loadEnvFile(path.join(root, ".env"));
await loadEnvFile(path.join(root, ".env.local"));

const connectionString = process.env.DIRECT_URL;
if (!connectionString) {
  console.error("DIRECT_URL is not set (checked .env and .env.local).");
  process.exit(1);
}

const client = new Client({ connectionString });
await client.connect();

try {
  await client.query(
    "create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now())"
  );

  const dir = path.join(root, "supabase", "migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  const { rows } = await client.query("select name from public._migrations");
  const applied = new Set(rows.map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip  ${file} (already applied)`);
      continue;
    }
    const sql = await readFile(path.join(dir, file), "utf8");
    console.log(`apply ${file}`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into public._migrations (name) values ($1)", [file]);
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw new Error(`Migration ${file} failed: ${err.message}`);
    }
  }

  console.log("Migrations up to date.");
} finally {
  await client.end();
}
