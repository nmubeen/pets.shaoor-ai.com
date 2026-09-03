import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Btn, Card, Eyebrow, Pill } from "@/components/ui";
import {
  LayersIcon,
  CartIcon,
  UsersIcon,
  FishIcon,
  TagIcon,
  HomeIcon,
} from "@/components/icons";

const principles = [
  {
    icon: LayersIcon,
    title: "Species-agnostic core",
    body: "Cats, dogs, birds, reptiles, and aquarium habitats share one schema of pets, groups, habitats, vets, and expenses — no per-species tables to maintain.",
  },
  {
    icon: UsersIcon,
    title: "Multi-tenant from the start",
    body: "Every workspace is isolated by Row Level Security on day one, so the people who share a home can share a record safely.",
  },
  {
    icon: HomeIcon,
    title: "Trial-led, no dead ends",
    body: "Every workspace starts on a 14-day trial of Sanctuary, no card required, and downgrades gracefully to the free Litter tier — never locked out.",
  },
];

const differentiators = [
  {
    icon: UsersIcon,
    title: "Org-tier workspaces",
    body: "A shelter or breeder tenant gets the same core record per animal, plus adoption-ready public profiles and multi-seat staff access.",
  },
  {
    icon: HomeIcon,
    title: "Multi-household tenants",
    body: "A Sanctuary-tier workspace can hold more than one physical home under one billing relationship and one shared cost ledger.",
  },
  {
    icon: TagIcon,
    title: "Built for how you actually pay",
    body: "Costs and care events scope to a pet, a group, or the whole household — a joint vet trip for two kittens costs once, not split awkwardly.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-16 grid md:grid-cols-[1.1fr_.9fr] gap-14 items-center">
          <div>
            <Eyebrow>Part of the shaoor-ai.com family</Eyebrow>
            <h1 className="text-[2.4rem] md:text-[3.4rem] leading-[1.05] tracking-[-.01em] mb-5">
              Every pet. Every habitat.
              <br />
              One record.
            </h1>
            <p className="text-lg text-muted max-w-[52ch] mb-8">
              Cats, dogs, birds, tanks, foster litters — tracked, costed, and
              remembered in one workspace. Menagerie is the pet-care record
              built for mixed households, not just single-pet apps.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Btn href="/signup">Start free trial</Btn>
              <Btn href="/pricing" variant="ghost">
                See pricing
              </Btn>
            </div>
            <p className="text-sm text-muted mt-4">
              14 days free on Sanctuary · no card required
            </p>
          </div>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="font-semibold text-sm">Good evening</div>
              <Pill dotColor="var(--trial)">trial · 9d left</Pill>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-surface-2 rounded-lg p-3">
                <div className="font-mono font-semibold text-base">₹2,140</div>
                <div className="text-[.62rem] uppercase text-muted mt-1">Spent · 30d</div>
              </div>
              <div className="bg-surface-2 rounded-lg p-3">
                <div className="font-mono font-semibold text-base">3</div>
                <div className="text-[.62rem] uppercase text-muted mt-1">Tasks due</div>
              </div>
              <div className="bg-surface-2 rounded-lg p-3">
                <div className="font-mono font-semibold text-base">1</div>
                <div className="text-[.62rem] uppercase text-muted mt-1">Vaccine soon</div>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3 bg-paper border border-line rounded-lg px-3 py-2.5">
                <span className="w-8 h-8 rounded-full bg-[var(--accent)] text-[.65rem] font-bold text-white flex items-center justify-center flex-none">SM</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">Simba</div>
                  <div className="text-xs text-muted">Weight logged 3d ago</div>
                </div>
                <span className="text-[.62rem] font-mono px-2 py-0.5 rounded-full bg-good/15 text-good">on track</span>
              </div>
              <div className="flex items-center gap-3 bg-paper border border-line rounded-lg px-3 py-2.5">
                <span className="w-8 h-8 rounded-full bg-[var(--trial)] text-[.65rem] font-bold text-white flex items-center justify-center flex-none">RT</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">The Reef Tank</div>
                  <div className="text-xs text-muted">Water change in 2d</div>
                </div>
                <span className="text-[.62rem] font-mono px-2 py-0.5 rounded-full bg-accent/20 text-accent">soon</span>
              </div>
            </div>
          </Card>
        </section>

        {/* Principles */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-10 py-14 border-t border-line">
          <div className="grid md:grid-cols-3 gap-8">
            {principles.map((p) => (
              <div key={p.title} className="flex flex-col gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-2 text-primary flex items-center justify-center">
                  <p.icon className="text-[1.1em]" />
                </div>
                <h3 className="text-base font-semibold">{p.title}</h3>
                <p className="text-sm text-muted !max-w-none">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The gap */}
        <section id="gap" className="max-w-[1200px] mx-auto px-6 md:px-10 py-14 border-t border-line">
          <span className="font-mono text-accent text-sm">02</span>
          <h2 className="text-2xl md:text-3xl mt-1 mb-3">Built for mixed households</h2>
          <p className="text-muted max-w-[65ch] mb-10">
            Pet-care software today is built around one species and one
            animal at a time. Menagerie is one workspace for everything a
            household actually keeps.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h4 className="text-base font-semibold mb-2">What exists today</h4>
              <p className="text-sm text-muted !max-w-none">
                Single-pet trackers for one dog, vet-practice portals tied to
                one clinic, and spreadsheet habits for anyone with a mixed
                household — a cat, a reef tank, and a foster litter tracked
                in three places that never share a cost ledger.
              </p>
            </Card>
            <Card className="p-6" style={{ borderColor: "var(--accent)" }}>
              <h4 className="text-base font-semibold mb-2">What Menagerie gives you</h4>
              <p className="text-sm text-muted !max-w-none">
                One workspace, unlimited species, with costs and care events
                scoped to a pet, a group, a habitat, or the whole household —
                and a plan built for <strong className="text-ink">rescues and shelters</strong>,
                who today have no equivalent at any price.
              </p>
            </Card>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {differentiators.map((d) => (
              <div key={d.title} className="border-t border-line pt-5">
                <div className="w-8 h-8 rounded-lg bg-surface-2 text-primary flex items-center justify-center mb-3">
                  <d.icon className="text-[1em]" />
                </div>
                <h4 className="text-sm font-semibold mb-1.5">{d.title}</h4>
                <p className="text-[.86rem] text-muted !max-w-none">{d.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Any species */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-10 py-14 border-t border-line">
          <span className="font-mono text-accent text-sm">03</span>
          <h2 className="text-2xl md:text-3xl mt-1 mb-3">One record, any species</h2>
          <p className="text-muted max-w-[65ch] mb-10">
            A habitat — an aquarium, a terrarium, a coop — is a first-class
            peer of a pet, not a bolted-on feature. A tank&rsquo;s water changes
            and a cat&rsquo;s baths both live in the same care log.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid grid-cols-[34px_1fr] gap-4 border-t border-line pt-5">
              <div className="w-[34px] h-[34px] rounded-lg bg-surface-2 text-primary flex items-center justify-center">
                <FishIcon />
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1">Habitats are peers of pets</h4>
                <p className="text-[.86rem] text-muted !max-w-none">
                  Vet visits, expenses, gallery media, and comments all attach
                  to either an individual pet or a habitat — the app never
                  assumes an event is about one animal alone.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-[34px_1fr] gap-4 border-t border-line pt-5">
              <div className="w-[34px] h-[34px] rounded-lg bg-surface-2 text-primary flex items-center justify-center">
                <CartIcon />
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1">Three-level scoping, everywhere</h4>
                <p className="text-[.86rem] text-muted !max-w-none">
                  Shopping, expenses, and care tasks scope to a pet, a group,
                  or the household — a joint vet trip for two kittens costs
                  once, scoped to the group.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-10 py-16 border-t border-line">
          <div
            className="rounded-[10px] card-shadow p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-8"
            style={{ background: "var(--primary)", color: "var(--primary-ink)" }}
          >
            <div>
              <h2 className="text-2xl md:text-3xl mb-2" style={{ color: "var(--primary-ink)" }}>
                Start your 14-day Sanctuary trial
              </h2>
              <p className="!max-w-[46ch]" style={{ color: "var(--primary-ink)", opacity: 0.8 }}>
                No card required today. Add every pet and habitat you keep,
                invite the people who help care for them, and see the whole
                cost picture in one place.
              </p>
            </div>
            <Btn href="/signup" className="!bg-accent !text-accent-ink whitespace-nowrap">
              Start free trial
            </Btn>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
