"use client";

import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/marketing/AuthShell";
import { Btn } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell
        step={1}
        title="Check your email"
        subtitle={`If an account exists for ${email}, a password reset link is on its way.`}
      >
        <Btn href="/login" className="w-full justify-center">
          Back to sign in →
        </Btn>
      </AuthShell>
    );
  }

  return (
    <AuthShell step={1} title="Reset your password" subtitle="We'll email you a link to set a new one.">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
            placeholder="you@example.com"
          />
        </label>

        {error && <p className="text-xs text-coral">{error}</p>}

        <Btn type="submit" className="w-full justify-center mt-1">
          {loading ? "Sending…" : "Send reset link →"}
        </Btn>
        <p className="text-xs text-muted text-center">
          <a href="/login" className="text-primary hover:underline">
            Back to sign in
          </a>
        </p>
      </form>
    </AuthShell>
  );
}
