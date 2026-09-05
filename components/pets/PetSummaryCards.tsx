import { Card } from "@/components/ui";
import { CheckIcon } from "@/components/icons";
import type { RosterItem } from "@/lib/roster";

function CardBody({ r, selected }: { r: RosterItem; selected: boolean }) {
  return (
    <>
      <div className="w-full aspect-[4/3] relative">
        {r.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.photoUrl} alt={r.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ background: r.color }}
          >
            {r.initials}
          </div>
        )}
        {selected && (
          <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-ink shadow">
            <CheckIcon className="w-3 h-3" strokeWidth={3} />
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="font-semibold text-sm truncate">{r.name}</div>
        <div className="text-xs text-muted truncate">{r.subtitle}</div>
      </div>
    </>
  );
}

/**
 * A read-only pet card grid — photo, name, subtitle, nothing else. No
 * Edit/Delete, no Health quick-links, no adoption toggle: used wherever a
 * viewer should see the roster but never manage it (the Social role's own
 * /app/pets, and Vet View's pet chooser). Larger cards and a 2-column
 * floor (rather than PetsGrid's list-like single row) since this is
 * meant to be tapped on a phone, not scanned on a desktop grid.
 */
export function PetSummaryCards({
  pets,
  selectedId,
  onSelect,
}: {
  pets: RosterItem[];
  /** Highlights the matching card — set together with onSelect for a tappable chooser (Vet View); omit both for a plain static grid (Social's /app/pets). */
  selectedId?: string;
  onSelect?: (petId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {pets.map((r) => {
        const isSelected = selectedId === r.id;
        return onSelect ? (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            className="text-left rounded-[10px] transition"
          >
            <Card
              className={`p-0 overflow-hidden transition ${
                isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-paper shadow-md" : "opacity-85 hover:opacity-100"
              }`}
            >
              <CardBody r={r} selected={isSelected} />
            </Card>
          </button>
        ) : (
          <Card key={r.id} className="p-0 overflow-hidden">
            <CardBody r={r} selected={false} />
          </Card>
        );
      })}
    </div>
  );
}
