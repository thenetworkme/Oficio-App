"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { strings } from "@/lib/strings";

// "Pomodoro" shared header — replaces the old dark "Punto" top nav wholesale
// (structural change, not a reskin: different nav items, different right-
// hand controls, full-bleed colored background instead of a hairline-border
// dark bar). Matches design-reference/pomodoro/html/PomoTimer.dc.html's
// <header> markup closely — same icon paths (copied inline below), same
// `.hb` translucent-white pill treatment for nav links.
//
// Background: this header ALWAYS paints itself from `var(--mode-bg)` (see
// app/globals.css's big comment for the full --mode-bg contract) — it
// defaults to focus-red everywhere until a later phase overrides --mode-bg
// higher up the tree (e.g. on the Timer page's root, driven by the live
// timer mode in store/timer-store.ts — intentionally NOT wired here, this
// phase touches no business logic). AppShell's own background below the
// header deliberately still reads the legacy --paper token, not --mode-bg
// — see globals.css's "Backward compatibility" section for why forcing
// every untouched page onto a colored background now would be unsafe.
//
// Nav items, per the confirmed scope: Informe (bar-chart, /estadisticas),
// Retos (flag, /retos), Logros (trophy, /logros), and a gear-only Ajustes
// (/ajustes) button. NO Tienda entry — the shop feature stays removed, as
// re-confirmed. The gear links to the real /ajustes ROUTE (not a JS modal)
// — see AGENTS report for the full "modal vs. page" architecture decision;
// that page's own content is a later phase's job, this one only makes the
// gear point at it looking like a header nav item, matching the reference.
//
// Responsive: same hamburger-dropdown pattern the "Punto" header used for
// narrow widths (adapted to the new translucent-pill look), rather than
// wrapping/scrolling a row of icon+label pills.
const NAV = [
  { href: "/estadisticas", label: strings.nav.estadisticas, icon: InformeIcon },
  { href: "/retos", label: strings.nav.retos, icon: RetosIcon },
  { href: "/logros", label: strings.nav.logros, icon: LogrosIcon },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2M9 2h6" />
    </svg>
  );
}

function InformeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

function RetosIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </svg>
  );
}

function LogrosIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4h8v6a4 4 0 01-8 0zM8 6H4v1a4 4 0 004 4M16 6h4v1a4 4 0 01-4 4M12 14v4M8 21h8" />
    </svg>
  );
}

function AjustesIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  );
}

/**
 * Standalone "Oficio" wordmark + clock icon. Used both inside this header
 * (forced white via the `text-white` passed from here) and standalone on
 * pages outside AppShell (auth screens, onboarding) — kept exported with
 * the same `{ className }` signature so components/auth/AuthShell.tsx,
 * app/onboarding/page.tsx and app/habilidades/nueva/page.tsx (none
 * redesigned this phase) keep compiling and rendering unchanged there:
 * default text color is still `text-ink` (inherits whatever palette that
 * page is on), not hardcoded white.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 text-ink text-[20px] font-bold tracking-tight", className)}>
      <ClockIcon />
      {strings.app.name}
    </Link>
  );
}

function NavPill({ href, label, icon: Icon, active }: { href: string; label: string; icon: () => React.ReactElement; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-[34px] shrink-0 items-center gap-2 rounded-[4px] border border-white/20 px-3 text-[14px] font-medium text-white transition-colors",
        active ? "bg-white/35" : "bg-white/20 hover:bg-white/30",
      )}
    >
      <Icon />
      {label}
    </Link>
  );
}

function AjustesPill({ active }: { active: boolean }) {
  return (
    <Link
      href="/ajustes"
      aria-label={strings.nav.ajustes}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[4px] border border-white/20 text-white transition-colors",
        active ? "bg-white/35" : "bg-white/20 hover:bg-white/30",
      )}
    >
      <AjustesIcon />
    </Link>
  );
}

function MobileNavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: () => React.ReactElement; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-[4px] px-3.5 py-3 text-[14px] font-medium text-white transition-colors",
        active ? "bg-white/35" : "bg-white/15 hover:bg-white/25",
      )}
    >
      <Icon />
      {label}
    </Link>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className="sticky top-0 z-30 transition-[background] duration-[400ms]"
      style={{ background: "var(--mode-bg)" }}
    >
      <div className="mx-auto flex h-[60px] max-w-[1360px] items-center justify-between gap-4 px-5 sm:px-10">
        <Wordmark className="text-white" />
        <nav aria-label="Principal" className="hidden items-center gap-2 lg:flex">
          {NAV.map((item) => (
            <NavPill key={item.href} {...item} active={isActive(pathname, item.href)} />
          ))}
          <AjustesPill active={isActive(pathname, "/ajustes")} />
        </nav>
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex size-9 items-center justify-center rounded-[4px] border border-white/20 bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Principal" className="flex flex-col gap-1 px-5 py-3 lg:hidden">
          {NAV.map((item) => (
            <MobileNavLink key={item.href} {...item} active={isActive(pathname, item.href)} />
          ))}
          <MobileNavLink href="/ajustes" label={strings.nav.ajustes} icon={AjustesIcon} active={isActive(pathname, "/ajustes")} />
        </nav>
      )}
    </header>
  );
}
