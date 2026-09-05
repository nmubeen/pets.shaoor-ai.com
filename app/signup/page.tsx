"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/marketing/AuthShell";
import { Btn } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/**
 * Two very different flows share this one page:
 * - Default: "create a workspace" — collects a name/type, becomes the
 *   owner of a brand-new tenant.
 * - Invited (?invited=1&email=...&tenant=...): someone was invited to an
 *   *existing* workspace and has no account yet. This must NOT collect a
 *   workspace name/type or send that metadata to signUp() — doing so
 *   would create a second, empty workspace alongside reconciling their
 *   invite (menagerie.handle_new_user() runs the invite-reconciliation
 *   step unconditionally, but only creates a tenant when workspace_name
 *   metadata is present). This is exactly the fix for a real bug
 *   (sumayra1817@gmail.com, 2026-09-04): the invite email used to send
 *   people to /login, which fails with no password set yet, and this
 *   same page's "New to Menagerie? Sign up" fallback landed here in
 *   default mode, offering to create a new household instead of joining
 *   the one she was actually invited to.
 */
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invited = searchParams.get("invited") === "1";
  const invitedTenant = searchParams.get("tenant") || null;

  const [workspaceType, setWorkspaceType] = useState<"household" | "organization">("household");
  const [name, setName] = useState("The Home");
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Invited mode deliberately sends no workspace_name/workspace_type
      // — see the file-level comment above.
      options: invited ? undefined : { data: { workspace_name: name, workspace_type: workspaceType } },
    });

    setLoading(false);
    if (error) {
      // Supabase's own wording varies by version, but every case means
      // the same thing here: this email already has an account, so
      // signing up again is the wrong action — send them to sign in
      // instead, with the email already filled in.
      if (invited && /already|registered|exists/i.test(error.message)) {
        router.push(`/login?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(error.message);
      return;
    }

    // A trigger on auth.users (menagerie.handle_new_user) creates the
    // tenant + owner membership + trial subscription from this metadata
    // (default mode) or just reconciles the pending invite (invited mode).
    if (data.session) {
      router.push(invited ? "/app" : "/onboarding/pets");
      router.refresh();
    } else {
      // Email confirmation is required before a session exists — the
      // tenant/reconciliation already happened, they just need to confirm
      // and log in.
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <AuthShell
        step={1}
        title="Check your email"
        subtitle={
          invited
            ? `We sent a confirmation link to ${email}. Follow it, then sign in to start using ${invitedTenant || "the workspace"}.`
            : `We sent a confirmation link to ${email}. Follow it, then sign in to finish setting up ${name}.`
        }
      >
        <Btn href="/login" className="w-full justify-center">
          Go to sign in →
        </Btn>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      step={1}
      title={invited ? `Join ${invitedTenant || "the workspace"}` : "Create your workspace"}
      subtitle={
        invited
          ? "Set a password to get started — you'll land right in the workspace you were invited to."
          : "This is the billable unit that holds every pet, habitat, and person who cares for them."
      }
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {!invited && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">
                Workspace name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
                placeholder="The Home"
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Type</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWorkspaceType("household")}
                  className={`flex-1 text-sm font-medium px-3 py-2.5 rounded-lg border transition ${
                    workspaceType === "household"
                      ? "bg-primary text-primary-ink border-primary"
                      : "bg-transparent text-muted border-line hover:text-ink"
                  }`}
                >
                  Household
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceType("organization")}
                  className={`flex-1 text-sm font-medium px-3 py-2.5 rounded-lg border transition ${
                    workspaceType === "organization"
                      ? "bg-primary text-primary-ink border-primary"
                      : "bg-transparent text-muted border-line hover:text-ink"
                  }`}
                >
                  Rescue / Shelter
                </button>
              </div>
              <p className="text-xs text-muted mt-1">
                {workspaceType === "organization"
                  ? "Unlocks staff roles and public adoption profiles once you're on the Rescue & Shelter plan."
                  : "The right choice for a family, a foster carer, or anyone managing pets at home."}
              </p>
            </div>
          </>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Email</span>
          <input
            type="email"
            required
            readOnly={invited}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition ${invited ? "opacity-70" : ""}`}
            placeholder="you@example.com"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
            placeholder="At least 6 characters"
          />
        </label>

        {error && <p className="text-xs text-coral">{error}</p>}

        <Btn type="submit" className="w-full justify-center mt-1">
          {loading ? "Setting up…" : invited ? "Join workspace →" : "Continue →"}
        </Btn>
        {!invited && (
          <p className="text-xs text-muted text-center">
            Starts your 14-day Sanctuary trial. No card needed today.
          </p>
        )}
        <p className="text-xs text-muted text-center">
          Already have a workspace?{" "}
          <a href={invited ? `/login?email=${encodeURIComponent(email)}` : "/login"} className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </form>
    </AuthShell>
  );
}
