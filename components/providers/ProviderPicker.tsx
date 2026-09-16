import Link from "next/link";
import type { Provider } from "@/lib/providers";
import { CATEGORY_LABEL } from "@/lib/provider-categories";

/**
 * A <select name="provider_id"> of existing providers — maintained at
 * /app/providers.
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
}: {
  providers: Provider[];
  label?: string;
  name?: string;
  defaultValue?: string | null;
  value?: string;
  onChange?: (providerId: string) => void;
}) {
  const categories = [...new Set(providers.map((p) => p.category))];
  const grouped = categories.length > 1;
  const controlled = value !== undefined;

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">{label}</span>
      {providers.length === 0 ? (
        <p className="text-xs text-muted">
          None added yet —{" "}
          <Link href="/app/providers" className="text-(--color-primary-text) hover:underline">
            add one
          </Link>
          .
        </p>
      ) : (
        <select
          name={name}
          {...(controlled ? { value } : { defaultValue: defaultValue ?? "" })}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
        >
          <option value="">None</option>
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
