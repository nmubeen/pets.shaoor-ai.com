import { redirect } from "next/navigation";

// Service Types and Vaccinations are two separate pages now (see
// service-types/ and vaccinations/) — this bare /app/settings/care lands
// on the first of them, same as visiting a settings section with no
// sub-page picked yet.
export default function CareSettingsPage() {
  redirect("/app/settings/care/service-types");
}
