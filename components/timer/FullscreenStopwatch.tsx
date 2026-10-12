"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { formatStopwatchClock, MIN_STOPWATCH_MS } from "@/lib/stopwatch";
import { ExitChip, SoundControl } from "@/components/timer/FullscreenTimer";
import type { Skill } from "@/lib/types";

/**
 * Fullscreen takeover for "Sesión libre" (the count-up stopwatch mode),
 * mirroring FullscreenTimer's Pomodoro takeover: a view layered on top of
 * the existing /temporizador screen + store/stopwatch-store.ts, owning none
 * of the timing/sound logic itself. There's no Pomodoro cycle here (no
 * focus/break modes, no "tomate" dots), so this is one simple view rather
 * than FullscreenTimer's Focus/Break/Zen split — just the running clock,
 * play/pause, and stop.
 */

export interface FullscreenStopwatchProps {
  open: boolean;
  running: boolean;
  elapsedMs: number;
  hasTime: boolean;
  tooShortNotice: boolean;
  skill: Skill | null;
  intention: string;
  onToggleRunning: () => void;
  onStop: () => void;
  onExit: () => void;
}

export function FullscreenStopwatch({
  open,
  running,
  elapsedMs,
  hasTime,
  tooShortNotice,
  skill,
  intention,
  onToggleRunning,
  onStop,
  onExit,
}: FullscreenStopwatchProps) {
  function handleEscape(e: KeyboardEvent | Event) {
    e.preventDefault();
    onExit();
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onExit()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-paper" />
        <DialogPrimitive.Content
          onEscapeKeyDown={handleEscape}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            document.getElementById("fs-timer-exit")?.focus();
          }}
          aria-label="Pantalla completa de sesión libre"
          className="fixed inset-0 z-50 flex flex-col gap-8 overflow-y-auto bg-paper px-6 py-7 text-ink outline-none sm:px-12"
        >
          <div className="flex flex-wrap items-center gap-3.5">
            <span
              className="bx inline-flex min-h-11 items-center gap-2.5 rounded-chip border-[3px] border-ink px-4.5 text-[15px] font-bold text-ink-solid"
              style={{ background: "var(--a3)" }}
            >
              <span aria-hidden="true" className="size-3.5 rounded-full border-[3px] border-ink" style={{ background: "var(--a1)" }} />
              {skill?.name ?? "Sin habilidad"}
            </span>
            <span className="bx inline-flex min-h-11 items-center rounded-chip border-[3px] border-ink bg-card px-4.5 text-[15px] font-bold">
              Sesión libre
            </span>
            <span className="flex-1" />
            <SoundControl />
            <ExitChip onClick={onExit}>Salir ✕</ExitChip>
          </div>

          <main className="flex flex-1 flex-col items-center justify-center gap-6">
            <span className="label-xs rounded-chip px-4.5 py-1.5 text-[16px]" style={{ background: "var(--ink)", color: "var(--paper)" }}>
              {running ? "En práctica" : hasTime ? "En pausa" : "Lista para empezar"}
            </span>
            <div
              role="timer"
              aria-label="Tiempo transcurrido"
              className="font-num text-[88px] font-bold leading-[.9] tracking-tight sm:text-[160px] md:text-[220px]"
              style={{ textShadow: `8px 8px 0 ${running ? "var(--a3)" : "var(--muted)"}`, fontVariantNumeric: "tabular-nums" }}
            >
              {formatStopwatchClock(elapsedMs)}
            </div>
            {intention && (
              <div
                className="bx max-w-[900px] rounded-card border-[3px] border-ink px-6 py-3 text-center text-[20px] font-bold text-ink-solid sm:text-[26px]"
                style={{ background: "var(--a1)", transform: "rotate(-1.2deg)" }}
              >
                {intention}
              </div>
            )}
            {tooShortNotice && (
              <div className="bx max-w-[560px] px-4 py-2.5 text-center text-[15px] font-bold text-ink-solid" style={{ background: "var(--a1)" }}>
                Practica al menos {MIN_STOPWATCH_MS / 60_000} minuto para poder guardar la sesión. Tu tiempo sigue contando.
              </div>
            )}
          </main>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onToggleRunning}
              className="bx press min-h-[72px] min-w-[220px] rounded-button border-[3px] border-ink text-[22px] font-bold text-ink-solid sm:text-[26px]"
              style={{ background: running ? "var(--a1)" : "var(--a3)" }}
            >
              {running ? "Pausa" : hasTime ? "Reanudar" : "Dale"}
            </button>
            <button
              type="button"
              onClick={onStop}
              disabled={!hasTime}
              className="bx press min-h-[72px] rounded-button border-[3px] border-ink bg-card px-6 text-[18px] font-bold disabled:opacity-60 sm:text-[20px]"
            >
              Detener
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
