"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PetPicker } from "@/components/scope/PetPicker";
import { ProviderPicker } from "@/components/providers/ProviderPicker";
import { addVisit, updateVisit } from "@/lib/actions/health";
import { formatDate } from "@/lib/format";
import { openDatePicker } from "@/lib/dom";
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
  onCountChange,
  getSecondDefault,
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
  /** Reports the current row count up to the popup trigger's badge, whenever a row is added or removed. */
  onCountChange?: (count: number) => void;
  /** Looked up whenever a row's name changes and its second field is still blank — e.g. Services prefills the cost last charged for this same service at the currently selected provider. Never overwrites a value the person already typed. */
  getSecondDefault?: (name: string) => string | undefined;
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

  const filledCount = rows.filter((r) => r.name.trim() !== "").length;

  useEffect(() => {
    onCountChange?.(filledCount);
    // onCountChange is a fresh closure each render (it captures `setCounts`
    // via the parent's category key) — depending on filledCount alone is
    // deliberate, re-running it every render would be harmless but pointless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filledCount]);

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
              onChange={(e) => {
                const value = e.target.value;
                setRows((rs) =>
                  rs.map((r) => {
                    if (r.key !== row.key) return r;
                    const auto = r.second.trim() === "" ? getSecondDefault?.(value) : undefined;
                    return { ...r, name: value, ...(auto !== undefined ? { second: auto } : {}) };
                  })
                );
              }}
              className={`${field} flex-1`}
              placeholder={namePlaceholder}
            />
            {secondField && (
              <input
                type={secondField.type}
                name={secondField.name}
                min={secondField.type === "number" ? "0" : undefined}
                step={secondField.type === "number" ? "0.01" : undefined}
                value={row.second}
                onChange={(e) => {
                  const value = e.target.value;
                  setRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, second: value } : r)));
                }}
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
        className="text-xs text-(--color-primary-text) hover:underline self-start"
      >
        + {addLabel}
      </button>
    </div>
  );
}

/**
 * Wraps a RowList in a modal overlay, toggled purely by CSS (`hidden` vs.
 * `flex`) rather than conditional mounting — the RowList's own row state
 * and its named inputs must stay in the DOM (and thus in the enclosing
 * form's data) even while its popup is closed.
 */
