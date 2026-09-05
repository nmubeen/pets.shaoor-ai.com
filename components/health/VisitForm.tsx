"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PetPicker } from "@/components/scope/PetPicker";
import { ProviderPicker } from "@/components/providers/ProviderPicker";
import { addVisit, updateVisit } from "@/lib/actions/health";
import type { RosterItem } from "@/lib/roster";
import type { Provider } from "@/lib/providers";
import type { ServiceType } from "@/lib/care-services";
import type { VisitRow } from "@/lib/health";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

type Row = { key: number; id?: string; name: string; second: string };

/**
 * One multi-row list — services, vaccinations given, illnesses diagnosed,
 * or medications prescribed, all captured the same way on a visit. Each
 * row carries a hidden id (when it's an existing linked record being
 * edited) alongside its name/second-field inputs, so updateVisit can tell
 * "unchanged", "edited", "removed" (unlinked, not deleted, for anything
 * with its own lifecycle) and "new" (fully inserted, same as addVisit)
 * apart — see its comment for why that distinction matters.
 */
function RowList({
  title,
  addLabel,
  idField,
  nameField,
  namePlaceholder,
  datalistId,
  suggestions,
  secondField,
  initialRows,
  minRows = 1,
  focusId,
}: {
  title: string;
  addLabel: string;
  idField: string;
  nameField: string;
  namePlaceholder: string;
  datalistId?: string;
  suggestions?: string[];
  /** Second column — cost (services/vaccinations) or dosage (medications). Omitted entirely for illnesses. */
  secondField?: { name: string; type: "number" | "text"; placeholder: string };
  /** Pre-populated rows when editing an existing visit — each with the real record's id so updateVisit can diff against it. */
  initialRows?: { id: string; name: string; second: string | null }[];
  minRows?: number;
  /** Real record id to scroll into view and focus on mount — set when this visit was opened via another row's "Edit (in visit)" link. */
  focusId?: string | null;
}) {
  const seeded = initialRows && initialRows.length > 0;
  const [rows, setRows] = useState<Row[]>(() =>
    seeded
      ? initialRows!.map((r, i) => ({ key: i, id: r.id, name: r.name, second: r.second ?? "" }))
      : Array.from({ length: minRows }, (_, i) => ({ key: i, name: "", second: "" }))
  );
  const [nextKey, setNextKey] = useState(rows.length);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (!focusId) return;
    const el = rowRefs.current.get(focusId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.querySelector<HTMLInputElement>("input:not([type=hidden])")?.focus();
    // Runs once on mount — VisitForm is remounted (via its `key`) whenever
    // the target visit or focus row changes, so this never needs to re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <span className={label}>{title}</span>
      {datalistId && suggestions && (
        <datalist id={datalistId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.key}
            ref={(el) => {
              if (!row.id) return;
              if (el) rowRefs.current.set(row.id, el);
              else rowRefs.current.delete(row.id);
            }}
            className={`flex gap-2 items-center rounded-lg transition ${
              row.id && row.id === focusId ? "ring-2 ring-primary ring-offset-2" : ""
            }`}
          >
            {row.id && <input type="hidden" name={idField} value={row.id} />}
            <input
              name={nameField}
              list={datalistId}
              defaultValue={row.name}
              className={`${field} flex-1`}
              placeholder={namePlaceholder}
            />
            {secondField && (
              <input
                type={secondField.type}
                name={secondField.name}
                min={secondField.type === "number" ? "0" : undefined}
                step={secondField.type === "number" ? "0.01" : undefined}
                defaultValue={row.second}
                className={`${field} w-28 flex-none`}
                placeholder={secondField.placeholder}
              />
            )}
            <button
              type="button"
              onClick={() => setRows((r) => r.filter((k) => k.key !== row.key))}
              className="text-xs text-muted hover:text-coral transition flex-none px-1"
              aria-label="Remove row"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setRows((r) => [...r, { key: nextKey, name: "", second: "" }]);
          setNextKey((k) => k + 1);
        }}
        className="text-xs text-primary hover:underline self-start"
      >
        + {addLabel}
      </button>
    </div>
  );
}

