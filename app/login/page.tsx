"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/marketing/AuthShell";
import { Btn } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Prefilled by the invite email's "Sign in instead" link and by
  // /signup's own "this email already has an account" redirect.
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <AuthShell step={1} title="Welcome back" subtitle="Sign in to your workspace.">
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
        <label className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Password</span>
            <a href="/forgot-password" className="text-[.68rem] text-primary hover:underline">
              Forgot password?
            </a>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
            placeholder="••••••••"
          />
        </label>

        {error && <p className="text-xs text-coral">{error}</p>}

        <Btn type="submit" className="w-full justify-center mt-1">
          {loading ? "Signing in…" : "Sign in →"}
        </Btn>
        <p className="text-xs text-muted text-center">
          New here?{" "}
          <a href="/signup" className="text-primary hover:underline">
            Start a free trial
          </a>
        </p>
      </form>
    </AuthShell>
  );
}
