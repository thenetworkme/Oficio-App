"use client";

import { Bell, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/cn";
import { formatNavDateEs } from "@/lib/format";
import { strings } from "@/lib/strings";

// Every Punto reference screen shares this exact header: "oficio" wordmark +
// signal dot (top-left, -> dashboard), a center nav with pill/underline tab
// indicators for Hoy/Práctica/Datos/Retos/Logros, and on the right:
// today's date (Geist Mono), a bell (Avisos, with an unread signal dot) and
// a circular avatar-initial button (-> Ajustes). See
// design-reference/punto/html/PuntoPanel.dc.html's <header> and
// design-reference/punto/png/PuntoPanel.png.
//
// Replaces the old left Sidebar/MobileNav (components/layout/Sidebar.tsx,
// MobileNav.tsx — deleted, nothing else imported from them) — a structural
// layout change, not just a reskin. At narrow widths the center nav collapses
// into a hamburger-triggered dropdown rather than wrapping or scrolling,
// since 6 uppercase mono tabs don't wrap cleanly at phone width.
const NAV = [
  { href: "/", label: strings.nav.panel },
  { href: "/temporizador", label: strings.nav.temporizador },
  { href: "/estadisticas", label: strings.nav.estadisticas },
  { href: "/retos", label: strings.nav.retos },
  { href: "/logros", label: strings.nav.logros },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-[3px] text-[20px] font-medium tracking-tight text-ink", className)}>
      {strings.app.name.toLowerCase()}
      <i aria-hidden="true" className="mt-2.5 size-[7px] shrink-0 rounded-full" style={{ background: "var(--signal)" }} />
    </Link>
  );
}

function NavTab({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative whitespace-nowrap py-2 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors",
        active ? "text-ink" : "text-muted hover:text-ink",
      )}
    >
      {active && (
        <i
          aria-hidden="true"
          className="absolute -left-3.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full"
          style={{ background: "var(--signal)" }}
        />
      )}
      {label}
    </Link>
  );
}

function MobileNavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-chip px-3.5 py-3 font-mono text-[13px] uppercase tracking-[0.1em] transition-colors",
        active ? "bg-card text-ink" : "text-muted",
      )}
    >
      {active && <i aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ background: "var(--signal)" }} />}
      {label}
    </Link>
  );
}

function BellButton() {
  return (
    <Link
      href="/recordatorios"
      aria-label={strings.nav.recordatorios}
      className="relative flex shrink-0 text-muted transition-colors hover:text-ink"
    >
      <Bell size={19} strokeWidth={1.7} aria-hidden="true" />
      <i aria-hidden="true" className="absolute -right-px -top-px size-1.5 rounded-full" style={{ background: "var(--signal)" }} />
    </Link>
  );
}

function AvatarButton() {
  const { user, profile } = useAuth();
  const name = profile?.displayName || user?.displayName || user?.email || "Cuenta";
  const initial = name.charAt(0).toUpperCase();
  return (
    <Link
      href="/ajustes"
      aria-label={`Ajustes · ${name}`}
      className="flex size-[34px] shrink-0 items-center justify-center rounded-full border border-border font-mono text-[12px] text-ink transition-colors hover:border-border-hover"
    >
      {initial}
    </Link>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Avoid an SSR/client markup mismatch: "today" depends on the viewer's
  // clock, so render it only after mount.
  const [dateLabel, setDateLabel] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDateLabel(formatNavDateEs(new Date()));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper">
      <div className="mx-auto flex h-[68px] max-w-[1360px] items-center justify-between gap-4 px-5 sm:px-10">
        <Wordmark />
        <nav aria-label="Principal" className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <NavTab key={item.href} {...item} pathname={pathname} />
          ))}
        </nav>
        <div className="flex items-center gap-4">
          {dateLabel && <span className="label-xs hidden sm:inline">{dateLabel}</span>}
          <BellButton />
          <AvatarButton />
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="-mr-1 flex size-9 items-center justify-center text-ink lg:hidden"
          >
            {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Principal" className="flex flex-col gap-1 border-t border-line px-5 py-3 lg:hidden">
          {NAV.map((item) => (
            <MobileNavLink key={item.href} {...item} pathname={pathname} />
          ))}
        </nav>
      )}
    </header>
  );
}
