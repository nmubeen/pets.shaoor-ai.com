import { redirect } from "next/navigation";

// Moved under Settings > Care as its own tab — this keeps the old URL
// working for anyone with it bookmarked/linked, rather than 404ing.
export default function ProvidersPage() {
  redirect("/app/settings/care/providers");
}
