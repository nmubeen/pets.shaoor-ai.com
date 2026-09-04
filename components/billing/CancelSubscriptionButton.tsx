"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelSubscription } from "@/lib/actions/billing";

export function CancelSubscriptionButton({ tenantId, className }: { tenantId: string; className: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1.5">
      <button
        disabled={pending}
        onClick={() => {
          if (!confirm("Cancel your subscription? You'll keep this plan through the period you've already paid for.")) {
            return;
          }
          startTransition(async () => {
            const result = await cancelSubscription(tenantId);
            if (result?.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        className={className}
      >
        {pending ? "Cancelling…" : "Cancel plan"}
      </button>
      {error && <p className="text-xs text-coral">{error}</p>}
    </div>
  );
}
