"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { AmbientPicker } from "@/components/sound/AmbientPicker";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useSound } from "@/lib/sound/SoundProvider";
import type { Skill } from "@/lib/types";

/**
 * Fullscreen Pomodoro takeover (design-reference/punto): PuntoFoco /
 * PuntoFocoZen / PuntoPausaCorta / PuntoPausaLarga.
 *
 * These are view states of the *existing* /temporizador screen and
 * store/timer-store.ts, not a parallel timer. This component owns none of
 * the timer math or sound logic — it only renders whatever the caller hands
 * it (remaining/total/running/mode) and forwards clicks to callbacks that the
 * Temporizador page wires to the real store + useSound(), so there is exactly
 * one source of truth for both. "Foco" vs. the short/long break screens are
 * picked purely from `mode`, so the fullscreen flow follows store.mode
 * automatically as the Pomodoro cycle advances.
 *
 * Built on Radix Dialog (already used by SessionSaveDialog) rather than a
 * hand-rolled overlay: it gives us, for free and already battle-tested in
 * this app, a focus trap, focus-restore-on-close, `aria-modal`/role="dialog"
 * semantics, and body-scroll locking. Escape is intercepted (not left to
 * Radix's default close) so it can step down one level at a time — zen ->
 * colored fullscreen -> normal screen — per the spec.
 */

const SHORT_BREAK_TIPS = ["Estira las muñecas 30 s", "Toma un vaso de agua", "Mira algo lejano 20 s"];
const LONG_BREAK_TIPS = ["Camina 5 minutos", "Come algo y toma agua", "Diez minutos sin pantallas"];

/**
 * Sound control for the fullscreen views: a speaker icon that both shows
 * whether sound is muted and toggles a small popover with a single
 * "mute everything right now" switch plus the same AmbientPicker
 * (Lluvia/Olas/Lofi/... + volume) used on the normal Temporizador screen and
 * in Ajustes. The mute switch here calls sound.toggleAllSound() rather than
 * setSoundEffectsEnabled() directly — toggleAllSound also stops/resumes any
 * currently-playing ambient loop, so this one button genuinely silences (and
 * restores) everything audible during a session, not just the short effect
 * chimes. Ajustes -> Perfil's own "Efectos de sonido" switch still calls
 * setSoundEffectsEnabled() and stays a narrower, effects-only toggle on
 * purpose. Collapsed by default so it doesn't clutter the giant time
 * display; the whole point of focus mode.
 */
export function SoundControl({ zen = false }: { zen?: boolean }) {
  const sound = useSound();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Sonido"
        title="Sonido"
        className="flex size-9 items-center justify-center rounded-chip border transition-colors"
        style={
          zen
            ? { background: "transparent", color: "#FFF4D6", borderColor: "rgb(255 244 214 / 30%)" }
            : { background: "var(--card-tint)", color: "var(--mode-ink)", borderColor: "var(--card-tint-border)" }
        }
      >
        {sound.soundEffectsEnabled ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-10 flex w-[280px] flex-col gap-4 rounded-card border-0 bg-card-solid p-4.5 text-card-solid-ink shadow-[0_8px_24px_rgb(0_0_0_/_25%)]">
          <button
            type="button"
            onClick={() => sound.toggleAllSound()}
            className="flex min-h-10 items-center justify-center gap-2.5 rounded-button bg-surface-muted font-mono text-[12px] uppercase tracking-[0.1em] text-surface-muted-ink transition-colors hover:bg-surface-muted-hover"
          >
            {sound.soundEffectsEnabled ? (
              <>
                <Volume2 size={16} aria-hidden="true" /> Sonido activado
              </>
            ) : (
              <>
                <VolumeX size={16} aria-hidden="true" /> Sonido silenciado
              </>
            )}
          </button>
          <AmbientPicker label="Sonido ambiente" />
        </div>
      )}
    </div>
  );
}

export interface FullscreenTimerProps {
  open: boolean;
  mode: "focus" | "short" | "long";
  zen: boolean;
  running: boolean;
  remaining: number;
  total: number;
  /** "Tomate N de 4" dot fill for the current cycle, 0-4. */
  dotsFilled: number;
  /** 1-based index of the tomato currently in progress while in focus mode. */
  currentTomato: number;
  skill: Skill | null;
  intention: string;
  /** e.g. "reto día 12" for the linked challenge, if the current skill has one active. */
  challengeDayLabel: string | null;
  onToggleRunning: () => void;
  onExtend: (seconds: number) => void;
  onFinishNow: () => void;
  onSkipBreak: () => void;
  onToggleZen: () => void;
  onExit: () => void;
}

