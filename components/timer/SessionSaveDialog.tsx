"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { DotDigits } from "@/components/ui/DotDigits";
import { Mascot } from "@/components/mascot/Mascot";
import { usePet } from "@/lib/hooks/usePet";
import { useSound } from "@/lib/sound/SoundProvider";
import { formatMinutesLong } from "@/lib/format";

const QUALITY_LABELS = ["Disperso", "Costó enfocarse", "Normal", "Buen enfoque", "En flow"];

/** "H:MM" for DotDigits (which only accepts digits/':'/'.'). */
function formatHM(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}:${String(r).padStart(2, "0")}`;
}

/**
 * "Cierre de sesión de práctica" (PuntoCierre.dc.html): merges the quality
 * rating with the celebration — the mockup shows them as one screen
 * (rate -> Guardar sesión -> the same card now shows +coins/+XP), not two
 * separate steps, so this dialog does the same: the quality/note form, then
 * in place, the gains + mascot + XP bar once saved.
 */
export function SessionSaveDialog({
  open,
  durationMin,
  skillName,
  initialNote,
  onSave,
  onDiscard,
}: {
  open: boolean;
  durationMin: number;
  skillName: string;
  /** The session's "Intención de esta sesión" text, used to pre-fill the
   * note below so the objective the user already typed isn't thrown away
   * on save by default (see app/(app)/temporizador/page.tsx). Still freely
   * editable/clearable before saving. */
  initialNote?: string;
  onSave: (quality: number, note: string) => Promise<{ coinsGained: number; xpGained: number } | void>;
  onDiscard: () => void;
}) {
  // Stopwatch-sourced "Sesión libre" sessions are intentionally not tied to
  // any skill (see PracticeSession.skillId in lib/types.ts), so skillName
  // arrives as "" for that flow. Pomodoro always passes a real skill name,
  // so this fallback never changes its copy.
  const skillLabel = skillName.trim() ? skillName : "práctica libre";
  const [quality, setQuality] = useState(4);
  const [note, setNote] = useState(initialNote ?? "");
  const [gains, setGains] = useState<{ coins: number; xp: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const { equipped, level, xpIntoLevel, xpForNext, xpPct } = usePet();
  const sound = useSound();

  // Re-initialize the note from the (possibly new) session's intention each
  // time the dialog opens. Both call sites in temporizador/page.tsx reuse
  // the same <SessionSaveDialog> instance across sessions (it's keyed off
  // store.pendingSave/stopwatch.pendingSave, not unmounted between saves),
  // so without this a second session's dialog could show the first
  // session's leftover note text instead of its own intention.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) setNote(initialNote ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSave() {
    setSaving(true);
    try {
      const result = await onSave(quality, note);
      if (result) {
        setGains({ coins: result.coinsGained, xp: result.xpGained });
        sound.playSuccess();
      }
    } finally {
      setSaving(false);
    }
  }

  function handleClose(o: boolean) {
    if (!o) {
      setGains(null);
      setQuality(4);
      setNote("");
      onDiscard();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showClose={!gains} aria-describedby={undefined} className="max-w-[560px]">
        {!gains ? (
          <div className="flex flex-col gap-6">
            <div>
              <span className="label-xs">Sesión terminada · {skillLabel}</span>
              <DialogTitle className="m-0 mt-2 text-[32px] font-light tracking-tight">Buen trabajo</DialogTitle>
            </div>

            <div>
              <span className="label-xs mb-3 block">Tiempo registrado</span>
              <div className="overflow-x-auto">
                <DotDigits value={formatHM(durationMin)} size={14} gap={6} ariaLabel={formatMinutesLong(durationMin)} />
              </div>
            </div>

            <div>
              <span className="label-xs mb-3 block">¿Cómo fue tu enfoque?</span>
              <div role="group" aria-label="¿Qué tan enfocado estuviste?" className="flex flex-wrap items-center gap-3">
                {[1, 2, 3, 4, 5].map((q) => (
                  <button
                    key={q}
                    type="button"
                    aria-pressed={quality === q}
                    aria-label={QUALITY_LABELS[q - 1]}
                    onClick={() => setQuality(q)}
                    className="size-9 rounded-full border transition-colors"
                    style={{
                      background: quality === q ? "var(--signal)" : "transparent",
                      borderColor: quality === q ? "var(--signal)" : "var(--border)",
                    }}
                  />
                ))}
                <span className="font-num ml-2 text-[12px] text-muted">
                  {QUALITY_LABELS[quality - 1]} · {quality} de 5
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note">¿En qué trabajaste? (opcional)</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: autenticación con JWT" />
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={onDiscard}
                className="inline-flex min-h-[52px] items-center rounded-button border border-border px-5 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors hover:border-border-hover hover:bg-card"
              >
                Descartar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="inline-flex min-h-[52px] items-center rounded-button border border-signal bg-signal px-6 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-ink-solid transition-colors hover:brightness-110 disabled:pointer-events-none disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Guardar sesión"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-5">
            <span className="label-xs">Tomate completado</span>
            <DialogTitle className="m-0 text-[36px] font-light leading-[1] tracking-tight">
              ¡Eso es
              <br />
              oficio!
            </DialogTitle>
            <Mascot size={140} mood="celebrate" hat={equipped.hat} cape={equipped.cape} acc={equipped.acc} bg={equipped.bg} className="self-center" />
            <div className="flex flex-wrap gap-3">
              <div className="rounded-card border border-line bg-card px-4 py-2.5">
                <div className="font-num text-[24px] font-medium leading-none">+{formatMinutesLong(durationMin)}</div>
                <span className="label-xs">a {skillLabel}</span>
              </div>
              <div className="rounded-card border border-signal px-4 py-2.5 text-ink">
                <div className="font-num text-[24px] font-medium leading-none text-signal">+{gains.coins} $</div>
                <span className="label-xs">monedas</span>
              </div>
              <div className="rounded-card border border-line bg-card px-4 py-2.5">
                <div className="font-num text-[24px] font-medium leading-none">+{gains.xp} XP</div>
                <span className="label-xs">nivel {level}</span>
              </div>
            </div>
            <div className="flex w-full flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="text-[14px]">Nv. {level}</span>
                <span className="font-num text-[14px] text-muted">
                  {xpIntoLevel} / {xpForNext} XP
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-chip bg-line">
                <div className="h-full rounded-chip bg-signal transition-[width]" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/tienda"
                className="inline-flex min-h-[52px] items-center rounded-button border border-border px-5 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors hover:border-border-hover hover:bg-card"
              >
                Gastar monedas en la tienda →
              </Link>
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="inline-flex min-h-[52px] items-center rounded-button border border-signal bg-signal px-5 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-ink-solid transition-colors hover:brightness-110"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
