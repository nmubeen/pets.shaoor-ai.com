import Link from "next/link";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Card, Eyebrow } from "@/components/ui";
import { listAdoptablePets } from "@/lib/adoption";
import { SPECIES_LABEL } from "@/lib/species-labels";

export const metadata = {
  title: "Adoptable pets — Menagerie",
  description: "Pets listed for adoption by Rescue & Shelter workspaces on Menagerie.",
};

export default async function AdoptDirectoryPage() {
  const pets = await listAdoptablePets();

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <Navbar />
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 md:px-10 py-14">
        <Eyebrow>Adoption</Eyebrow>
        <h1 className="text-3xl mb-2">Pets looking for a home</h1>
        <p className="text-muted max-w-[60ch] mb-10">
          Listed by rescues and shelters running their operations on Menagerie.
        </p>

        {pets.length === 0 ? (
          <Card className="p-8 text-center text-muted">No pets are listed for adoption right now.</Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {pets.map((p) => (
              <Link key={p.id} href={`/adopt/${p.id}`}>
                <Card className="p-5 h-full flex flex-col gap-3 hover:-translate-y-0.5 hover:border-primary transition">
                  <div className="font-semibold text-base">{p.name}</div>
                  <div className="text-xs text-muted">
                    {[p.breed, SPECIES_LABEL[p.species], p.lifeStage].filter(Boolean).join(" · ")}
                  </div>
                  {p.adoptionNote && (
                    <p className="text-sm text-muted line-clamp-3 flex-1">{p.adoptionNote}</p>
                  )}
                  <div className="text-xs text-primary mt-auto">{p.orgName} →</div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