export function VisitForm({
  tenantId,
  roster,
  providers,
  serviceTypes,
  dueVaccinationNames,
  onDone,
  editing,
  focusRowId,
}: {
  tenantId: string;
  roster: RosterItem[];
  providers: Provider[];
  serviceTypes: ServiceType[];
  dueVaccinationNames: string[];
  onDone: () => void;
  /** Present when editing an existing visit instead of logging a new one — every line item below is editable too, not just the visit's own fields. */
  editing?: VisitRow;
  /** A vaccination/illness/medication record id to scroll to and focus — set when this form was opened via that row's "Edit (in visit)" link rather than the visit's own Edit button. */
  focusRowId?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const pets = roster.filter((r) => r.kind === "pet");
  const [petId, setPetId] = useState(editing?.petId ?? pets[0]?.id ?? "");
  const selectedSpecies = pets.find((p) => p.id === petId)?.pet?.species ?? null;
  // Species-scoped services first (frequency often differs by species),
  // plus generic ones that apply to any — see findOrCreateServiceType.
  const serviceSuggestions = serviceTypes
    .filter((s) => s.species === null || s.species === selectedSpecies)
    .map((s) => s.name);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = editing ? await updateVisit(tenantId, editing.id, formData) : await addVisit(tenantId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <Card className="p-5">
      <form action={handleSubmit} className="flex flex-col gap-3">
        <PetPicker roster={roster} value={petId} onChange={setPetId} />

        <label className="flex flex-col gap-1.5">
          <span className={label}>Reason</span>
          <input name="reason" required defaultValue={editing?.reason} className={field} placeholder="Wellness check" />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ProviderPicker providers={providers} label="Vet / hospital / groomer (optional)" defaultValue={editing?.providerId} />
          <label className="flex flex-col gap-1.5">
            <span className={label}>Consulting doctor (optional)</span>
            <input name="vet_name" defaultValue={editing?.doctor ?? ""} className={field} placeholder="Dr. Mehta" />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Date</span>
            <input
              type="date"
              name="visit_date"
              className={field}
              defaultValue={editing?.dateIso ?? new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Weight, kg (optional)</span>
            <input
              type="number"
              name="weight_kg"
              min="0"
              step="0.1"
              defaultValue={editing?.weightKg ?? undefined}
              className={field}
              placeholder="4.2"
            />
          </label>
        </div>

        <RowList
          title="Services (optional — cost totals up automatically)"
          addLabel="Add service"
          idField="service_id"
          nameField="service_name"
          namePlaceholder="Deworming"
          datalistId="service-suggestions"
          suggestions={serviceSuggestions}
          secondField={{ name: "service_cost", type: "number", placeholder: "Cost" }}
          initialRows={editing?.services.map((s) => ({ id: s.id, name: s.name, second: s.costValue !== null ? String(s.costValue) : "" }))}
          minRows={1}
        />

        <RowList
          title="Vaccinations given (optional)"
          addLabel="Add vaccine"
          idField="vaccine_id"
          nameField="vaccine_name"
          namePlaceholder="DHPP booster"
          datalistId="vaccine-suggestions"
          suggestions={dueVaccinationNames}
          secondField={{ name: "vaccine_cost", type: "number", placeholder: "Cost" }}
          initialRows={editing?.vaccinations.map((v) => ({ id: v.id, name: v.name, second: v.costValue !== null ? String(v.costValue) : "" }))}
          minRows={0}
          focusId={focusRowId}
        />

        <RowList
          title="Illnesses diagnosed (optional)"
          addLabel="Add illness"
          idField="illness_id"
          nameField="illness_name"
          namePlaceholder="Ear infection"
          initialRows={editing?.illnesses.map((i) => ({ id: i.id, name: i.name, second: null }))}
          minRows={0}
          focusId={focusRowId}
        />

        <RowList
          title="Medications prescribed (optional)"
          addLabel="Add medication"
          idField="medication_id"
          nameField="medication_name"
          namePlaceholder="Amoxicillin"
          secondField={{ name: "medication_dosage", type: "text", placeholder: "Dosage" }}
          initialRows={editing?.medications.map((m) => ({ id: m.id, name: m.name, second: m.dosage }))}
          minRows={0}
          focusId={focusRowId}
        />

        <label className="flex flex-col gap-1.5">
          <span className={label}>Notes (optional)</span>
          <input name="notes" defaultValue={editing?.notes ?? ""} className={field} placeholder="" />
        </label>

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition disabled:opacity-60"
          >
            {pending ? "Saving…" : editing ? "Save changes" : "Save"}
          </button>
          <button type="button" onClick={onDone} className="text-xs text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
