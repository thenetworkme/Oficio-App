"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Mascot } from "@/components/mascot/Mascot";
import { usePet } from "@/lib/hooks/usePet";
import { useSound } from "@/lib/sound/SoundProvider";
import { formatMinutesLong } from "@/lib/format";

/**
 * "Cierre de sesión de práctica" (PegatinaCierre.dc.html): merges the
 * quality rating with the celebration — the mockup shows them as one screen
 * (rate -> Guardar sesión -> the same card now shows +coins/+XP), not two
 * separate steps, so this dialog does the same: the quality/note form, then
 * in place, the gains + mascot + XP bar once saved.
 */
export function SessionSaveDialog({
  open,
  durationMin,
  skillName,
  onSave,
  onDiscard,
}: {
  open: boolean;
  durationMin: number;
  skillName: string;
  onSave: (quality: number, note: string) => Promise<{ coinsGained: number; xpGained: number } | void>;
  onDiscard: () => void;
}) {
  const [quality, setQuality] = useState(4);
  const [note, setNote] = useState("");
  const [gains, setGains] = useState<{ coins: number; xp: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const { equipped, level, xpIntoLevel, xpForNext, xpPct } = usePet();
  const sound = useSound();

  const faces = ["🥱", "😕", "🙂", "😄", "🔥"];
  const qLabels = ["Disperso", "Costó enfocarse", "Normal", "Buen enfoque", "En flow"];

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
          <div className="flex flex-col gap-5">
            <DialogTitle className="m-0 text-[28px] font-bold tracking-tight">Cierra la sesión</DialogTitle>
            <p className="m-0 text-muted">
              Guarda {formatMinutesLong(durationMin)} de {skillName}. ¿Qué tan enfocado estuviste?
            </p>
            <div role="group" aria-label="¿Qué tan enfocado estuviste?" className="flex flex-wrap gap-3">
              {faces.map((face, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={quality === i + 1}
                  aria-label={qLabels[i]}
                  onClick={() => setQuality(i + 1)}
                  className="bx press flex size-14 items-center justify-center text-[26px]"
                  style={
                    quality === i + 1
                      ? {
                          background: "var(--a1)",
                          color: "var(--ink-solid)",
                          boxShadow: "2px 2px 0 var(--shadow)",
                          transform: "translate(4px,4px)",
                        }
                      : { background: "var(--card)" }
                  }
                >
                  {face}
                </button>
              ))}
            </div>
            <span className="font-bold">
              {qLabels[quality - 1]} · {quality} de 5
            </span>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note">¿En qué trabajaste? (opcional)</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: autenticación con JWT" />
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={onDiscard} className="bx press min-h-13 bg-card px-5 font-bold">
                Descartar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="bx press min-h-13 px-6 font-bold text-ink-solid disabled:opacity-60"
                style={{ background: "var(--a2)" }}
              >
                {saving ? "Guardando…" : "Guardar sesión"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4">
            <span className="label-xs font-bold">Tomate completado</span>
            <DialogTitle className="m-0 text-[40px] font-bold leading-[0.95] tracking-tight">
              ¡Eso es
              <br />
              oficio!
            </DialogTitle>
            <Mascot size={160} mood="celebrate" hat={equipped.hat} cape={equipped.cape} acc={equipped.acc} bg={equipped.bg} className="self-center" />
            <div className="flex flex-wrap gap-3">
              <div className="bx bg-card px-4 py-2.5">
                <div className="font-num text-[28px] font-bold leading-none">+{formatMinutesLong(durationMin)}</div>
                <span className="label-xs">a {skillName}</span>
              </div>
              <div className="bx px-4 py-2.5 text-ink-solid" style={{ background: "var(--a2)" }}>
                <div className="font-num text-[28px] font-bold leading-none">+{gains.coins} $</div>
                <span className="label-xs !text-ink-solid opacity-70">monedas</span>
              </div>
              <div className="bx px-4 py-2.5 text-ink-solid" style={{ background: "var(--a3)" }}>
                <div className="font-num text-[28px] font-bold leading-none">+{gains.xp} XP</div>
                <span className="label-xs !text-ink-solid opacity-70">nivel {level}</span>
              </div>
            </div>
            <div className="flex w-full flex-col gap-1.5">
              <div className="flex justify-between font-bold">
                <span>Nv. {level}</span>
                <span className="font-num">
                  {xpIntoLevel} / {xpForNext} XP
                </span>
              </div>
              <div className="h-5 w-full overflow-hidden rounded-chip border-[3px] border-ink bg-card">
                <div className="h-full bg-ink transition-[width]" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/tienda"
                className="bx hov press inline-flex min-h-13 items-center px-5 font-bold text-ink-solid"
                style={{ background: "var(--a3)" }}
              >
                Gastar monedas en la tienda →
              </Link>
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="bx hov press inline-flex min-h-13 items-center px-5 font-bold text-ink-solid"
                style={{ background: "var(--a1)" }}
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
