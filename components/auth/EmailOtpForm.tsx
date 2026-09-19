"use client";
import { startTransition, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getOtpLength, getSupabaseConfig } from "@/lib/supabase/config";
import { submitAuth } from "@/lib/auth/actions";
import { BrandLogo } from "@/components/BrandLogo";
const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition w-full";
const primaryBtn = "w-full inline-flex items-center justify-center gap-2 font-bold text-sm rounded-xl px-5 py-3 bg-(image:--gradient-button-bg) text-white hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed";
const PENDING_KEY = "pets_pending_otp_email";

export function EmailOtpForm({ trialDays = 14 }: { trialDays?: number | null }) {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  // Survives a reload of this same tab (not a fresh sign-in elsewhere —
  // sessionStorage, not localStorage) so switching away to read the code
  // email and back doesn't strand someone back at the email-entry step if
  // the tab happened to get reloaded in between (some mail apps' in-app
  // browsers do this under memory pressure; emailButton's target="_blank"
  // avoids that tab being reused for anything else, but this covers the
  // reload case on top of that).
  const [destination, setDestination] = useState(() => {
    try { return sessionStorage.getItem(PENDING_KEY) ?? ""; } catch { return ""; }
  });
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [configuration] = useState(() => {
    try { getSupabaseConfig(); return { length: getOtpLength(), error: "" }; }
    catch (cause) { return { length: 6, error: cause instanceof Error ? cause.message : "Authentication is not configured." }; }
  });
  const configurationError = configuration.error;
  const [status, setStatus] = useState<"loading" | "signed-out" | "signed-in">("loading");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const length = configuration.length;
  const deadline = useRef(0);
  const locked = useRef(false);
  const generation = useRef(0);
  // Only used to detect an already-established session (restored on
  // mount, or set in another tab) and skip straight to /app — this
  // component never calls verifyOtp() or any membership RPC itself
  // anymore; that entire sequence runs server-side in submitAuth() (see
  // lib/auth/actions.ts), on the same request/client as the OTP
  // verification, before this component ever observes "signed-in".
  useEffect(() => {
    if (configurationError) return;
    const lifecycle = generation;
    let active = true;
    let unsubscribe = () => {};
    try {
      const client = createClient();
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        // A cookie/session event must not navigate ahead of Gates B/C.
        // During submission, only the completed action decides navigation.
        if (!active || locked.current) return;
        generation.current++;
        setStatus(session ? "signed-in" : "signed-out");
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      queueMicrotask(() => { if (active) { setError("Unable to initialize authentication. Reload to retry."); setStatus("signed-out"); } });
    }
    return () => { active = false; lifecycle.current++; unsubscribe(); };
  }, [configurationError]);
  useEffect(() => {
    // Every protected route re-validates membership/tenant state itself
    // (lib/tenant.ts's requireUser()) — this is a plain navigation, not a
    // client-side authorization decision.
    if (status === "signed-in") window.location.replace("/app");
  }, [status]);
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))), 250);
    return () => window.clearInterval(timer);
  }, []);
  async function request(verify: boolean) {
    if (locked.current || status !== "signed-out" || configurationError) return;
    if (!verify && Date.now() < deadline.current) return;
    const normalized = (verify || destination ? destination : email).trim().toLowerCase();
    if (verify && !new RegExp(`^[0-9]{${length}}$`).test(code.trim())) {
      setError(`Enter the ${length}-digit code from your email.`);
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    const current = generation.current;
    try {
      const form = new FormData();
      form.set("email", normalized);
      if (verify) form.set("token", code.trim());
      const result = await submitAuth(verify ? "verify-code" : "email-code", form);
      if (current !== generation.current) return;
      if (result.error) {
        setError(result.error);
      } else if (result.redirect) {
        // Full navigation only after the server action has fully
        // completed — including cookie writes and (for verify) membership
        // registration and account provisioning — matching Launcher's
        // AuthForm exactly (which does the same full reload via
        // window.location.assign; .replace() here instead, matching
        // every other hard-navigation-after-auth in this codebase, e.g.
        // components/auth/SessionBoundary.tsx). Never navigate before the
        // action resolves.
        try { sessionStorage.removeItem(PENDING_KEY); } catch {}
        window.location.replace(result.redirect);
      } else if (!verify) {
        deadline.current = Date.now() + 60_000;
        setRemaining(60);
        setDestination(normalized);
        setEmail(normalized);
        setCode("");
        try { sessionStorage.setItem(PENDING_KEY, normalized); } catch {}
      }
    } catch {
      if (current === generation.current) setError("Unable to connect. Check your connection and try again.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-(image:--gradient-primary-bg)">
      <div className="w-full max-w-md rounded-3xl shadow-2xl bg-surface p-7 md:p-9">
        <Link href="/" className="flex items-center gap-3 mb-8">
          <BrandLogo />
          <span className="flex flex-col leading-tight">
            <span className="font-semibold text-base text-ink">Shaoor-AI Pets</span>
            <span className="text-[.62rem] uppercase tracking-[.1em] text-(--color-secondary-text-icon)">Every pet, organized</span>
          </span>
        </Link>

        {configurationError ? <p role="alert" className="text-sm text-coral">{configurationError}</p> : status !== "signed-out" ? <p role="status">{status === "loading" ? "Checking your session…" : "Signing you in…"}</p> : (
          <>
            <span className="block text-[.68rem] uppercase tracking-[.1em] text-(--color-secondary-text-icon) mb-2">
              {destination ? "Check your inbox" : "Household sign-in"}
            </span>
            <h1 className="text-[1.75rem] font-bold leading-tight mb-1.5 text-(--color-primary-text)">
              {destination ? "Enter your code" : "Sign in to Shaoor-AI Pets"}
            </h1>
            <p className="text-sm text-muted mb-8">
              {destination ? `We sent a sign-in code to ${destination}.` : "New here or returning? Use your email to continue."}
            </p>

            <form className="flex flex-col gap-5" aria-busy={busy} onSubmit={(event: FormEvent) => { event.preventDefault(); startTransition(() => request(Boolean(destination))); }}>
              {destination ? (
                <div className="flex flex-col gap-1.5" key="code">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Verification code ({length} digits)</span>
                    <input autoFocus required type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error ? "otp-error" : undefined} className={field} />
                  </label>
                  <p className="text-xs text-muted">Don&rsquo;t see it? Check spam or junk too.</p>
                </div>
              ) : (
                <label className="flex flex-col gap-1.5" key="email">
                  <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Email</span>
                  <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} className={field} placeholder="you@example.com" aria-describedby={error ? "otp-error" : undefined} />
                </label>
              )}
              {error && <p id="otp-error" role="alert" className="text-xs text-coral">{error}</p>}
              <button type="submit" disabled={busy || (!destination && remaining > 0)} className={primaryBtn}>
                {busy ? "Please wait…" : destination ? "Verify and sign in" : "Send code"}
              </button>
              {destination ? (
                <div className="flex flex-col items-center gap-2">
                  <button type="button" disabled={busy || remaining > 0} onClick={() => startTransition(() => request(false))} className="text-sm text-(--color-primary-text) disabled:opacity-50">
                    Resend code{remaining > 0 ? ` (${remaining}s)` : ""}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setDestination("");
                      setCode("");
                      setError("");
                      try { sessionStorage.removeItem(PENDING_KEY); } catch {}
                    }}
                    className="text-[.68rem] uppercase tracking-[.05em] text-muted"
                  >
                    Use another email
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted text-center">
                  New accounts start{trialDays ? ` a ${trialDays}-day free trial` : " with a free trial"}. No password
                  needed.
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
