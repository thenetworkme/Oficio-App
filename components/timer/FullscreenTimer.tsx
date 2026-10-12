"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { AmbientPicker } from "@/components/sound/AmbientPicker";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useSound } from "@/lib/sound/SoundProvider";
import type { Skill } from "@/lib/types";

/**
 * Fullscreen Pomodoro takeover (design-reference/pomodoro-fullscreen):
 * PegatinaFoco / PegatinaFocoZen / PegatinaPausaCorta / PegatinaPausaLarga.
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

  const iconButtonClass = zen
    ? "press flex size-11 items-center justify-center rounded-chip border-[3px]"
    : "bx press flex size-11 items-center justify-center rounded-chip border-ink";
  const iconButtonStyle = zen
    ? { background: "transparent", color: "#FFF4D6", borderColor: "#FFF4D6" }
    : undefined;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Sonido"
        title="Sonido"
        className={iconButtonClass}
        style={iconButtonStyle}
      >
        {sound.soundEffectsEnabled ? <Volume2 size={19} aria-hidden="true" /> : <VolumeX size={19} aria-hidden="true" />}
      </button>
      {open && (
        <div className="bx absolute right-0 top-[calc(100%+10px)] z-10 flex w-[280px] flex-col gap-4 p-4.5 text-ink">
          <button
            type="button"
            onClick={() => sound.toggleAllSound()}
            className="bx press flex min-h-11 items-center justify-center gap-2.5 bg-card text-[14px] font-bold"
          >
            {sound.soundEffectsEnabled ? (
              <>
                <Volume2 size={18} aria-hidden="true" /> Sonido activado
              </>
            ) : (
              <>
                <VolumeX size={18} aria-hidden="true" /> Sonido silenciado
              </>
            )}
          </button>
          <AmbientPicker label="Sonido ambiente" />
        </div>
      )}
    </div>
  );
}

function fmt(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
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
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((1 - remaining / total) * 100))) : 0;

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
        >
          {zen ? (
            <ZenView
              skill={skill}
              currentTomato={currentTomato}
              running={running}
              remaining={remaining}
              pct={pct}
              onToggleRunning={onToggleRunning}
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
              pct={pct}
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
              pct={pct}
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
      className={
        zen
          ? "bx press min-h-11 rounded-chip border-[3px] px-4.5 text-[15px] font-bold"
          : "bx press min-h-11 rounded-chip border-[3px] border-ink px-4.5 text-[15px] font-bold text-ink-solid"
      }
      style={zen ? { background: "transparent", color: "#FFF4D6", borderColor: "#FFF4D6" } : { background: "var(--a2)" }}
    >
      {children}
    </button>
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
  pct,
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
  pct: number;
  onToggleRunning: () => void;
  onExtend: () => void;
  onFinishNow: () => void;
  onToggleZen: () => void;
  onExit: () => void;
}) {
  const atZero = remaining <= 0;
  return (
    <div className="flex size-full flex-col gap-8 overflow-y-auto bg-paper px-6 py-7 text-ink sm:px-12">
      <div className="flex flex-wrap items-center gap-3.5">
        <span
          className="bx inline-flex min-h-11 items-center gap-2.5 rounded-chip border-[3px] border-ink px-4.5 text-[15px] font-bold text-ink-solid"
          style={{ background: "var(--a3)" }}
        >
          <span aria-hidden="true" className="size-3.5 rounded-full border-[3px] border-ink" style={{ background: "var(--a1)" }} />
          {skill?.name ?? "Sin habilidad"}
          {challengeDayLabel ? ` · ${challengeDayLabel}` : ""}
        </span>
        <span className="bx inline-flex min-h-11 items-center gap-2.5 rounded-chip border-[3px] border-ink bg-card px-4.5 text-[15px] font-bold">
          <span className="font-bold">Tomate {currentTomato} de 4</span>
          <span aria-hidden="true" className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="size-4 rounded-full border-[3px] border-ink"
                style={{ background: i < dotsFilled ? "var(--a2)" : i === dotsFilled ? "var(--a1)" : "var(--paper)" }}
              />
            ))}
          </span>
        </span>
        <span className="flex-1" />
        <SoundControl />
        <button type="button" onClick={onToggleZen} className="bx press min-h-11 rounded-chip border-[3px] border-ink bg-card px-4.5 text-[15px] font-bold">
          Modo zen
        </button>
        <ExitChip onClick={onExit}>Salir ✕</ExitChip>
      </div>

      <main className="flex flex-1 flex-col items-center justify-center gap-6">
        <span
          className="label-xs rounded-chip px-4.5 py-1.5 text-[16px]"
          style={{ background: "var(--ink)", color: "var(--paper)" }}
        >
          {atZero ? "Tomate listo" : running ? "Enfoque" : "En pausa"}
        </span>
        <div
          role="timer"
          aria-label="Tiempo restante"
          className="font-num text-[88px] font-bold leading-[.9] tracking-tight sm:text-[160px] md:text-[220px]"
          style={{ textShadow: `8px 8px 0 ${running ? "var(--a2)" : "var(--muted)"}`, fontVariantNumeric: "tabular-nums" }}
        >
          {fmt(remaining)}
        </div>
        {intention && (
          <div
            className="bx max-w-[900px] rounded-card border-[3px] border-ink px-6 py-3 text-center text-[20px] font-bold text-ink-solid sm:text-[26px]"
            style={{ background: "var(--a1)", transform: "rotate(-1.2deg)" }}
          >
            {intention}
          </div>
        )}
      </main>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={onToggleRunning}
          disabled={atZero}
          className="bx press min-h-[72px] min-w-[220px] rounded-button border-[3px] border-ink text-[22px] font-bold text-ink-solid disabled:opacity-60 sm:text-[26px]"
          style={{ background: running ? "var(--a1)" : "var(--a3)" }}
        >
          {atZero ? "Listo" : running ? "Pausa" : "Reanudar"}
        </button>
        <button type="button" onClick={onExtend} className="bx press min-h-[72px] rounded-button border-[3px] border-ink bg-card px-6 text-[18px] font-bold sm:text-[20px]">
          + 5 min
        </button>
        <button type="button" onClick={onFinishNow} className="bx press min-h-[72px] rounded-button border-[3px] border-ink bg-card px-6 text-[18px] font-bold sm:text-[20px]">
          Terminar ya
        </button>
      </div>

      <ProgressBar pct={pct} color="var(--a2)" ariaLabel="Progreso del tomate" height={30} />
    </div>
  );
}

function BreakView({
  long,
  skill,
  dotsFilled,
  remaining,
  pct,
  onExtend,
  onSkipBreak,
  onExit,
}: {
  long: boolean;
  skill: Skill | null;
  dotsFilled: number;
  remaining: number;
  pct: number;
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

  const accent = long ? "#7CC4FF" : "var(--a3)";
  const bgTint = long ? "color-mix(in srgb, #7CC4FF 20%, var(--paper))" : "color-mix(in srgb, var(--a3) 20%, var(--paper))";

  return (
    <div className="flex size-full flex-col gap-8 overflow-y-auto px-6 py-7 text-ink sm:px-12" style={{ background: bgTint }}>
      <div className="flex flex-wrap items-center gap-3.5">
        <span
          className="bx inline-flex min-h-11 items-center rounded-chip border-[3px] border-ink px-4.5 text-[15px] font-bold text-ink-solid"
          style={{ background: accent }}
        >
          {long ? "Descanso largo · ciclo completo" : "Descanso corto"}
        </span>
        <span className="bx inline-flex min-h-11 items-center gap-2.5 rounded-chip border-[3px] border-ink bg-card px-4.5 text-[15px] font-bold">
          <span className="font-bold">{long ? "4 de 4 tomates" : `Tomate ${dotsFilled} de 4 hecho`}</span>
          <span aria-hidden="true" className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="size-4 rounded-full border-[3px] border-ink" style={{ background: i < dotsFilled || long ? "var(--a2)" : "var(--paper)" }} />
            ))}
          </span>
        </span>
        <span className="flex-1" />
        <SoundControl />
        <ExitChip onClick={onExit}>Salir ✕</ExitChip>
      </div>

      <main className="flex flex-1 flex-wrap items-center justify-center gap-10">
        <div className="flex max-w-[560px] flex-1 flex-col items-start gap-5">
          <span className="label-xs text-[18px]">{long ? "Te lo ganaste" : "Respira un momento"}</span>
          <div
            role="timer"
            aria-label="Tiempo de descanso restante"
            className="font-num text-[70px] font-bold leading-[.9] tracking-tight sm:text-[120px] md:text-[160px]"
            style={{ textShadow: `7px 7px 0 ${accent}`, fontVariantNumeric: "tabular-nums" }}
          >
            {fmt(remaining)}
          </div>
          <div className="flex w-full max-w-[560px] flex-col gap-2.5">
            {tips.map((label, i) => {
              const on = checked.includes(i);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setChecked((c) => (on ? c.filter((x) => x !== i) : c.concat(i)))}
                  className="bx press flex min-h-[56px] items-center gap-3.5 rounded-card border-[3px] border-ink px-4.5 text-left text-[18px] font-bold text-ink-solid sm:text-[20px]"
                  style={{ background: on ? "var(--a3)" : "var(--card)", color: on ? "var(--ink-solid)" : "var(--ink)" }}
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

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="bx rounded-card border-[3px] border-ink bg-card px-5 py-2.5 text-[16px] font-bold sm:text-[18px]">
          Siguiente: {skill?.name ?? "—"} · 25 min · tomate {long ? "1 del nuevo ciclo" : "siguiente"}
        </div>
        <div className="flex flex-wrap gap-3.5">
          <button type="button" onClick={onExtend} className="bx press min-h-16 rounded-button border-[3px] border-ink bg-card px-5 text-[18px] font-bold sm:text-[20px]">
            + 2 min
          </button>
          <button
            type="button"
            onClick={onSkipBreak}
            className="bx press min-h-16 min-w-[220px] rounded-button border-[3px] border-ink px-5 text-[20px] font-bold text-ink-solid sm:text-[22px]"
            style={{ background: "var(--a1)" }}
          >
            Saltar descanso
          </button>
        </div>
      </div>

      <ProgressBar pct={pct} color={accent} ariaLabel="Progreso del descanso" height={30} />
    </div>
  );
}

function ZenView({
  skill,
  currentTomato,
  running,
  remaining,
  pct,
  onToggleRunning,
  onExit,
}: {
  skill: Skill | null;
  currentTomato: number;
  running: boolean;
  remaining: number;
  pct: number;
  onToggleRunning: () => void;
  onExit: () => void;
}) {
  return (
    <div className="flex size-full flex-col gap-8 px-6 py-7 sm:px-12" style={{ background: "#111111" }}>
      <div className="flex flex-wrap items-center gap-3.5" style={{ color: "#FFF4D6" }}>
        <span className="font-num text-[15px] font-bold opacity-75">
          {skill?.name ?? "Sin habilidad"} · tomate {currentTomato} de 4
        </span>
        <span className="flex-1" />
        <SoundControl zen />
        <ExitChip onClick={onExit} zen>
          Salir del modo zen
        </ExitChip>
      </div>
      <main className="flex flex-1 flex-col items-center justify-center gap-6">
        <div
          role="timer"
          aria-label="Tiempo restante"
          className="font-num text-[90px] font-bold leading-[.85] tracking-tight sm:text-[180px] md:text-[260px]"
          style={{ color: "#FFF4D6", fontVariantNumeric: "tabular-nums" }}
        >
          {fmt(remaining)}
        </div>
        <span className="font-num text-[16px]" style={{ color: "#FFF4D6", opacity: 0.6 }}>
          {running ? "Solo tú y el tiempo. Sin notificaciones." : "En pausa. Respira."}
        </span>
      </main>
      <div className="flex justify-center gap-4">
        <button
          type="button"
          onClick={onToggleRunning}
          className="press min-h-[52px] rounded-chip border-[3px] px-7 text-[18px] font-bold"
          style={{ background: "transparent", color: "#FFF4D6", borderColor: "#FFF4D6" }}
        >
          {remaining <= 0 ? "Listo" : running ? "Pausa" : "Reanudar"}
        </button>
      </div>
      <div role="progressbar" aria-label="Progreso" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-3 overflow-hidden rounded-chip" style={{ background: "#2b2b2b" }}>
        <div className="h-full" style={{ width: `${pct}%`, background: "var(--a2)" }} />
      </div>
    </div>
  );
}
