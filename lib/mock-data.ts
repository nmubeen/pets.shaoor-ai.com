// Sample data still standing in for the phases not yet built (shopping,
// gallery — §05/§06 of the roadmap). Tenancy, auth, pets/groups/habitats,
// and health records are real now — see lib/tenant.ts, lib/roster.ts,
// lib/health.ts.

export const shoppingOrders = [
  { date: "Aug 30", item: "Grain-free kibble, 5kg", scope: "Household", cost: "₹1,850" },
  { date: "Aug 22", item: "Reef salt mix", scope: "The Reef Tank", cost: "₹1,100" },
  { date: "Aug 14", item: "Kitten wet food, 24pk", scope: "Nova & Comet", cost: "₹960" },
];

export const galleryItems = [
  { id: 1, caption: "Simba on the windowsill", pet: "Simba", color: "var(--accent)" },
  { id: 2, caption: "Nova & Comet's first zoomies", pet: "Nova & Comet", color: "var(--coral)" },
  { id: 3, caption: "New coral frag placed", pet: "The Reef Tank", color: "var(--trial)" },
  { id: 4, caption: "Vet visit, all clear", pet: "Simba", color: "var(--accent)" },
  { id: 5, caption: "Kittens vs. the cat tree", pet: "Nova & Comet", color: "var(--coral)" },
  { id: 6, caption: "Water change day", pet: "The Reef Tank", color: "var(--trial)" },
];

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
      "1 caregiver seat",
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
      "3 caregiver seats",
      "Unlimited gallery",
    ],
    support: "Email support",
    dot: "var(--primary)",
    featured: false,
  },
  {
    name: "Sanctuary",
    forWhom: "Multi-species, multi-home, or multi-carer",
    price: "₹799",
    per: "/mo",
    note: "₹7,990/yr — two months free",
    features: [
      "Everything in Household",
      "Up to 3 locations under one workspace",
      "Unlimited caregiver seats",
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
    note: "Seat-based pricing, annual contract",
    features: [
      "Everything in Sanctuary",
      "Public adoption-ready pet profiles",
      "Staff roles & audit log",
      "API access",
    ],
    support: "Dedicated support",
    dot: "var(--org)",
    featured: false,
  },
];
