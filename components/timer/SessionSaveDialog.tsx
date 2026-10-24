"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Mascot } from "@/components/mascot/Mascot";
import { usePet } from "@/lib/hooks/usePet";
import { useSound } from "@/lib/sound/SoundProvider";
import { formatMinutesLong } from "@/lib/format";

// Reference's `.chp` mood pills (PomoCierre.dc.html: Difícil/Normal/Fluido/
// Excelente, 4 options) — this app's quality scale is 1-5, so these 5
// labels are the closest honest mapping onto that same pill-button
// treatment rather than dropping a rating level to match the reference's
// count exactly.
const QUALITY_LABELS = ["Disperso", "Costó enfocarse", "Normal", "Buen enfoque", "En flow"];

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
      {/* DialogContent's own frame (components/ui/dialog.tsx) stays the
          default neutral --card/--line surface — it's a shared Phase-1-
          adjacent primitive this phase doesn't touch, and its close button's
          colors are fixed to that neutral surface. The reference's full-bleed
          colored page is instead evoked by an INSET solid --mode-focus block
          (every pendingSave here is a completed FOCUS period, see
          store/timer-store.ts's completeFocusPeriod — mode is never
          short/long when this dialog opens), so the close "×" always sits on
          a safe, already-correct-contrast neutral corner.

          NOTE: this is a plain SOLID var(--mode-focus) fill, not
          Card tone="tint" — tone="tint" is a translucent white OVERLAY
          (rgba(255,255,255,.1)) meant to sit on an ancestor that already
          paints --mode-bg solid (like the Temporizador page's own root).
          Nothing here paints that solid red underneath, so tone="tint" was
          first tried and rendered as a near-invisible white-on-white block
          with unreadable white text in light mode — caught via a real-
          Chromium screenshot during this phase's verification. */}
      <DialogContent showClose={!gains} aria-describedby={undefined} className="max-w-[560px] p-5 sm:p-6">
        {!gains ? (
          <div className="flex flex-col gap-5">
            <div
              style={{ background: "var(--mode-focus)", color: "var(--mode-ink)" } as React.CSSProperties}
              className="flex flex-col items-center gap-1 rounded-card px-6 py-7 text-center"
            >
              <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-mode-ink text-[var(--mode-focus)]">
                <Check size={24} aria-hidden="true" strokeWidth={3} />
              </div>
              <DialogTitle className="m-0 text-[26px] font-bold tracking-tight text-mode-ink">Sesión completada</DialogTitle>
              <p className="m-0 text-[15px] text-mode-ink-muted">
                {formatMinutesLong(durationMin)} de {skillLabel}. Buen trabajo.
              </p>
            </div>

            <div>
              <span className="label-xs mb-3 block">¿Cómo te fue?</span>
              <div role="group" aria-label="¿Qué tan enfocado estuviste?" className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((q) => (
                  <button
                    key={q}
                    type="button"
                    aria-pressed={quality === q}
                    onClick={() => setQuality(q)}
                    className="rounded-chip px-3.5 py-2 text-[13px] font-semibold transition-colors"
                    style={{
                      background: quality === q ? "var(--flat-dark)" : "var(--surface-muted)",
                      color: quality === q ? "var(--flat-dark-ink)" : "var(--surface-muted-ink)",
                    }}
                  >
                    {QUALITY_LABELS[q - 1]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note">¿En qué trabajaste? (opcional)</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: autenticación con JWT" />
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Button variant="dark" size="md" disabled={saving} onClick={handleSave} className="flex-1">
                {saving ? "Guardando…" : "Guardar sesión"}
              </Button>
              <Button variant="light" size="md" onClick={onDiscard}>
                Descartar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div
              style={{ background: "var(--mode-focus)", color: "var(--mode-ink)" } as React.CSSProperties}
              className="flex flex-col items-center gap-3 rounded-card px-6 py-7 text-center"
            >
              <span className="text-[14px] font-semibold text-mode-ink-muted">Tomate completado</span>
              <DialogTitle className="m-0 text-[28px] font-bold leading-[1.1] tracking-tight text-mode-ink">¡Eso es oficio!</DialogTitle>
              <Mascot size={120} mood="celebrate" hat={equipped.hat} cape={equipped.cape} acc={equipped.acc} bg={equipped.bg} />
              <div className="grid w-full grid-cols-3 gap-2.5">
                <div className="rounded-card bg-black/15 px-3 py-3 text-center">
                  <div className="font-num text-[22px] font-extrabold leading-none text-mode-ink">+{gains.xp}</div>
                  <span className="text-[12px] text-mode-ink-muted">XP ganados</span>
                </div>
                <div className="rounded-card bg-black/15 px-3 py-3 text-center">
                  <div className="font-num text-[22px] font-extrabold leading-none text-mode-ink">+{gains.coins}</div>
                  <span className="text-[12px] text-mode-ink-muted">monedas</span>
                </div>
                <div className="rounded-card bg-black/15 px-3 py-3 text-center">
                  <div className="font-num text-[22px] font-extrabold leading-none text-mode-ink">{formatMinutesLong(durationMin)}</div>
                  <span className="text-[12px] text-mode-ink-muted">a {skillLabel}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[14px]">
                <span className="font-semibold text-card-solid-ink">Nv. {level}</span>
                <span className="font-num text-card-solid-muted">
                  {xpIntoLevel} / {xpForNext} XP
                </span>
              </div>
              <ProgressBar pct={xpPct} color="var(--flat-dark)" trackColor="var(--surface-muted)" height={8} ariaLabel={`Nivel ${level}: ${xpIntoLevel} de ${xpForNext} XP`} />
            </div>

            <Button variant="dark" size="md" onClick={() => handleClose(false)}>
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
