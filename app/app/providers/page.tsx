import { redirect } from "next/navigation";

// Moved under Settings, then split into two pages (Hospitals & Grooming /
// Shopping) — this keeps the old URL working rather than 404ing.
export default function ProvidersPage() {
  redirect("/app/settings/hospitals");
}
