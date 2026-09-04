"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeMember } from "@/lib/actions/team";

export function RemoveMemberButton({ tenantId, membershipId }: { tenantId: string; membershipId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await removeMember(tenantId, membershipId);
          router.refresh();
        })
      }
      className="text-xs text-muted hover:text-coral transition disabled:opacity-60"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
