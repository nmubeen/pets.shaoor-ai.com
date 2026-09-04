"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/marketing/AuthShell";
import { Btn } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [workspaceType, setWorkspaceType] = useState<"household" | "organization">("household");
  const [name, setName] = useState("The Home");
  const [email, setEmail] = useState("");
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
      options: {
        data: { workspace_name: name, workspace_type: workspaceType },
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    // A trigger on auth.users (menagerie.handle_new_user) creates the
    // tenant + owner membership + trial subscription from this metadata.
    if (data.session) {
      router.push("/onboarding/pets");
      router.refresh();
    } else {
      // Email confirmation is required before a session exists — the
      // tenant is already created, they just need to confirm and log in.
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <AuthShell
        step={1}
        title="Check your email"
        subtitle={`We sent a confirmation link to ${email}. Follow it, then sign in to finish setting up ${name}.`}
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
      title="Create your workspace"
      subtitle="This is the billable unit that holds every pet, habitat, and person who cares for them."
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
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
          {loading ? "Creating workspace…" : "Continue →"}
        </Btn>
        <p className="text-xs text-muted text-center">
          Starts your 14-day Sanctuary trial. No card needed today.
        </p>
        <p className="text-xs text-muted text-center">
          Already have a workspace?{" "}
          <a href="/login" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </form>
    </AuthShell>
  );
}
