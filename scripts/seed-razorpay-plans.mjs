// Creates Razorpay Plans for the Household and Sanctuary tiers (monthly +
// annual) -- Litter is free and Rescue is custom/sales-assisted, neither
// needs a Plan -- then writes the resulting Plan IDs into menagerie.plans.
// Idempotent: re-running reuses an existing Plan with the same name+amount
// instead of creating a duplicate (Razorpay's Plans API has no search
// endpoint, so this lists and matches client-side).
//
// Usage: node scripts/seed-razorpay-plans.mjs   (reads .env / .env.local)
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Razorpay from "razorpay";
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

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET is not set (checked .env and .env.local).");
  process.exit(1);
}
if (!process.env.DIRECT_URL) {
  console.error("DIRECT_URL is not set (checked .env and .env.local).");
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLANS = [
  { code: "household", name: "Household", monthlyInr: 349, annualInr: 3490 },
  { code: "sanctuary", name: "Sanctuary", monthlyInr: 799, annualInr: 7990 },
];

async function findOrCreatePlan(itemName, amountInr, period) {
  const { items: existing } = await razorpay.plans.all({ count: 100 });
  const match = existing.find(
    (p) => p.item.name === itemName && p.item.amount === amountInr * 100 && p.period === period
  );
  if (match) return match;

  return razorpay.plans.create({
    period,
    interval: 1,
    item: {
      name: itemName,
      amount: amountInr * 100, // paise
      currency: "INR",
    },
  });
}

const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

try {
  for (const plan of PLANS) {
    console.log(`\n${plan.name}`);

    const monthly = await findOrCreatePlan(`Menagerie — ${plan.name} (Monthly)`, plan.monthlyInr, "monthly");
    console.log(`  monthly plan ${monthly.id} (₹${plan.monthlyInr}/mo)`);

    const annual = await findOrCreatePlan(`Menagerie — ${plan.name} (Annual)`, plan.annualInr, "yearly");
    console.log(`  annual plan  ${annual.id} (₹${plan.annualInr}/yr)`);

    await client.query(
      "update menagerie.plans set razorpay_plan_id_monthly = $1, razorpay_plan_id_annual = $2 where code = $3",
      [monthly.id, annual.id, plan.code]
    );
  }

  console.log("\nDone — menagerie.plans updated with live Razorpay Plan IDs.");
} finally {
  await client.end();
}
