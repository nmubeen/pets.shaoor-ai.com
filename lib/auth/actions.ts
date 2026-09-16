"use server";

// Mirrors Launcher's src/lib/auth/actions.ts submitAuth() pattern: OTP
// request/verify, membership registration, and (Pets-specific) account
// provisioning all happen server-side, on the SAME auth client, within one
// action invocation — no browser-side verifyOtp/register_app_membership
// call, no reliance on onAuthStateChange/getSession()/getUser() to learn
// whether the session is "ready" for a follow-up request. The browser only
// performs a full navigation once this has already completed (including
// cookie writes), exactly like Launcher's AuthForm.
import { getAuthEmailRedirectTo } from "./config";
import { createAuthServerClient } from "./server";
import { createClient as createBusinessServerClient } from "@/lib/supabase/server";
import { getOtpLength } from "@/lib/supabase/config";
import { otpErrorMessage } from "@/lib/supabase/auth-error";
import { registerAppMembershipOnAuthClient, membershipError } from "./membership";
import { ensurePetsAccountForCurrentUser } from "./provisioning";

export type AuthMode = "email-code" | "verify-code";
export type AuthResult = { error?: string; codeSent?: boolean; redirect?: string };

function validEmail(value: string) {
  return value.length > 0 && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function submitAuth(mode: AuthMode, form: FormData): Promise<AuthResult> {
  if (mode !== "email-code" && mode !== "verify-code") return { error: "Invalid request." };
  const field = (name: string) => (typeof form.get(name) === "string" ? String(form.get(name)) : "");
  const email = field("email").trim().toLowerCase();
  const token = field("token").trim();

  if (!validEmail(email)) return { error: "Please enter a valid email address." };

  let otpLength: number;
  try {
    otpLength = getOtpLength();
  } catch {
    return { error: "Sign-in is temporarily unavailable. Please try again later." };
  }
  if (mode === "verify-code" && !new RegExp(`^[0-9]{${otpLength}}$`).test(token)) {
    return { error: `Enter the ${otpLength}-digit code from your email.` };
  }

  let client: Awaited<ReturnType<typeof createAuthServerClient>>;
  try {
    client = await createAuthServerClient();
  } catch {
    return { error: "Sign-in is temporarily unavailable. Please try again later." };
  }

  if (mode === "email-code") {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        // The shared Send Email Hook picks this app's sender/branding
        // from this hostname (see supabase/functions/send-auth-email in
        // the Launcher repo) — required even though this flow never
        // follows the link, since detectSessionInUrl is false and the
        // code is entered manually.
        emailRedirectTo: getAuthEmailRedirectTo(),
      },
    });
    if (error) return { error: otpErrorMessage(error, false) };
    return { codeSent: true };
  }

  // Gate A: verify the email code before any membership or household work.
  const { data, error } = await client.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.session || !data.user) {
    return { error: otpErrorMessage(error ?? { message: "Verification did not return a session" }, true) };
  }

  // Gate B: register/confirm active "pets" membership, on the SAME
  // client/request that just established the session — no cross-request
  // cookie propagation involved, matching Launcher exactly.
  let membership;
  try {
    membership = await registerAppMembershipOnAuthClient(client);
  } catch {
    return { redirect: `/auth/error?reason=${membershipError(null, "rpc-failed")}` };
  }
  if (membership?.status !== "active") {
    return { redirect: `/auth/error?reason=${membershipError(membership, "missing")}` };
  }

  // Gate C: idempotent Pets account provisioning (menagerie.tenants +
  // initial subscription) — the business-data client, not the auth
  // client, since ensure_my_account() lives in menagerie, not public.
  // Reads the same session cookies just written above (same request,
  // same Next.js cookies() store). Business logic itself lives entirely
  // in the SQL function — nothing reproduced here.
  try {
    const businessClient = await createBusinessServerClient();
    const provisioned = await ensurePetsAccountForCurrentUser(businessClient);
    if (!provisioned) return { redirect: "/auth/access-error" };
  } catch {
    return { redirect: "/auth/access-error" };
  }

  return { redirect: "/app" };
}
