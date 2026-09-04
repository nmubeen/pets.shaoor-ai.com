"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui";
import { addPet, addGroup, addHabitat, updatePet, updateGroup, updateHabitat } from "@/lib/actions/roster";
import type { RosterItem } from "@/lib/roster";

type Kind = "pet" | "group" | "habitat";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

export function AddRosterForm({
  tenantId,
  onDone,
  compact = false,
  mode = "add",
  initial,
}: {
  tenantId: string;
  onDone?: () => void;
  /** Onboarding uses the quick 3-field version; /app/pets gets the full pet record. */
  compact?: boolean;
  mode?: "add" | "edit";
  /** Required when mode is "edit" — the existing item to pre-fill and update. */
  initial?: RosterItem;
}) {
  const [kind, setKind] = useState<Kind>(initial?.kind ?? "pet");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const action =
        mode === "edit" && initial
          ? kind === "pet"
            ? (fd: FormData) => updatePet(tenantId, initial.id, fd)
            : kind === "group"
              ? (fd: FormData) => updateGroup(tenantId, initial.id, fd)
              : (fd: FormData) => updateHabitat(tenantId, initial.id, fd)
          : kind === "pet"
            ? (fd: FormData) => addPet(tenantId, fd)
            : kind === "group"
              ? (fd: FormData) => addGroup(tenantId, fd)
              : (fd: FormData) => addHabitat(tenantId, fd);

      const result = await action(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onDone?.();
    });
  }

  const pet = initial?.pet;

  return (
    <Card className="p-5">
      {mode === "add" && (
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
      )}

      <form action={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Name</span>
          <input
            name="name"
            required
            defaultValue={initial?.name}
            className={field}
            placeholder={kind === "habitat" ? "The Reef Tank" : kind === "group" ? "Nova & Comet" : "Simba"}
          />
        </label>

        {kind !== "habitat" && (
          <label className="flex flex-col gap-1.5">
            <span className={label}>Species</span>
            <input
              name="species"
              required={kind === "pet"}
              defaultValue={initial?.species ?? ""}
              className={field}
              placeholder="Persian cat"
            />
          </label>
        )}

        {kind === "pet" && !compact && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={label}>Breed (optional)</span>
                <input name="breed" defaultValue={pet?.breed ?? ""} className={field} placeholder="Persian" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Sex</span>
                <select name="sex" defaultValue={pet?.sex ?? "unknown"} className={field}>
                  <option value="unknown">Unknown</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={label}>Birth date (optional)</span>
                <input type="date" name="birth_date" defaultValue={pet?.birthDate ?? ""} className={field} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Life stage (optional)</span>
                <input
                  name="life_stage"
                  defaultValue={pet?.lifeStage ?? ""}
                  className={field}
                  placeholder="Adult cat"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={label}>Weight, kg (optional)</span>
                <input
                  type="number"
                  name="weight_kg"
                  min="0"
                  step="0.1"
                  defaultValue={pet?.weightKg ?? ""}
                  className={field}
                  placeholder="4.2"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Spayed / neutered</span>
                <select
                  name="neutered"
                  defaultValue={pet?.neutered === true ? "yes" : pet?.neutered === false ? "no" : "unknown"}
                  className={field}
                >
                  <option value="unknown">Unknown</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={label}>Color / markings (optional)</span>
                <input name="color" defaultValue={pet?.color ?? ""} className={field} placeholder="Cream & white" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Microchip ID (optional)</span>
                <input name="microchip_id" defaultValue={pet?.microchipId ?? ""} className={field} />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className={label}>Notes (optional)</span>
              <textarea
                name="notes"
                defaultValue={pet?.notes ?? ""}
                rows={2}
                className={`${field} resize-none`}
                placeholder="Anything else worth remembering"
              />
            </label>
          </>
        )}

        {kind === "pet" && compact && (
          <label className="flex flex-col gap-1.5">
            <span className={label}>Life stage (optional)</span>
            <input name="life_stage" defaultValue={pet?.lifeStage ?? ""} className={field} placeholder="Adult cat" />
          </label>
        )}

        {kind === "habitat" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Type</span>
              <input
                name="habitat_type"
                required
                defaultValue={initial?.habitatType ?? ""}
                className={field}
                placeholder="Aquarium"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Capacity note (optional)</span>
              <input
                name="capacity_note"
                defaultValue={initial?.capacityNote ?? ""}
                className={field}
                placeholder="40 gal"
              />
            </label>
          </>
        )}

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition disabled:opacity-60"
          >
            {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Add"}
          </button>
          {mode === "edit" && (
            <button type="button" onClick={onDone} className="text-xs text-muted hover:text-ink">
              Cancel
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
