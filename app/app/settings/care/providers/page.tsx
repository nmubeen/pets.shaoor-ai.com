import { redirect } from "next/navigation";

// Providers split into two pages (Hospitals & Grooming / Shopping) — this
// lands on the first rather than 404ing for anyone with the old URL.
export default function ProvidersRedirect() {
  redirect("/app/settings/hospitals");
}
