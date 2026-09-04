"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@/components/icons";
import { inviteMember } from "@/lib/actions/team";

const roles = ["caregiver", "viewer"];

export function InviteForm({ tenantId }: { tenantId: string }) {
  const [role, setRole] = useState("caregiver");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await inviteMember(tenantId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <input
          type="email"
          name="email"
          required
          placeholder="Invite by email"
          className="flex-1 bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
        />
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition whitespace-nowrap disabled:opacity-60"
        >
          <PlusIcon className="w-[.9em] h-[.9em]" />
          {pending ? "Sending…" : "Send invite"}
        </button>
      </div>
      {error && <p className="text-xs text-coral">{error}</p>}
    </form>
  );
}
