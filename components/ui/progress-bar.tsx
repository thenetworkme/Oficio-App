import * as React from "react";
import { cn } from "@/lib/cn";

interface ProgressBarProps {
  pct: number; // 0-100
  color?: string;
  ariaLabel: string;
  height?: number;
  className?: string;
  marks?: number[]; // percentage positions for tick marks
}

// Punto progress bar: flat pill track, no border/box — just a filled
// rounded bar on a dim --line track.
export function ProgressBar({ pct, color = "var(--ink)", ariaLabel, height = 10, className, marks }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn("relative overflow-hidden rounded-chip bg-line", className)}
      style={{ height }}
    >
      <div className="absolute inset-y-0 left-0 rounded-chip transition-[width]" style={{ width: `${clamped}%`, background: color }} />
      {marks?.map((m) => (
        <div key={m} className="absolute bg-ink/40" style={{ left: `${m}%`, top: 0, bottom: 0, width: 1 }} />
      ))}
    </div>
  );
}
