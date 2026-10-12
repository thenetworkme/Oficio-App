"use client";

import { Chip } from "@/components/ui/chip";
import { useSound } from "@/lib/sound/SoundProvider";
import type { AmbientSoundId } from "@/lib/types";

const AMBIENT_OPTIONS: { id: AmbientSoundId; label: string }[] = [
  { id: "rain", label: "Lluvia" },
  { id: "waves", label: "Olas" },
  { id: "lofi", label: "Lofi" },
  { id: "thunder", label: "Tormenta" },
  { id: "fireplace", label: "Chimenea" },
  { id: "night", label: "Grillos" },
  { id: "forest", label: "Bosque" },
  { id: "coffeeshop", label: "Cafetería" },
];

/**
 * Shared ambient-sound chip picker + volume slider, used on both the
 * Temporizador screen and Ajustes -> Perfil so the two surfaces stay in
 * sync (both read/write the same useSound() state).
 *
 * Picking a chip while the Pomodoro is running starts it immediately (the
 * click itself is the user gesture); picking one while idle just saves the
 * preference for next time — SoundProvider decides which, based on whether
 * ambient is currently marked as running.
 *
 * There's no explicit "Silencio" chip: clicking the chip that's already
 * selected toggles it off (switches to "none"), which is how you stop
 * ambient sound from here.
 */
export function AmbientPicker({ label = "Sonido ambiente" }: { label?: string }) {
  const { ambientSoundId, setAmbientSoundId, ambientVolume, setAmbientVolume } = useSound();

  return (
    <div className="flex flex-col gap-2.5">
      <span className="label-xs">{label}</span>
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {AMBIENT_OPTIONS.map((opt) => (
          <Chip
            key={opt.id}
            pressed={ambientSoundId === opt.id}
            onClick={() => setAmbientSoundId(ambientSoundId === opt.id ? "none" : opt.id)}
          >
            {opt.label}
          </Chip>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <label htmlFor="ambient-volume" className="text-sm text-muted">
          Volumen
        </label>
        <input
          id="ambient-volume"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={ambientVolume}
          disabled={ambientSoundId === "none"}
          onChange={(e) => setAmbientVolume(Number(e.target.value))}
          className="h-2 flex-1 accent-[var(--a1)] disabled:opacity-40"
          aria-label="Volumen del sonido ambiente"
        />
      </div>
    </div>
  );
}
