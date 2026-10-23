import * as React from "react";
import { cn } from "@/lib/cn";

interface ProgressBarProps {
  pct: number; // 0-100
  color?: string;
  /**
   * Track (unfilled) background. Defaults to the legacy `var(--line)` —
   * unchanged for every existing caller that doesn't pass it. "Pomodoro"
   * contexts pass one of the new tokens explicitly, since the right track
   * color depends on what the bar sits on (matching design-reference/
   * pomodoro/html/PomoHabilidad.dc.html and PomoTimer.dc.html, which use
   * 3 different track/fill combos depending on context):
   *   - on a solid white/dark card:      trackColor="var(--card-solid-line)"
   *   - on the translucent tint card:    trackColor="rgba(0,0,0,.15)"
   *   - directly on the colored --mode-bg (header's session bar): trackColor="rgba(0,0,0,.1)"
   */
  trackColor?: string;
  ariaLabel: string;
  height?: number;
  className?: string;
  marks?: number[]; // percentage positions for tick marks
}

// Flat pill track, no border/box — just a filled rounded bar. Structurally
// unchanged from "Punto" (confirmed against the reference: still a simple
// filled bar + optional tick marks, no 100-tick ruler) — only the default
// colors are still the old --ink/--line pair, kept for every untouched
// caller; new "Pomodoro" callers pass `color`/`trackColor` explicitly.
export function ProgressBar({
  pct,
  color = "var(--ink)",
  trackColor = "var(--line)",
  ariaLabel,
  height = 10,
  className,
  marks,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn("relative overflow-hidden rounded-chip", className)}
      style={{ height, background: trackColor }}
    >
      <div className="absolute inset-y-0 left-0 rounded-chip transition-[width]" style={{ width: `${clamped}%`, background: color }} />
      {marks?.map((m) => (
        <div key={m} className="absolute bg-ink/40" style={{ left: `${m}%`, top: 0, bottom: 0, width: 1 }} />
      ))}
    </div>
  );
}
