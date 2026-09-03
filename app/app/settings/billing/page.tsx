import { Card, Badge } from "@/components/ui";
import { workspace, pets } from "@/lib/mock-data";

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl mb-1">Billing</h1>
        <p className="text-sm text-muted">{workspace.name} · owner: you</p>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 font-semibold text-base">
              {workspace.plan} <Badge tone="trial">trial</Badge>
            </div>
            <div className="text-xs text-muted mt-1">
              Ends {workspace.trialEndsOn} · then ₹799/mo
            </div>
          </div>
          <button className="bg-primary text-primary-ink text-sm font-semibold px-4 py-2.5 rounded-lg hover:brightness-110 transition">
            Add card
          </button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-4">Usage against your plan</h2>
        <div className="flex flex-col divide-y divide-line">
          <div className="flex justify-between py-2.5 text-sm">
            <span className="text-muted">Pets used</span>
            <span className="font-mono">{pets.length} of unlimited</span>
          </div>
          <div className="flex justify-between py-2.5 text-sm">
            <span className="text-muted">Seats used</span>
            <span className="font-mono">2 of unlimited</span>
          </div>
          <div className="flex justify-between py-2.5 text-sm">
            <span className="text-muted">Locations</span>
            <span className="font-mono">1 of 3</span>
          </div>
        </div>
      </Card>

      <button className="self-start text-sm text-muted border border-line rounded-lg px-4 py-2.5 hover:text-ink hover:bg-surface-2 transition">
        Manage in Stripe portal →
      </button>

      <p className="text-xs text-muted">
        Subscription changes, invoices, and cancellation all happen through
        Stripe&rsquo;s own Customer Portal — Menagerie never stores your card
        details directly.
      </p>
    </div>
  );
}
