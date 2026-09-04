import "server-only";
import Stripe from "stripe";

// Lazy so the module can be imported (e.g. at build time, when collecting
// route metadata) before STRIPE_SECRET_KEY is configured — it only throws
// once a request actually tries to call Stripe.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set.");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-08-26.dahlia",
    });
  }
  return _stripe;
}
