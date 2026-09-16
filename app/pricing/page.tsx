import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Btn, Card, Eyebrow } from "@/components/ui";
import { CheckIcon } from "@/components/icons";
import { tiers } from "@/lib/mock-data";

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="max-w-[1200px] mx-auto px-6 md:px-10 pt-16 pb-10 text-center">
          <Eyebrow>Simple, workspace-based pricing</Eyebrow>
          <h1 className="text-3xl md:text-[2.6rem] mb-4 text-(--color-primary-text)">
            One plan for every pet you keep
          </h1>
          <p className="text-muted max-w-[56ch] mx-auto">
            Every workspace starts on a 14-day trial of Sanctuary — no card
            required. Downgrade to Litter automatically if you don&rsquo;t
            convert, or talk to us about Rescue &amp; Shelter.
          </p>
        </section>

        <section className="max-w-[1200px] mx-auto px-6 md:px-10 pb-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            {tiers.map((t) => (
              <Card
                key={t.name}
                className="p-6 flex flex-col relative"
                style={
                  t.featured
                    ? { borderColor: "var(--accent)", boxShadow: "0 0 0 1px var(--accent), var(--shadow)" }
                    : undefined
                }
              >
                {t.tag && (
                  <div className="absolute -top-3 left-5 bg-accent text-accent-ink text-[.62rem] font-mono tracking-[.05em] uppercase px-2.5 py-1 rounded-full">
                    {t.tag}
                  </div>
                )}
                <div className="font-serif font-semibold text-lg mb-0.5">{t.name}</div>
                <div className="text-xs text-muted mb-4">{t.forWhom}</div>
                <div className="font-mono font-semibold text-[1.7rem] mb-0.5">
                  {t.price}
                  {t.per && <span className="text-xs text-muted font-normal">{t.per}</span>}
                </div>
                <div className="text-xs text-muted mb-5">{t.note}</div>
                <ul className="flex flex-col gap-2.5 text-sm mb-6 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckIcon className="text-good mt-0.5 w-[.95em] h-[.95em] flex-none" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Btn
                  href="/signup"
                  variant={t.name === "Rescue & Shelter" ? "ghost" : t.featured ? "primary" : "dark"}
                  className="w-full justify-center mb-4"
                >
                  {t.name === "Rescue & Shelter" ? "Talk to sales" : "Start free trial"}
                </Btn>
                <div className="inline-flex items-center gap-2 text-[.72rem] font-mono text-muted">
                  <span className="w-[9px] h-[9px] rounded-full" style={{ background: t.dot }} />
                  {t.support}
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section id="faq" className="max-w-[900px] mx-auto px-6 md:px-10 pb-24">
          <h2 className="text-2xl mb-8 text-center">Questions</h2>
          <div className="flex flex-col divide-y divide-line border-t border-b border-line">
            {[
              {
                q: "What happens when my trial ends?",
                a: "If you haven't added a card, your workspace downgrades automatically to the free Litter tier — nothing is deleted, and pets or habitats beyond the Litter limit simply become read-only until you upgrade again.",
              },
              {
                q: "Can one workspace hold more than one home?",
                a: "Yes, on Sanctuary and above. Up to 3 locations can share one workspace, one billing relationship, and one cost ledger — useful for families that split pets across two houses or a small foster network.",
              },
              {
                q: "How is Rescue & Shelter priced?",
                a: "Contact us for pricing for larger pet collections and public adoption-ready profiles. Each account is managed by one user.",
              },
              {
                q: "Can I share health information with my vet?",
                a: "Use Vet View to show a health summary in person, or print a Pet Passport. Your account remains private to you.",
              },
            ].map((item) => (
              <div key={item.q} className="py-5">
                <div className="font-semibold text-sm mb-1.5">{item.q}</div>
                <div className="text-sm text-muted">{item.a}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
