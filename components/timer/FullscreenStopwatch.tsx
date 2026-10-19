"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Coffee } from "lucide-react";
import { useState } from "react";
import { formatStopwatchClock, MIN_STOPWATCH_MS } from "@/lib/stopwatch";
import { BreakNotifyInline } from "@/components/notifications/BreakNotifyInline";
import { DotDigits } from "@/components/ui/DotDigits";
import { ExitChip, SoundControl } from "@/components/timer/FullscreenTimer";

/**
 * Fullscreen takeover for "Sesión libre" (the count-up stopwatch mode),
 * mirroring FullscreenTimer's Pomodoro takeover: a view layered on top of
 * the existing /temporizador screen + store/stopwatch-store.ts, owning none
 * of the timing/sound logic itself. There's no Pomodoro cycle here (no
 * focus/break modes, no "tomate" dots), so the normal view is one simple
 * screen rather than FullscreenTimer's Focus/Break/Zen split — but it does
 * have ONE extra internal view, `LibreBreakView`, for the optional,
 * user-configured break reminder (see store/stopwatch-store.ts's
 * breakReminderMin/breakLengthMin/onBreak). Which view renders is picked
 * purely from the `onBreak` prop, the same way FullscreenTimer picks
 * Focus/Break/Zen from `mode`/`zen` — so this follows the shared store
 * automatically, with no view-state duplicated here.
 *
 * There's no direct Punto reference screen for "Sesión libre" (every
 * PuntoFoco/PuntoFocoZen/PuntoPausa mockup is Pomodoro-only) — this
 * extrapolates the same visual language (centered DotDigits count-up clock,
 * same pill button/chip treatment, same flat chrome) rather than inventing
 * a new one.
 */

const LIBRE_BREAK_TIPS = ["Estira las piernas y los hombros", "Hidrátate", "Aléjate de la pantalla un momento"];

/**
 * Settings control for the break reminder: a speaker-icon-style button that
 * toggles a small popover with two number inputs — deliberately the exact
 * same interaction shape as SoundControl above (icon button + absolute
 * popover), so the fullscreen chrome stays consistent rather than
 * introducing a second kind of settings affordance.
 *
 * Purely controlled: the actual values and persistence (store +
 * Profile) live in the caller (temporizador/page.tsx), this only renders
 * the current values and forwards edits.
 */
