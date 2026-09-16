// The pricing tiers here are still the only "mock data" left in the app —
// static marketing copy for the public /pricing page, not a stand-in for a
// backend. Every other domain (tenancy, auth, pets/groups/habitats, health,
// shopping/tasks, gallery/comments) is real now — see lib/tenant.ts,
// lib/roster.ts, lib/health.ts, lib/shopping.ts, lib/tasks.ts, lib/gallery.ts.

export const tiers = [
  {
    name: "Litter",
    forWhom: "Free, forever · one pet parent",
    price: "₹0",
    per: "/mo",
    note: "Where every trial lands after 14 days if it doesn't convert",
    features: [
      "Up to 3 pets or habitats",
      "Health, vaccination & grooming history",
      "90-day gallery retention",
    ],
    support: "Community support",
    dot: "var(--muted)",
    featured: false,
  },
  {
    name: "Household",
    forWhom: "One home, every pet in it",
    price: "₹349",
    per: "/mo",
    note: "₹3,490/yr — two months free",
    features: [
      "Unlimited pets & habitats, one workspace",
      "Shopping orders & expense reporting",
      "Vet directory with hours & map",
      "Unlimited gallery",
    ],
    support: "Email support",
    dot: "var(--primary)",
    featured: false,
  },
  {
    name: "Sanctuary",
    forWhom: "For larger, multi-species collections",
    price: "₹799",
    per: "/mo",
    note: "₹7,990/yr — two months free",
    features: [
      "Everything in Household",
      "Up to 3 locations under one workspace",
      "Vaccination & reminder automations",
      "CSV / PDF data export",
    ],
    support: "Priority support",
    dot: "var(--accent)",
    featured: true,
    tag: "14-day trial default",
  },
  {
    name: "Rescue & Shelter",
    forWhom: "Organizations, not households",
    price: "Talk to us",
    per: "",
    note: "Custom pricing, annual contract",
    features: [
      "Everything in Sanctuary",
      "Public adoption-ready pet profiles",
      "API access",
    ],
    support: "Dedicated support",
    dot: "var(--org)",
    featured: false,
  },
];
