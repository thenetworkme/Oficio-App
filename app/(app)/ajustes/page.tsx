"use client";

// Phase-1 "Pomodoro" note: design-reference/pomodoro/html/PomoAjustes.dc.html
// renders Ajustes as a small centered-modal overlay on top of the Timer
// screen, but this app's real /ajustes page holds far more functionality
// than that modal shows (Perfil, Apariencia, Cuenta — password/export/
// delete-account). Decision: KEEP /ajustes a real routed page (not a JS
// modal) — components/layout/TopNav.tsx's gear icon links here as a normal
// route — but a later phase should give this page's own content a
// centered white-card look (via the new Card `tone="solid"` + --mode-bg
// background on this page's own root) so it still feels visually
// consistent with the reference's modal aesthetic. Not done in this phase
// (page CONTENT is out of scope here) — see the phase-1 AGENTS report.
import { useState } from "react";
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
    <>
      <header className="flex flex-col gap-1">
        <span className="label-xs">Ajustes · {current.label}</span>
        <h1 className="m-0 text-[52px] font-light leading-[0.95] tracking-tight sm:text-[64px]">{current.title}</h1>
      </header>

      <div role="group" aria-label="Secciones de ajustes" className="flex w-fit flex-wrap gap-2">
        {TABS.map((t) => (
          <Chip key={t.id} pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </Chip>
        ))}
      </div>

      {tab === "perfil" ? <PerfilPanel /> : tab === "apariencia" ? <AparienciaPanel /> : <CuentaPanel />}
    </>
  );
}