function Popup({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={open ? "fixed inset-0 z-50 flex items-center justify-center p-4" : "hidden"}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-surface border border-line rounded-2xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[.72rem] font-semibold uppercase tracking-[.05em] text-(--color-primary-text)">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink text-lg leading-none" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type Panel = "services" | "vaccinations" | "illnesses" | "medications";

/** A popup trigger with a red notification-style badge showing its current row count. */
function PanelLink({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="relative inline-flex text-xs font-semibold uppercase tracking-[.05em] text-(--color-primary-text) hover:underline">
      {label}
      {count > 0 && (
        <span className="absolute -top-2 -right-3.5 min-w-4 h-4 px-1 rounded-full bg-coral text-white text-[.6rem] font-bold leading-4 text-center">
          {count}
        </span>
      )}
    </button>
  );
}

export function VisitForm({
  tenantId,
  roster,
  providers,
  serviceTypes,
  dueVaccinationNames,
  visits,
  onDone,
  editing,
  focusRowId,
}: {
  tenantId: string;
  roster: RosterItem[];
  providers: Provider[];
  serviceTypes: ServiceType[];
  dueVaccinationNames: string[];
  /** Every visit ever logged — used only to look up "what did this same service cost, last time it was done at this same provider" as services are named. */
  visits: VisitRow[];
  /** Called with the new visit's id when one was just created, so the list can jump to and highlight it — omitted on edit/cancel. */
  onDone: (createdId?: string) => void;
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

  const [visitDate, setVisitDate] = useState(editing?.dateIso ?? new Date().toISOString().slice(0, 10));
  const [providerId, setProviderId] = useState(editing?.atHome ? "home" : (editing?.providerId ?? ""));

  // "What did this exact service cost, last time it was done at this exact
  // provider" — keyed by provider + lower-cased service name, one entry per
  // pair, newest wins. `visits` already arrives sorted newest-first
  // (lib/health.ts's getVisits), so the first match seen for a key is kept.
  // "home" is a valid key here too — an at-home visit's own providerId is
  // null, so it's keyed by the same "home" pseudo-id the picker uses,
  // grouping every at-home service together the same way a real provider's
  // services are grouped.
  const serviceCostByProviderAndName = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of visits) {
      const key = v.atHome ? "home" : v.providerId;
      if (!key) continue;
      for (const s of v.services) {
        if (s.costValue === null) continue;
        const mapKey = `${key}::${s.name.trim().toLowerCase()}`;
        if (!map.has(mapKey)) map.set(mapKey, String(s.costValue));
      }
    }
    return map;
  }, [visits]);

  const getServiceCostDefault = (name: string): string | undefined => {
    if (!providerId || !name.trim()) return undefined;
    return serviceCostByProviderAndName.get(`${providerId}::${name.trim().toLowerCase()}`);
  };

  // Opens straight to whichever popup the deep-linking row belongs to
  // (see focusRowId's own doc comment) — Vaccinations/Illnesses/Medications
  // are the only categories reachable that way.
  const [openPanel, setOpenPanel] = useState<Panel | null>(() => {
    if (!focusRowId) return null;
    if (editing?.vaccinations.some((v) => v.id === focusRowId)) return "vaccinations";
    if (editing?.illnesses.some((i) => i.id === focusRowId)) return "illnesses";
    if (editing?.medications.some((m) => m.id === focusRowId)) return "medications";
    return null;
  });

  const defaultServiceRows = editing
    ? editing.services.map((s) => ({ id: s.id, name: s.name, second: s.costValue !== null ? String(s.costValue) : "" }))
    : [
        { id: "", name: "Consultation", second: "" },
        { id: "", name: "", second: "" },
      ];

  // Mirrors each RowList's own *filled* row count (blank placeholder rows
  // don't count), purely to badge its popup trigger — initialized
  // synchronously (not just from RowList's mount effect) so the badge is
  // right on first paint, not a frame late.
  const [counts, setCounts] = useState<Record<Panel, number>>({
    services: editing ? editing.services.length : 1, // the seeded "Consultation" row
    vaccinations: editing?.vaccinations.length ?? 0,
    illnesses: editing?.illnesses.length ?? 0,
    medications: editing?.medications.length ?? 0,
  });

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      // Split rather than a shared `result` — addVisit's success shape
      // carries an `id` (so the list can jump to it) that updateVisit's
      // doesn't, and a single ternary'd result variable can't narrow to
      // that per-branch.
      if (editing) {
        const result = await updateVisit(tenantId, editing.id, formData);
        if (result.error !== null) {
          setError(result.error);
          return;
        }
        router.refresh();
        onDone();
      } else {
        const result = await addVisit(tenantId, formData);
        // !== null, not a truthy check — TS otherwise can't rule out the
        // {error: string} branch here (an empty string is falsy but still
        // a string, not null), so `result.id` below wouldn't narrow.
        if (result.error !== null) {
          setError(result.error);
          return;
        }
        router.refresh();
        onDone(result.id);
      }
    });
  }

  return (
    <Card className="p-5 bg-(image:--gradient-form-bg)">
      <form action={handleSubmit} className="flex flex-col gap-3">
        <PetPicker roster={roster} value={petId} onChange={setPetId} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Date</span>
            <div className="relative">
              <input
                type="date"
                name="visit_date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                onClick={openDatePicker}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className={`${field} flex items-center pointer-events-none`}>
                {visitDate ? formatDate(new Date(`${visitDate}T00:00:00`)) : <span className="text-muted">dd-mmm-yyyy</span>}
              </div>
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Weight, kg (optional)</span>
            <input
              type="number"
              name="weight_kg"
              min="0"
              step="0.01"
              defaultValue={editing?.weightKg ?? undefined}
              className={field}
              placeholder="4.20"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Temperature, °F (optional)</span>
            <input
              type="number"
              name="temperature_f"
              min="0"
              step="0.1"
              defaultValue={editing?.temperatureF ?? undefined}
              className={field}
              placeholder="101.5"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Reason</span>
          <input
            name="reason"
            required
            defaultValue={editing?.reason ?? "Consultation"}
            className={field}
            placeholder="Wellness check"
            // Not when focusRowId is set — that deep-links to a specific
            // vaccination/illness/medication row inside a popup instead,
            // and that focus (RowList's own mount effect) should win.
            autoFocus={!focusRowId}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ProviderPicker
            providers={providers}
            label="Vet / hospital / groomer"
            value={providerId}
            onChange={setProviderId}
            required
            homeOption
          />
          <label className="flex flex-col gap-1.5">
            <span className={label}>Consulting doctor (optional)</span>
            <input name="vet_name" defaultValue={editing?.doctor ?? ""} className={field} placeholder="Dr. Mehta" />
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={label}>Additional details (optional)</span>
          <div className="flex flex-wrap gap-5">
            <PanelLink label="Services" count={counts.services} onClick={() => setOpenPanel("services")} />
            <PanelLink label="Vaccinations" count={counts.vaccinations} onClick={() => setOpenPanel("vaccinations")} />
            <PanelLink label="Illnesses" count={counts.illnesses} onClick={() => setOpenPanel("illnesses")} />
            <PanelLink label="Medications" count={counts.medications} onClick={() => setOpenPanel("medications")} />
          </div>
        </div>

        <Popup open={openPanel === "services"} onClose={() => setOpenPanel(null)} title="Services">
          <RowList
            title="Services (optional — cost totals up automatically)"
            addLabel="Add service"
            idField="service_id"
            nameField="service_name"
            namePlaceholder="Deworming"
            datalistId="service-suggestions"
            suggestions={serviceSuggestions}
            secondField={{ name: "service_cost", type: "number", placeholder: "Cost" }}
            initialRows={defaultServiceRows}
            onCountChange={(n) => setCounts((c) => ({ ...c, services: n }))}
            getSecondDefault={getServiceCostDefault}
          />
        </Popup>

        <Popup open={openPanel === "vaccinations"} onClose={() => setOpenPanel(null)} title="Vaccinations">
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
            minRows={1}
            focusId={focusRowId}
            onCountChange={(n) => setCounts((c) => ({ ...c, vaccinations: n }))}
          />
        </Popup>

        <Popup open={openPanel === "illnesses"} onClose={() => setOpenPanel(null)} title="Illnesses">
          <RowList
            title="Illnesses diagnosed (optional)"
            addLabel="Add illness"
            idField="illness_id"
            nameField="illness_name"
            namePlaceholder="Ear infection"
            initialRows={editing?.illnesses.map((i) => ({ id: i.id, name: i.name, second: null }))}
            minRows={1}
            focusId={focusRowId}
            onCountChange={(n) => setCounts((c) => ({ ...c, illnesses: n }))}
          />
        </Popup>

        <Popup open={openPanel === "medications"} onClose={() => setOpenPanel(null)} title="Medications">
          <RowList
            title="Medications prescribed (optional)"
            addLabel="Add medication"
            idField="medication_id"
            nameField="medication_name"
            namePlaceholder="Amoxicillin"
            secondField={{ name: "medication_dosage", type: "text", placeholder: "Dosage" }}
            initialRows={editing?.medications.map((m) => ({ id: m.id, name: m.name, second: m.dosage }))}
            minRows={1}
            focusId={focusRowId}
            onCountChange={(n) => setCounts((c) => ({ ...c, medications: n }))}
          />
        </Popup>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Notes (optional)</span>
          <input name="notes" defaultValue={editing?.notes ?? ""} className={field} placeholder="" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Prescription photo (optional)</span>
          {editing && <input type="hidden" name="current_prescription_photo_path" value={editing.prescriptionPhotoPath ?? ""} />}
          <input
            type="file"
            name="prescription_photo"
            accept="image/jpeg,image/png,image/webp,image/gif"
            capture="environment"
            className={`${field} file:mr-3 file:border-0 file:bg-surface-2 file:text-ink file:rounded-md file:px-2.5 file:py-1 file:text-xs`}
          />
          {editing?.prescriptionPhotoUrl && (
            <div className="mt-2">
              <label className="flex items-center gap-1.5 text-xs text-muted mb-2">
                <input type="checkbox" name="remove_prescription_photo" className="accent-coral" />
                Remove current photo
              </label>
              <a href={editing.prescriptionPhotoUrl} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editing.prescriptionPhotoUrl}
                  alt="Current prescription"
                  className="w-full max-h-[70vh] object-contain rounded-lg border border-line bg-paper"
                />
              </a>
            </div>
          )}
        </label>

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-(image:--gradient-button-bg) text-white px-4 py-2.5 rounded-lg hover:brightness-110 transition disabled:opacity-60"
          >
            {pending ? "Saving…" : editing ? "Save changes" : "Save"}
          </button>
          <button type="button" onClick={() => onDone()} className="text-xs text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
