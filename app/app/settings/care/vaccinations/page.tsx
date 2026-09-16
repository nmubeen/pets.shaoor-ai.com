import { redirect } from "next/navigation";

export default function VaccinationsRedirect() {
  redirect("/app/settings/vaccinations");
}
