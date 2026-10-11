"use client";

import { useState } from "react";
import { AparienciaPanel } from "@/components/settings/AparienciaPanel";
import { PerfilPanel } from "@/components/settings/PerfilPanel";

const TABS = [
  { id: "perfil", label: "Perfil", title: "Tu cuenta, a tu manera." },
  { id: "apariencia", label: "Apariencia", title: "Hazla tuya." },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AjustesPage() {
  const [tab, setTab] = useState<TabId>("perfil");
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <>
      <header className="flex flex-col gap-1">
        <span className="label-xs">Ajustes · {current.label}</span>
        <h1 className="m-0 text-4xl font-bold leading-tight tracking-tight">{current.title}</h1>
      </header>

      <div role="group" aria-label="Secciones de ajustes" className="flex w-fit flex-wrap gap-2.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className="bx press min-h-13 px-6 text-[18px] font-bold"
            style={
              tab === t.id
                ? { background: "var(--a1)", boxShadow: "2px 2px 0 var(--shadow)", transform: "translate(4px,4px)" }
                : { background: "var(--card)" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "perfil" ? <PerfilPanel /> : <AparienciaPanel />}
    </>
  );
}
