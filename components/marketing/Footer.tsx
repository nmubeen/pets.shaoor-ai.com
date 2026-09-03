import Link from "next/link";
import { PawIcon } from "@/components/icons";

export function Footer() {
  return (
    <footer className="border-t border-line mt-20">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12 flex flex-col md:flex-row gap-8 md:gap-0 md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2 font-serif font-semibold text-base text-ink mb-2">
            <span className="w-6 h-6 rounded-md bg-primary text-primary-ink flex items-center justify-center">
              <PawIcon className="text-[.85em]" />
            </span>
            Menagerie
          </div>
          <p className="text-sm text-muted !max-w-none">
            pets.shaoor-ai.com — a Shaoor AI Tech Consultants product, sibling to
            construct.shaoor-ai.com.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="text-[.68rem] uppercase tracking-[.08em] text-muted mb-3">Product</div>
            <div className="flex flex-col gap-2">
              <Link href="/pricing" className="text-ink/80 hover:text-ink">Pricing</Link>
              <Link href="/signup" className="text-ink/80 hover:text-ink">Start trial</Link>
              <Link href="/app" className="text-ink/80 hover:text-ink">Sign in</Link>
            </div>
          </div>
          <div>
            <div className="text-[.68rem] uppercase tracking-[.08em] text-muted mb-3">Company</div>
            <div className="flex flex-col gap-2">
              <span className="text-ink/80">shaoor-ai.com</span>
              <span className="text-ink/80">construct.shaoor-ai.com</span>
            </div>
          </div>
          <div>
            <div className="text-[.68rem] uppercase tracking-[.08em] text-muted mb-3">Workspace types</div>
            <div className="flex flex-col gap-2">
              <span className="text-ink/80">Household</span>
              <span className="text-ink/80">Rescue & Shelter</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
