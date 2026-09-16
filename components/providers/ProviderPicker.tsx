import Link from "next/link";
import type { Provider } from "@/lib/providers";
import { CATEGORY_LABEL } from "@/lib/provider-categories";

/**
 * A <select name="provider_id"> of existing providers — maintained at
 * Settings > Care > Providers (/app/settings/care/providers).
 *
 * Uncontrolled by default (pass `defaultValue` alone, e.g. when editing an
 * existing record); pass `value` + `onChange` instead to make it controlled
 * — VisitForm does, to look up service costs by provider as the selection
 * changes. Same pattern as PetPicker.
 */
export function ProviderPicker({
  providers,
  label = "Provider (optional)",
  name = "provider_id",
  defaultValue,
  value,
  onChange,
  required = false,
  homeOption = false,
}: {
  providers: Provider[];
  label?: string;
  name?: string;
  defaultValue?: string | null;
  value?: string;
  onChange?: (providerId: string) => void;
  required?: boolean;
  /** Adds a synthetic "At home" choice (value "home") at the top of the list, above the real providers — VisitForm's own opt-in, for services done without a physical provider (bathing, deworming, nail clipping, ...). "home" isn't a real provider id; lib/actions/health.ts's requireVisitProvider special-cases it into visits.at_home instead (see 0037_visit_at_home.sql). */
  homeOption?: boolean;
}) {
  const categories = [...new Set(providers.map((p) => p.category))];
  const grouped = categories.length > 1;
  const controlled = value !== undefined;

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">{label}</span>
      {providers.length === 0 && !homeOption ? (
        <p className="text-xs text-muted">
          None added yet —{" "}
          <Link href="/app/settings/care/providers" className="text-(--color-primary-text) hover:underline">
            add one
          </Link>
          .
        </p>
      ) : (
        <select
          name={name}
          required={required}
          {...(controlled ? { value } : { defaultValue: defaultValue ?? "" })}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
        >
          {!required && <option value="">None</option>}
          {required && (
            // Kept even with homeOption on — a controlled <select> with no
            // matching <option> falls back to the DOM selecting whatever
            // renders first, silently defaulting to "At home" rather than
            // actually enforcing a choice, without this disabled
            // placeholder to land on instead.
            <option value="" disabled>
              {homeOption ? "Choose a provider, or \"At home\"" : "Choose a provider"}
            </option>
          )}
          {homeOption && <option value="home">At home</option>}
          {grouped
            ? categories.map((c) => (
                <optgroup key={c} label={CATEGORY_LABEL[c]}>
                  {providers
                    .filter((p) => p.category === c)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              ))
            : providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
        </select>
      )}
    </label>
  );
}
