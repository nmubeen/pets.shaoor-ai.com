import Link from "next/link";
import { Card } from "@/components/ui";
import {
  ScissorsIcon,
  DropIcon,
  TagIcon,
  PinIcon,
  CartIcon,
  HomeIcon,
  InvoiceIcon,
} from "@/components/icons";

const TILES = [
  { href: "/app/settings/service-types", label: "Service Types", description: "Deworming, grooming, nail clipping — with optional reminder frequencies.", icon: ScissorsIcon },
  { href: "/app/settings/vaccinations", label: "Vaccinations", description: "Built-in and custom vaccination plans per species.", icon: DropIcon },
  { href: "/app/settings/shopping-categories", label: "Shopping Categories", description: "Food, toys, accessories — categorizes what you log in Shopping.", icon: TagIcon },
  { href: "/app/settings/hospitals", label: "Hospitals & Grooming Centers", description: "Vets and groomers you visit or log care with.", icon: PinIcon },
  { href: "/app/settings/shops", label: "Shopping (Online and Offline)", description: "Where you shop for your pets, online or in person.", icon: CartIcon },
  { href: "/app/settings/household", label: "Household", description: "Your household's name and who has access to it.", icon: HomeIcon },
  { href: "/app/settings/billing", label: "Billing", description: "Plan, usage, and payment details.", icon: InvoiceIcon },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl mb-1 text-(--color-primary-text)">Settings</h1>
        <p className="text-sm text-muted">Everything that configures how the workspace works, not the pets themselves.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="p-5 h-full hover:border-(--color-primary-text) transition flex flex-col gap-3">
              <span className="w-10 h-10 rounded-lg bg-(image:--gradient-secondary-bg) text-white flex items-center justify-center flex-none">
                <t.icon className="w-5 h-5" />
              </span>
              <div>
                <div className="font-semibold text-sm">{t.label}</div>
                <div className="text-xs text-muted mt-0.5">{t.description}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
