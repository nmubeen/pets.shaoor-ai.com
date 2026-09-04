import Link from "next/link";
import { Card, StatTile } from "@/components/ui";
import { PlusIcon, StethoIcon, CartIcon } from "@/components/icons";
import { requireActiveMembership } from "@/lib/tenant";
import { getRoster } from "@/lib/roster";
import { getVisits, getVaccinations } from "@/lib/health";
import { getShoppingOrders, getSpendSummary } from "@/lib/shopping";
import { getOpenCareTasks } from "@/lib/tasks";
import { TasksCard } from "@/components/tasks/TasksCard";
import { formatCurrency } from "@/lib/format";

export default async function AppHomePage() {
  const { supabase, active } = await requireActiveMembership();
  const [roster, visits, vaccinations, orders, summary, tasks] = await Promise.all([
    getRoster(supabase, active.tenantId),
    getVisits(supabase, active.tenantId),
    getVaccinations(supabase, active.tenantId),
    getShoppingOrders(supabase, active.tenantId),
    getSpendSummary(supabase, active.tenantId),
    getOpenCareTasks(supabase, active.tenantId),
  ]);
  const vaccinesDueSoon = vaccinations.filter((v) => v.status !== "Complete").length;
  const tasksDue = tasks.filter((t) => t.overdue).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Good evening</h1>
          <p className="text-sm text-muted">
            {active.tenantName} · {roster.length} pet{roster.length === 1 ? "" : "s"} &amp; habitats tracked
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
        <StatTile num={formatCurrency(summary.spentLast30d) ?? "—"} label="Spent · 30d" />
        <StatTile num={String(tasksDue)} label="Tasks due" />
        <StatTile num={String(vaccinesDueSoon)} label="Vaccines due" />
        <StatTile num={String(roster.length)} label="Pets & habitats" />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
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
          {visits.length === 0 ? (
            <p className="text-sm text-muted">
              No visits logged yet —{" "}
              <Link href="/app/health" className="text-primary hover:underline">
                log one
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-line">
              {visits.slice(0, 3).map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <div className="font-medium">{v.who}</div>
                    <div className="text-xs text-muted">{v.reason}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">{v.date}</span>
                    <span className="font-mono text-xs">{v.cost ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
          {orders.length === 0 ? (
            <p className="text-sm text-muted">
              No orders logged yet —{" "}
              <Link href="/app/shopping" className="text-primary hover:underline">
                log one
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-line">
              {orders.slice(0, 3).map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <div className="font-medium">{o.item}</div>
                    <div className="text-xs text-muted">{o.scope}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">{o.orderedDate}</span>
                    <span className="font-mono text-xs">{o.cost ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <TasksCard tenantId={active.tenantId} roster={roster} tasks={tasks} />
      </div>
    </div>
  );
}
