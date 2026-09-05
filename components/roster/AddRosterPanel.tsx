"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@/components/icons";
import { AddRosterForm } from "@/components/roster/AddRosterForm";

export function AddRosterPanel({
  tenantId,
  triggerClassName,
  triggerLabel = "Add pet or habitat",
  compact = false,
  fixedKind,
}: {
  tenantId: string;
  triggerClassName: string;
  triggerLabel?: string;
  compact?: boolean;
  /** Locks the form to this kind — see AddRosterForm. */
  fixedKind?: "pet" | "habitat";
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={triggerClassName}>
        <PlusIcon className="w-[.9em] h-[.9em]" />
        {triggerLabel}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AddRosterForm
        tenantId={tenantId}
        compact={compact}
        fixedKind={fixedKind}
        onDone={() => {
          setOpen(false);
          router.refresh();
        }}
      />
      <button onClick={() => setOpen(false)} className="text-xs text-muted hover:text-ink self-start">
        Cancel
      </button>
    </div>
  );
}
