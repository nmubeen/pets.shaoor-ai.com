import type { ReactNode, HTMLAttributes } from "react";
import Link from "next/link";

export function Card({
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-surface border border-line rounded-[10px] card-shadow ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Pill({
  children,
  className = "",
  dotColor,
}: {
  children: ReactNode;
  className?: string;
  dotColor?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-[.72rem] tracking-[.02em] px-[.7em] py-[.28em] rounded-full border border-line text-muted ${className}`}
    >
      {dotColor && (
        <span
          className="w-[6px] h-[6px] rounded-full"
          style={{ background: dotColor }}
        />
      )}
      {children}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[.72rem] tracking-[.12em] uppercase text-primary bg-surface border border-line px-[.8em] py-[.35em] rounded-full mb-5">
      <span className="w-[6px] h-[6px] rounded-full bg-accent" />
      {children}
    </span>
  );
}

type BtnVariant = "primary" | "ghost" | "dark";

export function Btn({
  href,
  children,
  variant = "primary",
  className = "",
  type,
  onClick,
}: {
  href?: string;
  children: ReactNode;
  variant?: BtnVariant;
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  const styles: Record<BtnVariant, string> = {
    primary: "bg-accent text-accent-ink hover:brightness-95",
    ghost: "bg-transparent border border-line text-ink hover:bg-surface-2",
    dark: "bg-primary text-primary-ink hover:brightness-110",
  };
  const cls = `inline-flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-lg transition ${styles[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type ?? "button"} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "ok",
}: {
  children: ReactNode;
  tone?: "ok" | "warn" | "due" | "trial";
}) {
  const tones: Record<string, string> = {
    ok: "bg-good/15 text-good",
    warn: "bg-accent/20 text-accent",
    due: "bg-coral/20 text-coral",
    trial: "bg-trial/20 text-trial",
  };
  return (
    <span
      className={`font-mono text-[.66rem] px-[.6em] py-[.2em] rounded-full ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatTile({ num, label }: { num: string; label: string }) {
  return (
    <Card className="p-4">
      <div className="text-xl font-semibold font-mono">{num}</div>
      <div className="text-[.66rem] uppercase tracking-[.05em] text-muted mt-1">
        {label}
      </div>
    </Card>
  );
}

export function Avatar({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="w-10 h-10 rounded-full flex-none flex items-center justify-center text-xs font-bold text-white"
      style={{ background: color }}
    >
      {label}
    </div>
  );
}

export function PetChip({
  name,
  sub,
  color,
  initials,
  badge,
}: {
  name: string;
  sub: string;
  color: string;
  initials: string;
  badge?: { text: string; tone: "ok" | "warn" | "due" | "trial" };
}) {
  return (
    <div className="flex items-center gap-3 bg-surface border border-line rounded-[10px] px-3.5 py-3">
      <Avatar label={initials} color={color} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm truncate">{name}</div>
        <div className="text-xs text-muted truncate">{sub}</div>
      </div>
      {badge && <Badge tone={badge.tone}>{badge.text}</Badge>}
    </div>
  );
}

export function SectionIntro({ children }: { children: ReactNode }) {
  return <p className="text-muted text-[1.02rem] max-w-[70ch] mb-8">{children}</p>;
}
