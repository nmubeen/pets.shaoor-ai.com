import Link from "next/link";
import { PawIcon } from "@/components/icons";
import { Btn } from "@/components/ui";

export function Navbar() {
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur sticky top-0 z-20">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-serif font-semibold text-lg text-ink">
          <span className="w-7 h-7 rounded-lg bg-primary text-primary-ink flex items-center justify-center">
            <PawIcon className="text-[.9em]" />
          </span>
          Menagerie
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted">
          <Link href="/pricing" className="hover:text-ink transition">Pricing</Link>
          <Link href="/#gap" className="hover:text-ink transition">Why Menagerie</Link>
          <Link href="/#faq" className="hover:text-ink transition">FAQ</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/signup" className="hidden sm:inline text-sm text-muted hover:text-ink transition">
            Sign in
          </Link>
          <Btn href="/signup" variant="primary" className="!px-4 !py-2 text-[.82rem]">
            Start free trial
          </Btn>
        </div>
      </div>
    </header>
  );
}
