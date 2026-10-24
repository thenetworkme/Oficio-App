"use client";

// "Pomodoro" Ajustes. design-reference/pomodoro/html/PomoAjustes.dc.html
// renders Ajustes as a small centered-modal overlay on top of the Timer
// screen, but this app's real /ajustes page holds far more functionality
// than that modal shows (Perfil, Apariencia, Cuenta — password/export/
// delete-account). Per the phase-1 recommendation this page's own content
// used to carry: KEEP /ajustes a real routed page (components/layout/
// TopNav.tsx's gear icon links here as a normal route), but give it the
// reference's centered white-card look — a full-bleed `--mode-bg`
// backdrop (inheriting the default focus-red, no override needed — this
// isn't a live-timer screen) behind a centered `Card tone="solid"` panel,
// proportioned like the reference's 420px modal but taller, since real
// Ajustes holds a lot more than the reference's tiny settings list.
//
// The three tabs (Perfil/Apariencia/Cuenta) are kept — the reference has
// no tabs (its whole modal is one short list), but this page's real
// content is long enough that one undivided scroll would bury the
// account-management (password/export/delete) section. Within "Perfil",
// the panel's own section order now puts the reference's own field group
// (Temporizador/Sonido/Avisos) first, with Perfil-only sections
// (Identidad/Práctica) that have no reference equivalent below them — see
// PerfilPanel.tsx's own header comment for the full per-field mapping.
//
// AparienciaPanel's interactive --signal accent picker is gone, replaced
// with the reference's static 3-swatch mode-color display; dark/light/
// system theme switching (the one real, still-needed control that used to
// share that tab) stays fully wired there — see that file's own comment.
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { AparienciaPanel } from "@/components/settings/AparienciaPanel";
import { CuentaPanel } from "@/components/settings/CuentaPanel";
import { PerfilPanel } from "@/components/settings/PerfilPanel";

const TABS = [
  { id: "perfil", label: "Perfil", title: "Tu cuenta, a tu manera." },
  { id: "apariencia", label: "Apariencia", title: "Hazla tuya." },
  { id: "cuenta", label: "Cuenta", title: "Seguridad y datos." },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AjustesPage() {
  const [tab, setTab] = useState<TabId>("perfil");
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    // Breaks out of AppShell's `main` padding (px-5 py-9 sm:px-10, see
    // components/layout/AppShell.tsx — not touched here) with matching
    // negative margins, so this backdrop reaches the same edges TopNav's
    // own full-bleed header does, then restores that padding inside so the
    // centered panel below isn't flush against the viewport edge either.
    <div
      className="-mx-5 -my-9 flex justify-center px-5 py-10 sm:-mx-10 sm:px-10"
      style={{ background: "var(--mode-bg)", minHeight: "calc(100vh - 60px)" }}
    >
      <div className="flex w-full max-w-[640px] flex-col gap-6">
        <header className="flex flex-col gap-1">
          <span className="label-xs" style={{ color: "var(--mode-ink-muted)" }}>
            Ajustes · {current.label}
          </span>
          <h1 className="m-0 text-[40px] font-light leading-[0.95] tracking-tight text-mode-ink sm:text-[48px]">
            {current.title}
          </h1>
        </header>

        <Card tone="solid" className="flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,.3)]">
          <div role="group" aria-label="Secciones de ajustes" className="flex flex-wrap gap-2 border-b border-card-solid-line p-5">
            {TABS.map((t) => (
              <Chip key={t.id} pressed={tab === t.id} onClick={() => setTab(t.id)} className="ring-1 ring-inset ring-card-solid-line">
                {t.label}
              </Chip>
            ))}
          </div>
          <div className="p-6 sm:p-8">
            {tab === "perfil" ? <PerfilPanel /> : tab === "apariencia" ? <AparienciaPanel /> : <CuentaPanel />}
          </div>
        </Card>
      </div>
    </div>
  );
}