export function FullscreenTimer({
  open,
  mode,
  zen,
  running,
  remaining,
  total,
  dotsFilled,
  currentTomato,
  skill,
  intention,
  challengeDayLabel,
  onToggleRunning,
  onExtend,
  onFinishNow,
  onSkipBreak,
  onToggleZen,
  onExit,
}: FullscreenTimerProps) {
  function handleEscape(e: KeyboardEvent | Event) {
    e.preventDefault();
    if (zen) {
      onToggleZen();
    } else {
      onExit();
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onExit()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-paper" />
        <DialogPrimitive.Content
          onEscapeKeyDown={handleEscape}
          onOpenAutoFocus={(e) => {
            // Focus the exit control rather than the first focusable chip,
            // so a keyboard/screen-reader user lands somewhere orienting.
            e.preventDefault();
            document.getElementById("fs-timer-exit")?.focus();
          }}
          aria-label={zen ? "Modo zen" : mode === "focus" ? "Pantalla completa de enfoque" : "Pantalla completa de descanso"}
          className="fixed inset-0 z-50 flex outline-none"
          // Radix Dialog content is portaled to document.body, OUTSIDE the
          // Temporizador page's own DOM subtree — CSS custom-property
          // inheritance follows the DOM tree, not the React tree, so
          // --mode-bg set on the page's root does NOT reach here through
          // the portal. Re-declaring it here, driven by this component's
          // own `mode` prop, is required for the "go" button text color
          // and every var(--mode-bg) read inside FocusView/BreakView to
          // resolve to the right color — caught via a real-Chromium
          // screenshot during this phase's verification (every fullscreen
          // break view rendered focus-red instead of teal/blue without
          // this). Zen ignores it (fixed #1d1d1f, not mode-colored).
          style={{ "--mode-bg": `var(--mode-${mode})` } as React.CSSProperties}
        >
          {zen ? (
            <ZenView
              skill={skill}
              currentTomato={currentTomato}
              running={running}
              remaining={remaining}
              total={total}
              onToggleRunning={onToggleRunning}
              onExtend={() => onExtend(300)}
              onFinishNow={onFinishNow}
              onExit={onToggleZen}
            />
          ) : mode === "focus" ? (
            <FocusView
              skill={skill}
              currentTomato={currentTomato}
              dotsFilled={dotsFilled}
              challengeDayLabel={challengeDayLabel}
              intention={intention}
              running={running}
              remaining={remaining}
              total={total}
              onToggleRunning={onToggleRunning}
              onExtend={() => onExtend(300)}
              onFinishNow={onFinishNow}
              onToggleZen={onToggleZen}
              onExit={onExit}
            />
          ) : (
            <BreakView
              // Remount (and so reset the checklist) whenever a *new* break
              // starts: mode flips short<->long, or dotsFilled advances
              // (each short break in a cycle happens at a different count).
              key={`${mode}-${dotsFilled}`}
              long={mode === "long"}
              skill={skill}
              dotsFilled={dotsFilled}
              remaining={remaining}
              total={total}
              onExtend={() => onExtend(120)}
              onSkipBreak={onSkipBreak}
              onExit={onExit}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ExitChip({ onClick, children, zen = false }: { onClick: () => void; children: React.ReactNode; zen?: boolean }) {
  return (
    <button
      id="fs-timer-exit"
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center rounded-chip border px-4 text-[13px] font-semibold transition-colors"
      style={
        zen
          ? { background: "transparent", color: "#FFF4D6", borderColor: "rgb(255 244 214 / 30%)" }
          : { background: "var(--card-tint)", color: "var(--mode-ink)", borderColor: "var(--card-tint-border)" }
      }
    >
      {children}
    </button>
  );
}

/** Reference's fullscreen progress bar (PomoFoco.dc.html): one thin filled
 * bar directly under the giant number, not the normal page's minute-tick
 * strip — see Phase 1's "no 100-tick ruler" note, confirmed again here by
 * the reference's own fullscreen markup. */
export function FsProgress({ total, elapsed, width = 560, dim = false }: { total: number; elapsed: number; width?: number; dim?: boolean }) {
  const pct = total > 0 ? (elapsed / total) * 100 : 0;
  return (
    <div className="w-full" style={{ maxWidth: width }}>
      <ProgressBar
        pct={pct}
        color={dim ? "#FFF4D6" : "var(--mode-ink)"}
        trackColor={dim ? "rgb(255 244 214 / 15%)" : "rgb(255 255 255 / 20%)"}
        height={dim ? 2 : 6}
        ariaLabel="Progreso"
      />
    </div>
  );
}

function FocusView({
  skill,
  currentTomato,
  dotsFilled,
  challengeDayLabel,
  intention,
  running,
  remaining,
  total,
  onToggleRunning,
  onExtend,
  onFinishNow,
  onToggleZen,
  onExit,
}: {
  skill: Skill | null;
  currentTomato: number;
  dotsFilled: number;
  challengeDayLabel: string | null;
  intention: string;
  running: boolean;
  remaining: number;
  total: number;
  onToggleRunning: () => void;
  onExtend: () => void;
  onFinishNow: () => void;
  onToggleZen: () => void;
  onExit: () => void;
}) {
  const atZero = remaining <= 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return (
    <div
      className="flex size-full flex-col gap-8 overflow-y-auto px-6 py-7 text-mode-ink sm:px-12"
      style={{ background: "var(--mode-bg)" }}
    >
      <div className="flex flex-wrap items-center gap-5">
        <span className="text-[14px] text-mode-ink-muted">
          <span className="font-semibold text-mode-ink">{skill?.name ?? "Sin habilidad"}</span>
          {challengeDayLabel ? ` · ${challengeDayLabel}` : ""} · Tomate {currentTomato} de 4
        </span>
        <span aria-hidden="true" className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="size-2 rounded-full"
              style={{ background: i < dotsFilled ? "var(--mode-ink)" : "rgb(255 255 255 / 30%)" }}
            />
          ))}
        </span>
        <span className="flex-1" />
        <SoundControl />
        <button type="button" onClick={onToggleZen} className="text-[13px] text-mode-ink-muted underline decoration-white/40 underline-offset-4 transition-colors hover:text-mode-ink">
          Modo zen
        </button>
        <ExitChip onClick={onExit}>Salir de pantalla completa</ExitChip>
      </div>

      <main className="flex flex-1 flex-col items-center justify-center gap-5">
        {intention && <p className="m-0 max-w-[900px] text-center text-[18px] font-semibold sm:text-[20px]">{intention}</p>}
        <div
          role="timer"
          aria-label="Tiempo restante"
          className="font-sans text-[88px] font-bold leading-none tracking-tight tabular-nums sm:text-[150px] md:text-[220px]"
        >
          {mm}:{ss}
        </div>
        <FsProgress total={total} elapsed={total - remaining} />
      </main>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <Button variant="go" size="lg" pressed={running} onClick={onToggleRunning} disabled={atZero}>
          {atZero ? "Listo" : running ? "Pausar" : "Seguir"}
        </Button>
        <Button variant="onColor" size="md" onClick={onExtend}>
          + 5 min
        </Button>
        <Button variant="onColor" size="md" onClick={onFinishNow}>
          Terminar ya
        </Button>
      </div>
    </div>
  );
}

function BreakView({
  long,
  skill,
  dotsFilled,
  remaining,
  total,
  onExtend,
  onSkipBreak,
  onExit,
}: {
  long: boolean;
  skill: Skill | null;
  dotsFilled: number;
  remaining: number;
  total: number;
  onExtend: () => void;
  onSkipBreak: () => void;
  onExit: () => void;
}) {
  const tips = long ? LONG_BREAK_TIPS : SHORT_BREAK_TIPS;
  // Checklist is presentational only, not persisted anywhere. It resets
  // whenever a fresh break starts because the parent remounts this
  // component with key={mode} on a short<->long transition; within the
  // same break it simply keeps the checks the user made.
  const [checked, setChecked] = useState<number[]>([]);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div
      className="flex size-full flex-col gap-8 overflow-y-auto px-6 py-7 text-mode-ink sm:px-12"
      style={{ background: "var(--mode-bg)" }}
    >
      <div className="flex flex-wrap items-center gap-5">
        <span className="inline-flex items-center rounded-chip border border-card-tint-border bg-card-tint px-3.5 py-1.5 text-[13px] font-semibold">
          {long ? "Descanso largo · ciclo completo" : "Descanso corto"}
        </span>
        <span className="text-[14px] text-mode-ink-muted">{long ? "4 de 4 tomates" : `Tomate ${dotsFilled} de 4 hecho`}</span>
        <span className="flex-1" />
        <SoundControl />
        <ExitChip onClick={onExit}>Salir de pantalla completa</ExitChip>
      </div>

      <main className="flex flex-1 flex-wrap items-center justify-center gap-12">
        <div className="flex max-w-[600px] flex-1 flex-col items-center gap-5 text-center">
          <span className="text-[20px] font-semibold">{long ? "Te lo ganaste" : "Respira un momento"}</span>
          <div
            role="timer"
            aria-label="Tiempo de descanso restante"
            className="font-sans text-[72px] font-bold leading-none tracking-tight tabular-nums sm:text-[110px]"
          >
            {mm}:{ss}
          </div>
          <FsProgress total={total} elapsed={total - remaining} />
          <div className="mt-3 flex w-full max-w-[420px] flex-col rounded-card bg-card-solid text-card-solid-ink">
            {tips.map((label, i) => {
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

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="rounded-chip border border-card-tint-border px-5 py-2.5 text-[13px] text-mode-ink-muted">
          Siguiente: {skill?.name ?? "—"} · tomate {long ? "1 del nuevo ciclo" : "siguiente"}
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="onColor" size="md" onClick={onExtend}>
            + 2 min
          </Button>
          <Button variant="go" size="md" onClick={onSkipBreak}>
            Saltar descanso
          </Button>
        </div>
      </div>
    </div>
  );
}

function ZenView({
  skill,
  currentTomato,
  running,
  remaining,
  total,
  onToggleRunning,
  onExtend,
  onFinishNow,
  onExit,
}: {
  skill: Skill | null;
  currentTomato: number;
  running: boolean;
  remaining: number;
  total: number;
  onToggleRunning: () => void;
  onExtend: () => void;
  onFinishNow: () => void;
  onExit: () => void;
}) {
  const atZero = remaining <= 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  // Fixed near-black #1d1d1f, NOT the live mode color — confirmed against
  // PomoFocoZen.png/.dc.html, which keeps zen mode on one neutral dark
  // surface regardless of focus/short/long (unlike every other fullscreen
  // view, which always shows the real --mode-bg). Header + controls sit at
  // reduced opacity until hovered/focused, matching the reference's own
  // `opacity:.28` chrome.
  return (
    <div className="flex size-full flex-col" style={{ background: "#1d1d1f", color: "#fff" }}>
      <div className="flex items-center justify-between px-9 py-6 opacity-30 transition-opacity hover:opacity-100 focus-within:opacity-100">
        <span className="flex items-center gap-2 text-[18px] font-bold tracking-tight">Oficio</span>
        <ExitChip zen onClick={onExit}>
          Modo normal
        </ExitChip>
      </div>

      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-16">
        <span className="text-[16px] font-semibold opacity-90">
          {skill?.name ?? "Sin habilidad"} · tomate {currentTomato} de 4
        </span>
        <div
          role="timer"
          aria-label="Tiempo restante"
          className="font-sans text-[96px] font-light leading-none tracking-tight tabular-nums sm:text-[160px] md:text-[220px]"
        >
          {mm}:{ss}
        </div>
        <FsProgress total={total} elapsed={total - remaining} dim />
        <div className="mt-6 flex flex-wrap justify-center gap-2.5 opacity-30 transition-opacity hover:opacity-100 focus-within:opacity-100">
          <Button variant="go" size="md" pressed={running} onClick={onToggleRunning} disabled={atZero}>
            {atZero ? "Listo" : running ? "Pausar" : "Seguir"}
          </Button>
          <ExitChip zen onClick={onExtend}>
            + 5 min
          </ExitChip>
          <ExitChip zen onClick={onFinishNow}>
            Terminar ya
          </ExitChip>
        </div>
      </main>
    </div>
  );
}
