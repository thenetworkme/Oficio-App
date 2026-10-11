"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDateEs, formatInt } from "@/lib/format";

const MILESTONE_COPY: Record<number, { title: string; text: string }> = {
  1: { title: "Primer paso", text: "Empezaste. Lo más difícil ya está hecho." },
  10: { title: "Calentamiento", text: "Diez horas de práctica. Ya no eres principiante absoluto." },
  100: { title: "Constancia", text: "Cien horas reales. Esto ya es un hábito." },
  500: { title: "Medio millar", text: "Quinientas horas de práctica acumulada." },
  1000: { title: "Mil horas", text: "Lo que antes costaba, hoy sale casi solo." },
  5000: { title: "Mitad del camino", text: "Cinco mil horas. El oficio ya se nota." },
  10000: { title: "Maestría", text: "Diez mil horas. Esto es oficio." },
};

function useConfetti(enabled: boolean) {
  return useMemo(() => {
    if (!enabled) return [];
    let seed = 7;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const palette = ["var(--accent)", "var(--text)", "var(--a2)", "var(--a3)"];
    return Array.from({ length: 40 }, () => {
      const round = rand() > 0.6;
      const w = 6 + Math.round(rand() * 6);
      return {
        left: `${Math.round(rand() * 100)}%`,
        w,
        h: round ? w : w + 6,
        r: round ? "50%" : "2px",
        bg: palette[Math.floor(rand() * palette.length)],
        dx: `${Math.round((rand() - 0.5) * 240)}px`,
        delay: `${(rand() * 0.9).toFixed(2)}s`,
        dur: `${(2.6 + rand() * 1.6).toFixed(2)}s`,
      };
    });
  }, [enabled]);
}

export function CelebrationDialog({
  open,
  onClose,
  skillName,
  skillColor,
  hours,
  achievedAt,
  startedAt,
}: {
  open: boolean;
  onClose: () => void;
  skillName: string;
  skillColor: string;
  hours: number;
  achievedAt: number | null;
  startedAt: number | null;
}) {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const confetti = useConfetti(open && !reducedMotion);
  const copy = MILESTONE_COPY[hours] ?? { title: `${formatInt(hours)} horas`, text: "Un hito más en tu camino." };

  const tookText = (() => {
    if (!achievedAt || !startedAt) return null;
    const days = Math.max(1, Math.round((achievedAt - startedAt) / 86_400_000));
    if (days === 1) return "Te tomó 1 día";
    if (days < 14) return `Te tomó ${days} días`;
    if (days < 90) return `Te tomó ${Math.round(days / 7)} semanas`;
    return `Te tomó ${Math.round(days / 30.4)} meses`;
  })();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-[520px] text-center"
        aria-describedby={undefined}
        style={{ overflow: "hidden" }}
      >
        {confetti.length > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            {confetti.map((p, i) => (
              <span
                key={i}
                className="cf-piece"
                style={{
                  left: p.left,
                  width: p.w,
                  height: p.h,
                  background: p.bg,
                  borderRadius: p.r,
                  ["--dx" as string]: p.dx,
                  animation: `cf-fall ${p.dur} ease-in ${p.delay} 1 both`,
                }}
              />
            ))}
          </div>
        )}
        <div className="relative flex flex-col items-center gap-4.5">
          <span className="label-xs">Hito desbloqueado · {skillName}</span>
          <div className="relative flex size-[150px] items-center justify-center">
            <svg width="150" height="150" viewBox="0 0 150 150" fill="none" className="absolute inset-0 -rotate-90" aria-hidden="true">
              <circle cx="75" cy="75" r="60" stroke="var(--track)" strokeWidth="8" />
              <circle
                cx="75"
                cy="75"
                r="60"
                stroke={skillColor}
                strokeWidth="8"
                strokeLinecap="round"
                className={reducedMotion ? undefined : "cf-ring"}
                style={reducedMotion ? { strokeDasharray: 377, strokeDashoffset: 0 } : undefined}
              />
            </svg>
            <span className="relative flex flex-col items-center leading-tight">
              <span className="font-num text-[28px] font-medium tracking-tight">{formatInt(hours)}</span>
              <span className="text-[13px] text-muted">horas</span>
            </span>
          </div>
          <DialogTitle className="m-0 text-[32px] font-extrabold leading-tight tracking-tight">
            {copy.title}
          </DialogTitle>
          <p className="m-0 max-w-[380px] text-[16px] text-muted">{copy.text}</p>
          <div className="flex flex-wrap justify-center gap-2.5 text-[13px] text-muted">
            {achievedAt && (
              <span className="rounded-full border border-line px-3 py-1.5">{formatDateEs(new Date(achievedAt))}</span>
            )}
            {tookText && <span className="rounded-full border border-line px-3 py-1.5">{tookText}</span>}
          </div>
          <Button onClick={onClose} className="mt-1.5">
            Seguir practicando
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
