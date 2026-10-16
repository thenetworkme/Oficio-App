"use client";

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