export function BreakSettingsControl({
  breakReminderMin,
  breakLengthMin,
  onChange,
}: {
  breakReminderMin: number | null;
  breakLengthMin: number;
  onChange: (reminderMin: number | null, lengthMin: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const enabled = breakReminderMin != null && breakReminderMin > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Recordatorio de descanso"
        title="Recordatorio de descanso"
        className="flex size-9 items-center justify-center rounded-chip border border-border text-ink transition-colors"
      >
        <Coffee size={17} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-10 flex w-[280px] flex-col gap-3.5 rounded-card border border-line bg-card p-4.5 text-ink">
          <span className="label-xs">Recordatorio de descanso</span>
          <BreakNotifyInline />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fs-break-min" className="text-[13px] text-muted">
              Avisar cada (min, 0 = desactivado)
            </label>
            <input
              id="fs-break-min"
              type="number"
              min={0}
              max={240}
              inputMode="numeric"
              value={breakReminderMin ?? 0}
              onChange={(e) => {
                const v = Math.max(0, Math.round(Number(e.target.value) || 0));
                onChange(v > 0 ? v : null, breakLengthMin);
              }}
              className="w-full min-h-10 border-0 border-b border-border bg-transparent px-0 pb-2 pt-1 text-[15px] text-ink focus:border-signal focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fs-break-length" className="text-[13px] text-muted">
              Duración del descanso (min)
            </label>
            <input
              id="fs-break-length"
              type="number"
              min={1}
              max={60}
              inputMode="numeric"
              disabled={!enabled}
              value={breakLengthMin}
              onChange={(e) => {
                const v = Math.max(1, Math.round(Number(e.target.value) || 1));
                onChange(breakReminderMin, v);
              }}
              className="w-full min-h-10 border-0 border-b border-border bg-transparent px-0 pb-2 pt-1 text-[15px] text-ink focus:border-signal focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export interface FullscreenStopwatchProps {
  open: boolean;
  running: boolean;
  elapsedMs: number;
  hasTime: boolean;
  tooShortNotice: boolean;
  intention: string;
  breakReminderMin: number | null;
  breakLengthMin: number;
  onBreak: boolean;
  breakRemainingMs: number;
  onChangeBreakSettings: (reminderMin: number | null, lengthMin: number) => void;
  onEndBreakNow: () => void;
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
  intention,
  breakReminderMin,
  breakLengthMin,
  onBreak,
  breakRemainingMs,
  onChangeBreakSettings,
  onEndBreakNow,
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
          aria-label={onBreak ? "Pantalla completa de descanso de sesión libre" : "Pantalla completa de sesión libre"}
          className="fixed inset-0 z-50 flex flex-col gap-8 overflow-y-auto px-6 py-7 text-ink outline-none sm:px-12"
          style={{ background: "var(--paper)" }}
        >
          {onBreak ? (
            <LibreBreakView remainingMs={breakRemainingMs} onEndBreakNow={onEndBreakNow} onStop={onStop} onExit={onExit} />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-5">
                <span className="label-xs">Sesión libre</span>
                <span className="flex-1" />
                <BreakSettingsControl breakReminderMin={breakReminderMin} breakLengthMin={breakLengthMin} onChange={onChangeBreakSettings} />
                <SoundControl />
                <ExitChip onClick={onExit}>Salir ✕</ExitChip>
              </div>

              <main className="flex flex-1 flex-col items-center justify-center gap-7">
                <span className="label-xs rounded-chip px-4.5 py-1.5 text-[13px]" style={{ background: "var(--ink)", color: "var(--paper)" }}>
                  {running ? "En práctica" : hasTime ? "En pausa" : "Lista para empezar"}
                </span>
                <div className="overflow-x-auto">
                  <DotDigits value={formatStopwatchClock(elapsedMs)} size={38} gap={9} running={running} ariaLabel="Tiempo transcurrido" />
                </div>
                {intention && (
                  <div className="max-w-[900px] rounded-card border border-signal px-6 py-3 text-center text-[18px] font-medium text-ink sm:text-[22px]">
                    {intention}
                  </div>
                )}
                {tooShortNotice && (
                  <div className="max-w-[560px] rounded-card border border-line bg-card px-5 py-3 text-center text-[14px] text-muted">
                    Practica al menos {MIN_STOPWATCH_MS / 60_000} minuto para poder guardar la sesión. Tu tiempo sigue contando.
                  </div>
                )}
              </main>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onToggleRunning}
                  className="inline-flex min-h-[64px] min-w-[220px] items-center justify-center rounded-button border border-signal bg-signal text-[16px] font-medium uppercase tracking-[0.1em] text-ink-solid transition-colors hover:brightness-110"
                >
                  {running ? "Pausa" : hasTime ? "Reanudar" : "Empezar"}
                </button>
                <button
                  type="button"
                  onClick={onStop}
                  disabled={!hasTime}
                  className="inline-flex min-h-[64px] items-center rounded-button border border-border px-6 font-mono text-[13px] uppercase tracking-[0.1em] transition-colors hover:border-border-hover hover:bg-card disabled:pointer-events-none disabled:opacity-50"
                >
                  Detener
                </button>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * The "on break" view for Sesión libre, structurally mirroring
 * FullscreenTimer's Pomodoro BreakView (big countdown, tips list) but with
 * libre-appropriate copy and no Pomodoro concepts (no "tomate N de 4", no
 * "+2 min" extend — the break length is just whatever the user configured,
 * and there's no next-period preview to show).
 */
function LibreBreakView({
  remainingMs,
  onEndBreakNow,
  onStop,
  onExit,
}: {
  remainingMs: number;
  onEndBreakNow: () => void;
  onStop: () => void;
  onExit: () => void;
}) {
  const [checked, setChecked] = useState<number[]>([]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-5">
        <span className="label-xs rounded-chip border px-3.5 py-1.5" style={{ borderColor: "var(--border)" }}>
          Descanso de sesión libre
        </span>
        <span className="flex-1" />
        <SoundControl />
        <ExitChip onClick={onExit}>Salir ✕</ExitChip>
      </div>

      <main className="flex flex-1 flex-wrap items-center justify-center gap-12">
        <div className="flex max-w-[600px] flex-1 flex-col items-start gap-6">
          <span className="label-xs">Tómate un momento</span>
          <div className="overflow-x-auto">
            <DotDigits value={formatStopwatchClock(remainingMs)} size={26} gap={9} ariaLabel="Tiempo de descanso restante" />
          </div>
          <div className="flex w-full max-w-[560px] flex-col">
            {LIBRE_BREAK_TIPS.map((label, i) => {
              const on = checked.includes(i);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setChecked((c) => (on ? c.filter((x) => x !== i) : c.concat(i)))}
                  className="flex min-h-[52px] items-center gap-3.5 border-t border-line text-left text-[16px] transition-colors"
                  style={{ color: on ? "var(--ink)" : "var(--muted)" }}
                >
                  <i aria-hidden="true" className="block size-4 shrink-0 rounded-full border" style={{ background: on ? "var(--signal)" : "transparent", borderColor: on ? "var(--signal)" : "var(--border)" }} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button type="button" onClick={onStop} className="inline-flex min-h-[56px] items-center rounded-button border border-border px-5 font-mono text-[13px] uppercase tracking-[0.1em] transition-colors hover:border-border-hover hover:bg-card">
          Detener sesión
        </button>
        <button
          type="button"
          onClick={onEndBreakNow}
          className="inline-flex min-h-[56px] min-w-[220px] items-center justify-center rounded-button border border-signal bg-signal px-5 text-[14px] font-medium uppercase tracking-[0.1em] text-ink-solid transition-colors hover:brightness-110"
        >
          Terminar descanso ahora
        </button>
      </div>
    </>
  );
}
