import Link from "next/link";
import type { ReactNode } from "react";
import { PawIcon } from "@/components/icons";
import { Card } from "@/components/ui";

export function AuthShell({
  step,
  title,
  subtitle,
  children,
}: {
  step: 1 | 2 | 3;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-6 md:px-10 h-16 flex items-center border-b border-line">
        <Link href="/" className="flex items-center gap-2 font-serif font-semibold text-base text-ink">
          <span className="w-6 h-6 rounded-md bg-primary text-primary-ink flex items-center justify-center">
            <PawIcon className="text-[.85em]" />
          </span>
          Menagerie
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-1.5 mb-6">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`h-1.5 flex-1 rounded-full ${
                  n <= step ? "bg-primary" : "bg-line"
                }`}
              />
            ))}
          </div>
          <div className="text-xs font-mono text-muted mb-2">Step {step} of 3</div>
          <h1 className="text-2xl mb-1.5">{title}</h1>
          <p className="text-sm text-muted mb-8">{subtitle}</p>
          <Card className="p-6 md:p-7">{children}</Card>
        </div>
      </main>
    </div>
  );
}
