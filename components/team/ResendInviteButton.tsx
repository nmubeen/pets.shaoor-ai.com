"use client";

import { useState, useTransition } from "react";
import { resendInvite } from "@/lib/actions/team";

export function ResendInviteButton({ tenantId, membershipId }: { tenantId: string; membershipId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setResult(null);
            const { error } = await resendInvite(tenantId, membershipId);
            setResult(error ? { ok: false, message: error } : { ok: true, message: "Sent!" });
          })
        }
        className="text-xs text-muted hover:text-primary transition disabled:opacity-60"
      >
        {pending ? "Sending…" : "Resend"}
      </button>
      {result && (
        <p className={`text-xs text-right max-w-[220px] ${result.ok ? "text-muted" : "text-coral"}`}>{result.message}</p>
      )}
    </div>
  );
}
