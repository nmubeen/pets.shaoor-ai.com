// Creates Stripe Products + monthly/annual Prices for the Household and
// Sanctuary tiers (Litter is free and Rescue is a custom/sales-assisted
// plan — neither needs a Stripe Price), then writes the resulting Price
// IDs into menagerie.plans. Idempotent: re-running updates existing rows
// rather than creating duplicate products.
//
// Usage: node scripts/seed-stripe-plans.mjs   (reads .env / .env.local)
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import { Client } from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY is not set (checked .env and .env.local).");
  process.exit(1);
}
if (!process.env.DIRECT_URL) {
  console.error("DIRECT_URL is not set (checked .env and .env.local).");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-08-26.dahlia" });

const PLANS = [
  { code: "household", name: "Household", monthlyInr: 349, annualInr: 3490 },
  { code: "sanctuary", name: "Sanctuary", monthlyInr: 799, annualInr: 7990 },
];

async function findOrCreateProduct(name) {
  const existing = await stripe.products.search({ query: `name:"${name}" AND active:"true"` });
  if (existing.data[0]) return existing.data[0];
  return stripe.products.create({ name });
}

async function findOrCreatePrice(productId, amountInr, interval, lookupKey) {
  const existing = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const match = existing.data.find(
    (p) => p.recurring?.interval === interval && p.unit_amount === amountInr * 100 && p.currency === "inr"
  );
  if (match) return match;
  return stripe.prices.create({
    product: productId,
    currency: "inr",
    unit_amount: amountInr * 100,
    recurring: { interval },
    lookup_key: lookupKey,
  });
}

const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

try {
  for (const plan of PLANS) {
    console.log(`\n${plan.name}`);
    const product = await findOrCreateProduct(`Menagerie — ${plan.name}`);
    console.log(`  product ${product.id}`);

    const monthly = await findOrCreatePrice(product.id, plan.monthlyInr, "month", `menagerie_${plan.code}_monthly`);
    console.log(`  monthly price ${monthly.id} (₹${plan.monthlyInr}/mo)`);

    const annual = await findOrCreatePrice(product.id, plan.annualInr, "year", `menagerie_${plan.code}_annual`);
    console.log(`  annual price  ${annual.id} (₹${plan.annualInr}/yr)`);

    await client.query(
      "update menagerie.plans set stripe_price_id_monthly = $1, stripe_price_id_annual = $2 where code = $3",
      [monthly.id, annual.id, plan.code]
    );
  }

  console.log("\nDone — menagerie.plans updated with live Stripe Price IDs.");
} finally {
  await client.end();
}
