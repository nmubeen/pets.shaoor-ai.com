"use client";

import { useState } from "react";
import Link from "next/link";
import { PawIcon, MenuIcon, CloseIcon } from "@/components/icons";
import { Btn } from "@/components/ui";

const links = [
  { href: "/pricing", label: "Pricing" },
  { href: "/#gap", label: "Why Menagerie" },
  { href: "/#faq", label: "FAQ" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

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
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink transition">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/signup" className="hidden sm:inline text-sm text-muted hover:text-ink transition">
            Sign in
          </Link>
          <Btn href="/signup" variant="primary" className="!px-4 !py-2 text-[.82rem]">
            Start free trial
          </Btn>
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden text-ink"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <CloseIcon className="text-[1.3em]" /> : <MenuIcon className="text-[1.3em]" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-line px-6 py-3 flex flex-col gap-1 text-sm text-muted">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2 hover:text-ink transition">
              {l.label}
            </Link>
          ))}
          <Link href="/signup" onClick={() => setOpen(false)} className="py-2 sm:hidden hover:text-ink transition">
            Sign in
          </Link>
        </nav>
      )}
    </header>
  );
}
