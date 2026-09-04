// Split out from lib/providers.ts (which has "import server-only") so
// client components can use this constant without pulling in server-only
// code — Next.js poisons the whole module for any importer, not just the
// parts that actually touch the database.
import type { ServiceProviderCategory } from "@/lib/database.types";

export const CATEGORY_LABEL: Record<ServiceProviderCategory, string> = {
  vet: "Vets / Hospitals",
  grooming: "Grooming Centers",
  offline_shop: "Offline Shops",
  online_shop: "Online Shops",
};
