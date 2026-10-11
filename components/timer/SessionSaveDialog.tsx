"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatMinutes } from "@/lib/format";

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
  onSave: (quality: number, note: string) => void;
  onDiscard: () => void;
}) {
  const [quality, setQuality] = useState(4);
  const [note, setNote] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onDiscard()}>
      <DialogContent showClose={false} aria-describedby={undefined}>
        <div className="flex flex-col gap-5">
          <DialogTitle className="m-0 text-2xl font-extrabold">¡Pomodoro completado!</DialogTitle>
          <p className="m-0 text-muted">
            Guarda {formatMinutes(durationMin)} de {skillName}. ¿Qué tan enfocado estuviste?
          </p>
          <div role="group" aria-label="Calidad de la práctica" className="flex flex-wrap items-center gap-2.5">
            <span className="text-[13px] text-muted">Disperso</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={quality === n}
                aria-label={`Calidad ${n} de 5`}
                onClick={() => setQuality(n)}
                className="font-num size-11 rounded-full border text-[15px] font-medium"
                style={{
                  borderColor: quality === n ? "var(--accent)" : "var(--line)",
                  background: quality === n ? "var(--accent)" : "transparent",
                  color: quality === n ? "var(--on)" : "var(--text)",
                }}
              >
                {n}
              </button>
            ))}
            <span className="text-[13px] text-muted">En flow</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Nota (opcional)</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Qué practicaste" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onDiscard}>
              Descartar
            </Button>
            <Button onClick={() => onSave(quality, note)}>Guardar sesión</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
