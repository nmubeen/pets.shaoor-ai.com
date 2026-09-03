import { Card, Badge, Avatar } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { pets } from "@/lib/mock-data";

export default function PetsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Pets &amp; habitats</h1>
          <p className="text-sm text-muted">Every individual, group, and habitat in this workspace</p>
        </div>
        <button className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition">
          <PlusIcon className="w-[.9em] h-[.9em]" />
          Add pet or habitat
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pets.map((p) => (
          <Card key={p.id} className="p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <Avatar label={p.initials} color={p.color} />
              <Badge tone={p.badge.tone}>{p.badge.text}</Badge>
            </div>
            <div>
              <div className="font-semibold text-base">{p.name}</div>
              <div className="text-xs text-muted mt-0.5">{p.species}</div>
            </div>
            <div className="text-xs text-muted border-t border-line pt-3">{p.note}</div>
          </Card>
        ))}
        <button className="border border-dashed border-line rounded-[10px] flex flex-col items-center justify-center gap-2 text-muted hover:text-ink hover:border-primary transition min-h-[168px]">
          <PlusIcon className="text-[1.2em]" />
          <span className="text-sm">Add another</span>
        </button>
      </div>
    </div>
  );
}
