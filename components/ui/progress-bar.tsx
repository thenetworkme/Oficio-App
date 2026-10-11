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

export function ProgressBar({ pct, color = "var(--accent)", ariaLabel, height = 10, className, marks }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn("relative rounded-chip bg-track", className)}
      style={{ height }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 rounded-chip"
        style={{ width: `${clamped}%`, background: color }}
      />
      {marks?.map((m) => (
        <div
          key={m}
          className="absolute bg-bg"
          style={{ left: `${m}%`, top: -4, bottom: -4, width: 2 }}
        />
      ))}
    </div>
  );
}
