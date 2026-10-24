"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { AparienciaPanel } from "./AparienciaPanel";
import { CuentaPanel } from "./CuentaPanel";
import { PerfilPanel } from "./PerfilPanel";

// Ajustes as an actual modal overlay, per explicit user direction
// ("debe ser estilo modal no una pagina aparte") — this replaces the
// earlier phase-1 decision to keep it a real routed page (see the removed
// app/(app)/ajustes/page.tsx's own comment for that prior reasoning).
// Content/logic is unchanged (same 3 tabs, same panels); only the shell
// changes, from a full-bleed page to a centered Dialog.
//
// Same Radix-portal --mode-bg gotcha as every other fullscreen/dialog
// surface in this app (see FullscreenTimer/SessionSaveDialog's own
// comments): Dialog portals to document.body, outside any page root that
// might set --mode-bg, so it's redeclared directly on DialogContent here
// (defaulting to focus-red — this isn't a live-timer surface, so no
// override is wired). DialogContent's own default neutral frame
// (border/bg/padding) is overridden via className so the colored
// content div fills it edge-to-edge, same technique already proven in
// Button/Chip's own variant overrides elsewhere in this codebase.
const TABS = [
  { id: "perfil", label: "Perfil", title: "Tu cuenta, a tu manera." },
  { id: "apariencia", label: "Apariencia", title: "Hazla tuya." },
  { id: "cuenta", label: "Cuenta", title: "Seguridad y datos." },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AjustesModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [tab, setTab] = useState<TabId>("perfil");
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        aria-describedby={undefined}
        className="max-h-[88vh] w-[calc(100%-32px)] max-w-[640px] overflow-y-auto border-0 bg-transparent p-0"
        style={{ "--mode-bg": "var(--mode-focus)" } as React.CSSProperties}
      >
        <div className="flex flex-col gap-6 rounded-card p-6 sm:p-8" style={{ background: "var(--mode-bg)" }}>
          <header className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="label-xs" style={{ color: "var(--mode-ink-muted)" }}>
                Ajustes · {current.label}
              </span>
              <DialogTitle className="m-0 text-[32px] font-light leading-[0.95] tracking-tight text-mode-ink">
                {current.title}
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar"
              className="flex size-9 shrink-0 items-center justify-center rounded-chip border border-card-tint-border bg-card-tint text-mode-ink transition-colors hover:bg-white/30"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <Card tone="solid" className="flex flex-col overflow-hidden">
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
      </DialogContent>
    </Dialog>
  );
}
