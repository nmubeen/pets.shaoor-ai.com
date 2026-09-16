import { redirect } from "next/navigation";

// Care dissolved into individual Settings tiles — this keeps the old URL
// working for anyone with it bookmarked/linked, rather than 404ing.
export default function CareSettingsPage() {
  redirect("/app/settings");
}
