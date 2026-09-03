"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/marketing/AuthShell";
import { Btn } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [workspaceType, setWorkspaceType] = useState<"household" | "org">("household");
  const [name, setName] = useState("The Home");

  return (
    <AuthShell
      step={1}
      title="Create your workspace"
      subtitle="This is the billable unit that holds every pet, habitat, and person who cares for them."
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          router.push("/onboarding/pets");
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">
            Workspace name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
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
              onClick={() => setWorkspaceType("org")}
              className={`flex-1 text-sm font-medium px-3 py-2.5 rounded-lg border transition ${
                workspaceType === "org"
                  ? "bg-primary text-primary-ink border-primary"
                  : "bg-transparent text-muted border-line hover:text-ink"
              }`}
            >
              Rescue / Shelter
            </button>
          </div>
          <p className="text-xs text-muted mt-1">
            {workspaceType === "org"
              ? "Unlocks staff roles and public adoption profiles once you're on the Rescue & Shelter plan."
              : "The right choice for a family, a foster carer, or anyone managing pets at home."}
          </p>
        </div>

        <Btn type="submit" className="w-full justify-center mt-1">
          Continue →
        </Btn>
        <p className="text-xs text-muted text-center">
          Starts your 14-day Sanctuary trial. No card needed today.
        </p>
      </form>
    </AuthShell>
  );
}
