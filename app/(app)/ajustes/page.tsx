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
        <h1 className="m-0 text-4xl font-extrabold leading-tight tracking-tight">{current.title}</h1>
      </header>

      <div
        role="group"
        aria-label="Secciones de ajustes"
        className="flex w-fit flex-wrap gap-1.5 rounded-2xl border border-line bg-card p-1.5"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className="min-h-11 rounded-button px-5.5 text-[15px] font-semibold"
            style={{
              background: tab === t.id ? "var(--accent)" : "transparent",
              color: tab === t.id ? "var(--on)" : "var(--text)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "perfil" ? <PerfilPanel /> : <AparienciaPanel />}
    </>
  );
}
