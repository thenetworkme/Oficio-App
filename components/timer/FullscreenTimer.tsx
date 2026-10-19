"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { AmbientPicker } from "@/components/sound/AmbientPicker";
import { DotDigits } from "@/components/ui/DotDigits";
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
            ? { background: "transparent", color: "#FFF4D6", borderColor: "#FFF4D6" }
            : { background: "transparent", color: "var(--ink)", borderColor: "var(--border)" }
        }
      >
        {sound.soundEffectsEnabled ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-10 flex w-[280px] flex-col gap-4 rounded-card border border-line bg-card p-4.5 text-ink">
          <button
            type="button"
            onClick={() => sound.toggleAllSound()}
            className="flex min-h-10 items-center justify-center gap-2.5 rounded-button border border-border font-mono text-[12px] uppercase tracking-[0.1em] transition-colors hover:border-border-hover"
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
        >
          {zen ? (
            <ZenView
              skill={skill}
              currentTomato={currentTomato}
              running={running}
              remaining={remaining}
              total={total}
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
      className="inline-flex min-h-10 items-center rounded-chip border px-4 font-mono text-[12px] uppercase tracking-[0.1em] transition-colors"
      style={
        zen
          ? { background: "transparent", color: "#FFF4D6", borderColor: "#FFF4D6" }
          : { background: "transparent", color: "var(--muted)", borderColor: "var(--border)" }
      }
    >
      {children}
    </button>
  );
}

function TickStrip({ total, elapsed, width = 880 }: { total: number; elapsed: number; width?: number }) {
  const minutes = Math.max(1, Math.round(total / 60));
  const ticks = Array.from({ length: minutes }, (_, i) => ({
    h: (i + 1) % 5 === 0 ? 26 : 16,
    bg: elapsed >= (i + 1) * 60 ? "var(--ink)" : elapsed > i * 60 ? "var(--signal)" : "var(--line)",
  }));
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.max(0, Math.round(s)) % 60).padStart(2, "0")}`;
  return (
    <div style={{ width: "100%", maxWidth: width }}>
      <div className="flex items-end gap-1" style={{ height: 26 }}>
        {ticks.map((t, i) => (
          <i key={i} aria-hidden="true" className="flex-1 rounded-[1px] transition-[background]" style={{ height: t.h, background: t.bg }} />
        ))}
      </div>
      <div className="label-xs mt-2 flex justify-between text-[10px]">
        <span>{fmt(elapsed)}</span>
        <span>{fmt(total)}</span>
      </div>
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
    <div className="flex size-full flex-col gap-8 overflow-y-auto bg-paper px-6 py-7 text-ink sm:px-12">
      <div className="flex flex-wrap items-center gap-5">
        <span className="label-xs">
          <span className="text-ink">{skill?.name ?? "Sin habilidad"}</span>
          {challengeDayLabel ? ` · ${challengeDayLabel}` : ""} · Tomate {currentTomato} de 4
        </span>
        <span aria-hidden="true" className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="size-2 rounded-full"
              style={{ background: i < dotsFilled ? "var(--ink)" : i === dotsFilled ? "var(--signal)" : "var(--line)" }}
            />
          ))}
        </span>
        <span className="flex-1" />
        <SoundControl />
        <button type="button" onClick={onToggleZen} className="label-xs underline decoration-border underline-offset-4 transition-colors hover:text-ink">
          Modo zen
        </button>
        <ExitChip onClick={onExit}>Salir ✕</ExitChip>
      </div>

      <main className="flex flex-1 flex-col items-center justify-center gap-7">
        <span className="label-xs rounded-chip px-4.5 py-1.5 text-[13px]" style={{ background: "var(--ink)", color: "var(--paper)" }}>
          {atZero ? "Tomate listo" : running ? "Enfoque" : "En pausa"}
        </span>
        <div className="overflow-x-auto">
          <DotDigits value={`${mm}:${ss}`} size={38} gap={9} running={running} ariaLabel="Tiempo restante" />
        </div>
        <TickStrip total={total} elapsed={total - remaining} width={1160} />
        {intention && (
          <div
            className="max-w-[900px] rounded-card border border-signal px-6 py-3 text-center text-[18px] font-medium text-ink sm:text-[22px]"
          >
            {intention}
          </div>
        )}
      </main>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onToggleRunning}
          disabled={atZero}
          className="inline-flex min-h-[64px] min-w-[220px] items-center justify-center rounded-button border border-signal bg-signal text-[16px] font-medium uppercase tracking-[0.1em] text-ink-solid transition-colors hover:brightness-110 disabled:pointer-events-none disabled:opacity-50"
        >
          {atZero ? "Listo" : running ? "Pausa" : "Reanudar"}
        </button>
        <button type="button" onClick={onExtend} className="inline-flex min-h-[64px] items-center rounded-button border border-border px-6 font-mono text-[13px] uppercase tracking-[0.1em] transition-colors hover:border-border-hover hover:bg-card">
          + 5 min
        </button>
        <button type="button" onClick={onFinishNow} className="inline-flex min-h-[64px] items-center rounded-button border border-border px-6 font-mono text-[13px] uppercase tracking-[0.1em] transition-colors hover:border-border-hover hover:bg-card">
          Terminar ya
        </button>
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
    <div className="flex size-full flex-col gap-8 overflow-y-auto bg-paper px-6 py-7 text-ink sm:px-12">
      <div className="flex flex-wrap items-center gap-5">
        <span className="label-xs rounded-chip border px-3.5 py-1.5" style={{ borderColor: "var(--border)" }}>
          {long ? "Descanso largo · ciclo completo" : "Descanso corto"}
        </span>
        <span className="label-xs">{long ? "4 de 4 tomates" : `Tomate ${dotsFilled} de 4 hecho`}</span>
        <span className="flex-1" />
        <SoundControl />
        <ExitChip onClick={onExit}>Salir ✕</ExitChip>
      </div>

      <main className="flex flex-1 flex-wrap items-center justify-center gap-12">
        <div className="flex max-w-[600px] flex-1 flex-col items-start gap-6">
          <span className="label-xs">{long ? "Te lo ganaste" : "Respira un momento"}</span>
          <div className="overflow-x-auto">
            <DotDigits value={`${mm}:${ss}`} size={26} gap={9} ariaLabel="Tiempo de descanso restante" />
          </div>
          <TickStrip total={total} elapsed={total - remaining} width={560} />
          <div className="flex w-full max-w-[560px] flex-col">
            {tips.map((label, i) => {
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

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="label-xs rounded-chip border border-line px-5 py-2.5">
          Siguiente: {skill?.name ?? "—"} · tomate {long ? "1 del nuevo ciclo" : "siguiente"}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onExtend} className="inline-flex min-h-[56px] items-center rounded-button border border-border px-5 font-mono text-[13px] uppercase tracking-[0.1em] transition-colors hover:border-border-hover hover:bg-card">
            + 2 min
          </button>
          <button
            type="button"
            onClick={onSkipBreak}
            className="inline-flex min-h-[56px] min-w-[200px] items-center justify-center rounded-button border border-signal bg-signal px-5 text-[14px] font-medium uppercase tracking-[0.1em] text-ink-solid transition-colors hover:brightness-110"
          >
            Saltar descanso
          </button>
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
  onExit,
}: {
  skill: Skill | null;
  currentTomato: number;
  running: boolean;
  remaining: number;
  total: number;
  onToggleRunning: () => void;
  onExit: () => void;
}) {
  void total;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return (
    <div className="relative flex size-full flex-col items-center justify-center gap-0" style={{ background: "#111111" }}>
      <div className="absolute left-0 right-0 top-7 flex justify-center px-6" style={{ color: "#FFF4D6" }}>
        <span className="font-num text-[13px] opacity-70">
          {skill?.name ?? "Sin habilidad"} · tomate {currentTomato} de 4
        </span>
      </div>
      <div className="overflow-x-auto">
        <DotDigits value={`${mm}:${ss}`} size={39} gap={9} onColor="#FFF4D6" offColor="#1e1e1e" signalColor="#FFF4D6" running={running} ariaLabel="Tiempo restante" />
      </div>
      <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-8">
        <button
          type="button"
          onClick={onToggleRunning}
          className="label-xs"
          style={{ color: "#FFF4D6" }}
        >
          Espacio · {remaining <= 0 ? "Listo" : running ? "Pausar" : "Seguir"}
        </button>
        <button type="button" onClick={onExit} className="label-xs" style={{ color: "#FFF4D6" }}>
          Salir del modo zen
        </button>
      </div>
    </div>
  );
}
