"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui";
import { addPet, addGroup, addHabitat } from "@/lib/actions/roster";

type Kind = "pet" | "group" | "habitat";

export function AddRosterForm({ tenantId, onDone }: { tenantId: string; onDone?: () => void }) {
  const [kind, setKind] = useState<Kind>("pet");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const action = kind === "pet" ? addPet : kind === "group" ? addGroup : addHabitat;
      const result = await action(tenantId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onDone?.();
    });
  }

  return (
    <Card className="p-5">
      <div className="flex gap-2 mb-4">
        {(["pet", "group", "habitat"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
              kind === k
                ? "bg-primary text-primary-ink border-primary"
                : "bg-transparent text-muted border-line hover:text-ink"
            }`}
          >
            {k === "pet" ? "Individual pet" : k === "group" ? "Group" : "Habitat"}
          </button>
        ))}
      </div>

      <form action={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Name</span>
          <input
            name="name"
            required
            className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
            placeholder={kind === "habitat" ? "The Reef Tank" : kind === "group" ? "Nova & Comet" : "Simba"}
          />
        </label>

        {kind !== "habitat" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Species</span>
            <input
              name="species"
              required={kind === "pet"}
              className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
              placeholder="Persian cat"
            />
          </label>
        )}

        {kind === "pet" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">
              Life stage (optional)
            </span>
            <input
              name="life_stage"
              className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
              placeholder="Adult cat"
            />
          </label>
        )}

        {kind === "habitat" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Type</span>
              <input
                name="habitat_type"
                required
                className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
                placeholder="Aquarium"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">
                Capacity note (optional)
              </span>
              <input
                name="capacity_note"
                className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
                placeholder="40 gal"
              />
            </label>
          </>
        )}

        {error && <p className="text-xs text-coral">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition disabled:opacity-60 mt-1"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </form>
    </Card>
  );
}
