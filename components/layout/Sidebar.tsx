"use client";

import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  SlidersHorizontal,
  Store,
  Timer as TimerIcon,
  Trophy,
  BellRing,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: strings.nav.panel, icon: LayoutDashboard },
  { href: "/temporizador", label: strings.nav.temporizador, icon: TimerIcon },
  { href: "/estadisticas", label: strings.nav.estadisticas, icon: BarChart3 },
  { href: "/logros", label: strings.nav.logros, icon: Trophy },
  { href: "/tienda", label: strings.nav.tienda, icon: Store },
  { href: "/recordatorios", label: strings.nav.recordatorios, icon: BellRing },
  { href: "/ajustes", label: strings.nav.ajustes, icon: SlidersHorizontal },
];

export function NavLinks({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const pathname = usePathname();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-chip border-[3px] px-3.5 font-bold",
              active ? "border-ink bg-ink text-paper" : "border-transparent text-ink",
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
    <div className="bx flex flex-col gap-1.5 p-3.5" style={{ background: "var(--a3)" }}>
      <span className="label-xs text-ink">{strings.streak.label}</span>
      <span className="font-num text-[28px] font-bold text-ink">{strings.streak.days(days)}</span>
      <span className="text-[13px] font-medium text-ink">{strings.streak.minimum(minMinutes)}</span>
    </div>
  );
}

export function Logo() {
  return (
    <div className="bx inline-flex items-center gap-2 self-start px-4 py-1.5" style={{ background: "var(--a1)", transform: "rotate(-2deg)" }}>
      <span className="text-[22px] font-bold tracking-tight text-ink">{strings.app.name}!</span>
    </div>
  );
}

function MiniProfile() {
  const { user, profile, signOut } = useAuth();
  if (!user) return null;
  const name = profile?.displayName || user.displayName || user.email || "Cuenta";
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/ajustes"
        aria-label={`Perfil de ${name}`}
        className="bx flex min-h-11 min-w-0 flex-1 items-center gap-2.5 px-2 py-1"
        style={{ background: "var(--a3)" }}
      >
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-ink font-bold"
          style={{ color: "var(--a3)" }}
        >
          {initial}
        </span>
        <span className="truncate font-bold text-ink">{name}</span>
      </Link>
      <button
        type="button"
        aria-label="Cerrar sesión"
        onClick={signOut}
        className="bx press flex size-11 shrink-0 items-center justify-center text-ink"
      >
        <LogOut size={20} aria-hidden="true" />
      </button>
    </div>
  );
}

export function Sidebar({ streakDays, minMinutes }: { streakDays: number; minMinutes: number }) {
  return (
    <nav
      aria-label="Principal"
      className="hidden lg:flex lg:flex-col lg:gap-7 lg:w-[260px] lg:shrink-0 lg:px-5 lg:py-7"
    >
      <Logo />
      <NavLinks />
      <div className="mt-auto flex flex-col gap-3">
        <StreakCard days={streakDays} minMinutes={minMinutes} />
        <MiniProfile />
      </div>
    </nav>
  );
}
