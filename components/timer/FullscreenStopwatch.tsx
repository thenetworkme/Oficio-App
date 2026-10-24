"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Coffee } from "lucide-react";
import { useState } from "react";
import { formatStopwatchClock, MIN_STOPWATCH_MS } from "@/lib/stopwatch";
import { BreakNotifyInline } from "@/components/notifications/BreakNotifyInline";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
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
 * There's no direct Pomodoro reference screen for "Sesión libre" either
 * (every PomoFoco/PomoFocoZen/PomoPausa mockup is Pomodoro-only) — this
 * extrapolates the same visual language (giant plain count-up number
 * directly on --mode-bg, same "go"/onColor button treatment) rather than
 * inventing a new one. See the final report for this judgment call.
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
        className="flex size-9 items-center justify-center rounded-chip border transition-colors"
        style={{ background: "var(--card-tint)", color: "var(--mode-ink)", borderColor: "var(--card-tint-border)" }}
      >
        <Coffee size={17} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-10 flex w-[280px] flex-col gap-3.5 rounded-card border-0 bg-card-solid p-4.5 text-card-solid-ink shadow-[0_8px_24px_rgb(0_0_0_/_25%)]">
          <span className="label-xs">Recordatorio de descanso</span>
          <BreakNotifyInline />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fs-break-min">Avisar cada (min, 0 = desactivado)</Label>
            <Input
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
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fs-break-length">Duración del descanso (min)</Label>
            <Input
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
          className="fixed inset-0 z-50 flex flex-col gap-8 overflow-y-auto px-6 py-7 text-mode-ink outline-none sm:px-12"
          // Same portal-breaks-CSS-inheritance fix as FullscreenTimer (see
          // its own comment): --mode-bg must be redeclared here rather than
          // only read, since Radix portals this content to document.body,
          // outside the colored page root. "Sesión libre" has no modes of
          // its own, so this is always the resting focus-red, matching the
          // Temporizador page's own choice for the Libre tab.
          style={{ "--mode-bg": "var(--mode-focus)", background: "var(--mode-bg)" } as React.CSSProperties}
        >
          {onBreak ? (
            <LibreBreakView remainingMs={breakRemainingMs} onEndBreakNow={onEndBreakNow} onStop={onStop} onExit={onExit} />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-5">
                <span className="text-[14px] font-semibold text-mode-ink">Sesión libre</span>
                <span className="flex-1" />
                <BreakSettingsControl breakReminderMin={breakReminderMin} breakLengthMin={breakLengthMin} onChange={onChangeBreakSettings} />
                <SoundControl />
                <ExitChip onClick={onExit}>Salir de pantalla completa</ExitChip>
              </div>

              <main className="flex flex-1 flex-col items-center justify-center gap-5">
                {intention && <p className="m-0 max-w-[900px] text-center text-[18px] font-semibold sm:text-[20px]">{intention}</p>}
                <div
                  role="timer"
                  aria-label="Tiempo transcurrido"
                  className="font-sans text-[88px] font-bold leading-none tracking-tight tabular-nums sm:text-[150px] md:text-[220px]"
                >
                  {formatStopwatchClock(elapsedMs)}
                </div>
                <span className="text-[14px] text-mode-ink-muted">
                  {running ? "En práctica" : hasTime ? "En pausa" : "Lista para empezar"}
                </span>
                {tooShortNotice && (
                  <div className="max-w-[560px] rounded-card bg-black/15 px-5 py-3 text-center text-[14px] text-mode-ink">
                    Practica al menos {MIN_STOPWATCH_MS / 60_000} minuto para poder guardar la sesión. Tu tiempo sigue contando.
                  </div>
                )}
              </main>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <Button variant="go" size="lg" pressed={running} onClick={onToggleRunning}>
                  {running ? "Pausar" : hasTime ? "Reanudar" : "Empezar"}
                </Button>
                <Button variant="onColor" size="md" onClick={onStop} disabled={!hasTime}>
                  Detener
                </Button>
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
        <span className="inline-flex items-center rounded-chip border border-card-tint-border bg-card-tint px-3.5 py-1.5 text-[13px] font-semibold text-mode-ink">
          Descanso de sesión libre
        </span>
        <span className="flex-1" />
        <SoundControl />
        <ExitChip onClick={onExit}>Salir de pantalla completa</ExitChip>
      </div>

      <main className="flex flex-1 flex-wrap items-center justify-center gap-12">
        <div className="flex max-w-[600px] flex-1 flex-col items-center gap-5 text-center">
          <span className="text-[20px] font-semibold text-mode-ink">Tómate un momento</span>
          <div
            role="timer"
            aria-label="Tiempo de descanso restante"
            className="font-sans text-[72px] font-bold leading-none tracking-tight tabular-nums text-mode-ink sm:text-[110px]"
          >
            {formatStopwatchClock(remainingMs)}
          </div>
          <div className="mt-3 flex w-full max-w-[420px] flex-col rounded-card bg-card-solid text-card-solid-ink">
            {LIBRE_BREAK_TIPS.map((label, i) => {
              const on = checked.includes(i);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setChecked((c) => (on ? c.filter((x) => x !== i) : c.concat(i)))}
                  className="flex min-h-[52px] items-center gap-3.5 border-t border-card-solid-line px-4 text-left text-[15px] font-medium transition-colors first:border-t-0"
                  style={{ color: on ? "var(--mode-bg)" : "var(--card-solid-ink)" }}
                >
                  <i
                    aria-hidden="true"
                    className="block size-4 shrink-0 rounded-full border"
                    style={{ background: on ? "var(--mode-bg)" : "transparent", borderColor: on ? "var(--mode-bg)" : "var(--card-solid-line)" }}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <Button variant="onColor" size="md" onClick={onStop}>
          Detener sesión
        </Button>
        <Button variant="go" size="md" onClick={onEndBreakNow}>
          Terminar descanso ahora
        </Button>
      </div>
    </>
  );
}
