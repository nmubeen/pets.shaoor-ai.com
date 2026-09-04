import "server-only";
import Razorpay from "razorpay";

// Lazy, same reasoning as the old lib/stripe.ts: importing this module (e.g.
// at build time, when Next collects route metadata) shouldn't throw just
// because the keys aren't configured yet — only an actual request that
// needs Razorpay should fail.
let _client: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!_client) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET is not set.");
    }
    _client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _client;
}
