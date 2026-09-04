import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Card, Btn } from "@/components/ui";
import { BackIcon, PawIcon } from "@/components/icons";
import { getAdoptablePet } from "@/lib/adoption";
import { SPECIES_LABEL } from "@/lib/species-labels";

export default async function AdoptProfilePage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const pet = await getAdoptablePet(petId);
  if (!pet) notFound();

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <Navbar />
      <main className="flex-1 max-w-[720px] w-full mx-auto px-6 md:px-10 py-14">
        <Link href="/adopt" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition mb-6">
          <BackIcon className="w-[.9em] h-[.9em]" />
          All adoptable pets
        </Link>

        <Card className="p-8">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center text-primary mb-5">
            <PawIcon className="text-2xl" />
          </div>
          <h1 className="text-3xl mb-1">{pet.name}</h1>
          <p className="text-muted mb-6">
            {[pet.breed, SPECIES_LABEL[pet.species], pet.lifeStage].filter(Boolean).join(" · ")}
          </p>

          {pet.adoptionNote && <p className="whitespace-pre-line mb-8">{pet.adoptionNote}</p>}

          <div className="border-t border-line pt-6">
            <p className="text-sm text-muted mb-4">
              Listed by <span className="text-ink font-medium">{pet.orgName}</span> on Menagerie.
            </p>
            <Btn href="/signup" variant="dark">
              Interested? Start a workspace to get in touch
            </Btn>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
