import * as React from "react";
import { cn } from "@/lib/cn";
import { buildDotGrid } from "@/lib/dotmatrix";

export interface DotDigitsProps {
  /** The string to render, e.g. "25:00", "08:40", "1.284". Supports 0-9, ':'
   * and '.' — see lib/dotmatrix.ts. */
  value: string;
  /** Dot diameter in px. */
  size?: number;
  /** Gap between dots in px. Defaults to ~0.6x size, matching the
   * reference's dot-size-to-gap ratio. */
  gap?: number;
  /** Lit, non-colon dot color. */
  onColor?: string;
  /** Unlit dot color. */
  offColor?: string;
  /** Lit colon-dot color (the middle dot of ':'). */
  signalColor?: string;
  /** When true, the colon's lit dot blinks (1s step interval) — used for a
   * live/running timer. */
  running?: boolean;
  className?: string;
  /** Accessible label for the whole number; defaults to `value`. */
  ariaLabel?: string;
}

/**
 * The custom 5x7 bitmap dot-matrix font used for every elapsed/remaining
 * TIME display in the Punto design (dashboard hero number, fullscreen timer,
 * etc.) — the single most distinctive element of the whole design. Renders
 * as a CSS grid of round dots; same component at different `size`/`gap`
 * values produces the dashboard's bigger hero number vs. the fullscreen
 * timer's smaller grid.
 */
export function DotDigits({
  value,
  size = 14,
  gap,
  onColor = "var(--ink)",
  offColor = "var(--line)",
  signalColor = "var(--signal)",
  running = false,
  className,
  ariaLabel,
}: DotDigitsProps) {
  const grid = buildDotGrid(value);
  const resolvedGap = gap ?? Math.max(2, Math.round(size * 0.6));

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? value}
      className={cn("grid", className)}
      style={{
        gridTemplateColumns: `repeat(${grid.columns}, ${size}px)`,
        gridAutoRows: `${size}px`,
        gap: resolvedGap,
      }}
    >
      {grid.cells.map((cell, i) => (
        <i
          key={i}
          aria-hidden="true"
          className={cn("block rounded-full", cell.lit && cell.colon && running && "dot-blink")}
          style={{
            width: size,
            height: size,
            background: cell.lit ? (cell.colon ? signalColor : onColor) : offColor,
          }}
        />
      ))}
    </div>
  );
}
