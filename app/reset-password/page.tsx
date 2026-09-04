"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/marketing/AuthShell";
import { Btn } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // Clicking the emailed link lands here with the recovery tokens in the
    // URL; the client SDK processes them automatically and fires this event
    // once a recovery session is established — only then is it safe to
    // show the "set a new password" form.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Covers the case where the event already fired before this listener
    // was attached (a session already exists on mount).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/app");
      router.refresh();
    }, 1500);
  }

  if (done) {
    return (
      <AuthShell step={1} title="Password updated" subtitle="Taking you to your workspace…">
        <Btn href="/app" className="w-full justify-center">
          Continue →
        </Btn>
      </AuthShell>
    );
  }

  if (!ready) {
    return (
      <AuthShell step={1} title="Reset your password" subtitle="Verifying your link…">
        <p className="text-sm text-muted">
          If this doesn&rsquo;t update in a few seconds, the link may have expired —{" "}
          <a href="/forgot-password" className="text-primary hover:underline">
            request a new one
          </a>
          .
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell step={1} title="Set a new password" subtitle="Choose a password for your account.">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">New password</span>
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
        <label className="flex flex-col gap-1.5">
          <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Confirm password</span>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
            placeholder="Re-enter password"
          />
        </label>

        {error && <p className="text-xs text-coral">{error}</p>}

        <Btn type="submit" className="w-full justify-center mt-1">
          {loading ? "Saving…" : "Update password →"}
        </Btn>
      </form>
    </AuthShell>
  );
}
