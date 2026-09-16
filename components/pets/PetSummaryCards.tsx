import { Card } from "@/components/ui";
import { CheckIcon } from "@/components/icons";
import type { RosterItem } from "@/lib/roster";

function CardBody({ r, selected, showSubtitle }: { r: RosterItem; selected: boolean; showSubtitle: boolean }) {
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
          <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-(image:--gradient-secondary-bg) text-white shadow">
            <CheckIcon className="w-3 h-3" strokeWidth={3} />
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="font-semibold text-sm truncate">{r.name}</div>
        {showSubtitle && <div className="text-xs text-muted truncate">{r.subtitle}</div>}
      </div>
    </>
  );
}

/** Compact pet chooser for the health summary. */
export function PetSummaryCards({
  pets,
  selectedId,
  onSelect,
  showSubtitle = true,
}: {
  pets: RosterItem[];
  /** Highlights the matching card — set together with onSelect for a tappable chooser (Vet View); omit both for a plain static grid (Social's /app/pets). */
  selectedId?: string;
  onSelect?: (petId: string) => void;
  /** Vet View wants just the name on its cards — the breed/species/age/gender line lives in its own header below the grid instead, so repeating it here is redundant. Defaults to true (Social's /app/pets keeps the subtitle, its only identifying text on the card). */
  showSubtitle?: boolean;
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
              <CardBody r={r} selected={isSelected} showSubtitle={showSubtitle} />
            </Card>
          </button>
        ) : (
          <Card key={r.id} className="p-0 overflow-hidden">
            <CardBody r={r} selected={false} showSubtitle={showSubtitle} />
          </Card>
        );
      })}
    </div>
  );
}
