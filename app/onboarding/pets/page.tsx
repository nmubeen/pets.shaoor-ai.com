"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/marketing/AuthShell";
import { Btn, PetChip } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { pets } from "@/lib/mock-data";

export default function OnboardingPetsPage() {
  const router = useRouter();
  const [added] = useState(pets.slice(0, 2));

  return (
    <AuthShell
      step={2}
      title="Who lives here?"
      subtitle="Add as many pets and habitats as you like — you can always edit this later."
    >
      <div className="flex flex-col gap-2.5">
        {added.map((p) => (
          <PetChip
            key={p.id}
            name={p.name}
            sub={p.species}
            color={p.color}
            initials={p.initials}
          />
        ))}
        <button
          type="button"
          className="flex items-center justify-center gap-2 text-sm text-muted border border-dashed border-line rounded-lg px-3.5 py-3 hover:text-ink hover:border-primary transition"
        >
          <PlusIcon className="w-[.9em] h-[.9em]" />
          Add another pet or habitat
        </button>
      </div>

      <Btn onClick={() => router.push("/app")} className="w-full justify-center mt-6">
        Finish setup →
      </Btn>
      <p className="text-xs text-muted text-center mt-3">
        Groups and habitats are peers of individual pets — add a tank or a
        litter the same way you&rsquo;d add one animal.
      </p>
    </AuthShell>
  );
}
