"use client";

import {
  BarChart3,
  LayoutDashboard,
  SlidersHorizontal,
  Timer as TimerIcon,
  Trophy,
  BellRing,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: strings.nav.panel, icon: LayoutDashboard },
  { href: "/temporizador", label: strings.nav.temporizador, icon: TimerIcon },
  { href: "/estadisticas", label: strings.nav.estadisticas, icon: BarChart3 },
  { href: "/logros", label: strings.nav.logros, icon: Trophy },
  { href: "/recordatorios", label: strings.nav.recordatorios, icon: BellRing },
  { href: "/ajustes", label: strings.nav.ajustes, icon: SlidersHorizontal },
];

export function NavLinks({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const pathname = usePathname();
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-button px-3.5 font-semibold",
              active ? "bg-sel text-text" : "text-muted font-normal",
            )}
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

export function StreakCard({ days, minMinutes }: { days: number; minMinutes: number }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-line p-3.5">
      <span className="label-xs">{strings.streak.label}</span>
      <span className="font-num text-[28px] font-medium text-accent">{strings.streak.days(days)}</span>
      <span className="text-[13px] text-muted">{strings.streak.minimum(minMinutes)}</span>
    </div>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-1.5">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="11" stroke="var(--line)" strokeWidth="3" />
        <path d="M14 3a11 11 0 0 1 9.5 5.5" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="text-2xl font-extrabold tracking-tight">{strings.app.name}</span>
    </div>
  );
}

export function Sidebar({ streakDays, minMinutes }: { streakDays: number; minMinutes: number }) {
  return (
    <nav
      aria-label="Principal"
      className="hidden lg:flex lg:flex-col lg:gap-7 lg:w-[248px] lg:shrink-0 lg:border-r lg:border-line lg:px-5 lg:py-7"
    >
      <Logo />
      <NavLinks />
      <div className="mt-auto">
        <StreakCard days={streakDays} minMinutes={minMinutes} />
      </div>
    </nav>
  );
}
