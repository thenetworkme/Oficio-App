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
import { cn } from "@/lib/cn";
import { strings } from "@/lib/strings";
import { Logo } from "./Sidebar";

const NAV = [
  { href: "/", label: strings.nav.panel, icon: LayoutDashboard },
  { href: "/temporizador", label: strings.nav.temporizador, icon: TimerIcon },
  { href: "/estadisticas", label: strings.nav.estadisticas, icon: BarChart3 },
  { href: "/logros", label: strings.nav.logros, icon: Trophy },
  { href: "/recordatorios", label: strings.nav.recordatorios, icon: BellRing },
  { href: "/ajustes", label: strings.nav.ajustes, icon: SlidersHorizontal },
];

export function MobileTopBar() {
  return (
    <header className="flex items-center justify-between border-b border-line px-5 py-3.5 lg:hidden">
      <Logo />
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-between border-t border-line bg-card px-1 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px]",
              active ? "text-accent" : "text-muted",
            )}
          >
            <Icon size={20} aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
