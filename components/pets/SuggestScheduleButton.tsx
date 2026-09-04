"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateVaccinationSchedule } from "@/lib/actions/health";

export function SuggestScheduleButton({ tenantId, petId }: { tenantId: string; petId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            setMessage(null);
            const result = await generateVaccinationSchedule(tenantId, petId);
            if (result.error) {
              setError(result.error);
              return;
            }
            setMessage(
              result.generated > 0
                ? `Added ${result.generated} to Health → Vaccinations`
                : "Already up to date"
            );
            router.refresh();
          })
        }
        className="text-xs text-primary hover:underline transition disabled:opacity-60 text-left"
      >
        {pending ? "Checking…" : "Suggest vaccination schedule"}
      </button>
      {message && <p className="text-[.68rem] text-good">{message}</p>}
      {error && <p className="text-[.68rem] text-coral">{error}</p>}
    </div>
  );
}
