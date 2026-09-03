import Link from "next/link";
import { Card, PetChip, StatTile } from "@/components/ui";
import { PlusIcon, StethoIcon, CartIcon } from "@/components/icons";
import { pets, healthVisits, shoppingOrders, workspace } from "@/lib/mock-data";

export default function AppHomePage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Good evening</h1>
          <p className="text-sm text-muted">
            {workspace.name} · {pets.length} pets &amp; habitats tracked
          </p>
        </div>
        <Link
          href="/app/pets"
          className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition"
        >
          <PlusIcon className="w-[.9em] h-[.9em]" />
          Add pet or habitat
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile num="₹2,140" label="Spent · 30d" />
        <StatTile num="3" label="Tasks due" />
        <StatTile num="1" label="Vaccine due soon" />
        <StatTile num={String(pets.length)} label="Pets & habitats" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg">Your household</h2>
          <Link href="/app/pets" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="flex flex-col gap-2.5">
          {pets.map((p) => (
            <PetChip
              key={p.id}
              name={p.name}
              sub={p.note}
              color={p.color}
              initials={p.initials}
              badge={p.badge}
            />
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <StethoIcon className="text-primary" />
              Recent health events
            </div>
            <Link href="/app/health" className="text-xs text-primary hover:underline">
              See all
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-line">
            {healthVisits.slice(0, 3).map((v, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="font-medium">{v.who}</div>
                  <div className="text-xs text-muted">{v.reason}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">{v.date}</span>
                  <span className="font-mono text-xs">{v.cost}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <CartIcon className="text-primary" />
              Recent shopping
            </div>
            <Link href="/app/shopping" className="text-xs text-primary hover:underline">
              See all
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-line">
            {shoppingOrders.slice(0, 3).map((o, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="font-medium">{o.item}</div>
                  <div className="text-xs text-muted">{o.scope}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">{o.date}</span>
                  <span className="font-mono text-xs">{o.cost}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
