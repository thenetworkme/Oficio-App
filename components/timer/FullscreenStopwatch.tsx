"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Coffee } from "lucide-react";
import { useState } from "react";
import { formatStopwatchClock, MIN_STOPWATCH_MS } from "@/lib/stopwatch";
import { BreakNotifyInline } from "@/components/notifications/BreakNotifyInline";
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
        className="bx press flex size-11 items-center justify-center rounded-chip border-ink"
      >
        <Coffee size={19} aria-hidden="true" />
      </button>
      {open && (
        <div className="bx absolute right-0 top-[calc(100%+10px)] z-10 flex w-[280px] flex-col gap-3.5 p-4.5 text-ink">
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
              className="box-border w-full min-h-11 rounded-button border-[3px] border-ink bg-card px-3 text-[15px]"
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
              className="box-border w-full min-h-11 rounded-button border-[3px] border-ink bg-card px-3 text-[15px] disabled:opacity-50"
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
          style={{ background: onBreak ? "color-mix(in srgb, var(--a1) 20%, var(--paper))" : "var(--paper)" }}
        >
          {onBreak ? (
            <LibreBreakView remainingMs={breakRemainingMs} onEndBreakNow={onEndBreakNow} onStop={onStop} onExit={onExit} />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3.5">
                <span className="bx inline-flex min-h-11 items-center rounded-chip border-[3px] border-ink bg-card px-4.5 text-[15px] font-bold">
                  Sesión libre
                </span>
                <span className="flex-1" />
                <BreakSettingsControl
                  breakReminderMin={breakReminderMin}
                  breakLengthMin={breakLengthMin}
                  onChange={onChangeBreakSettings}
                />
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
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function fmt(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * The "on break" view for Sesión libre, structurally mirroring
 * FullscreenTimer's Pomodoro BreakView (accent-tinted background, big
 * countdown, tips list) but with libre-appropriate copy and no Pomodoro
 * concepts (no "tomate N de 4", no "+2 min" extend — the break length is
 * just whatever the user configured, and there's no next-period preview to
 * show). Per `--ink-solid` convention: this sits on an --a1 accent
 * background, so any text on that chip/background uses text-ink-solid, not
 * --ink (which would be invisible in dark themes — see globals.css).
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
      <div className="flex flex-wrap items-center gap-3.5">
        <span
          className="bx inline-flex min-h-11 items-center rounded-chip border-[3px] border-ink px-4.5 text-[15px] font-bold text-ink-solid"
          style={{ background: "var(--a1)" }}
        >
          Descanso de sesión libre
        </span>
        <span className="flex-1" />
        <SoundControl />
        <ExitChip onClick={onExit}>Salir ✕</ExitChip>
      </div>

      <main className="flex flex-1 flex-wrap items-center justify-center gap-10">
        <div className="flex max-w-[560px] flex-1 flex-col items-start gap-5">
          <span className="label-xs text-[18px]">Tómate un momento</span>
          <div
            role="timer"
            aria-label="Tiempo de descanso restante"
            className="font-num text-[70px] font-bold leading-[.9] tracking-tight sm:text-[120px] md:text-[160px]"
            style={{ textShadow: "7px 7px 0 var(--a1)", fontVariantNumeric: "tabular-nums" }}
          >
            {fmt(remainingMs / 1000)}
          </div>
          <div className="flex w-full max-w-[560px] flex-col gap-2.5">
            {LIBRE_BREAK_TIPS.map((label, i) => {
              const on = checked.includes(i);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setChecked((c) => (on ? c.filter((x) => x !== i) : c.concat(i)))}
                  className="bx press flex min-h-[56px] items-center gap-3.5 rounded-card border-[3px] border-ink px-4.5 text-left text-[18px] font-bold text-ink-solid sm:text-[20px]"
                  style={{ background: on ? "var(--a1)" : "var(--card)", color: on ? "var(--ink-solid)" : "var(--ink)" }}
                >
                  <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-md border-[3px] border-ink bg-card text-[14px] text-ink">
                    {on ? "✓" : ""}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <div className="flex flex-wrap items-center justify-end gap-3.5">
        <button type="button" onClick={onStop} className="bx press min-h-16 rounded-button border-[3px] border-ink bg-card px-5 text-[18px] font-bold sm:text-[20px]">
          Detener sesión
        </button>
        <button
          type="button"
          onClick={onEndBreakNow}
          className="bx press min-h-16 min-w-[220px] rounded-button border-[3px] border-ink px-5 text-[20px] font-bold text-ink-solid sm:text-[22px]"
          style={{ background: "var(--a1)" }}
        >
          Terminar descanso ahora
        </button>
      </div>
    </>
  );
}
