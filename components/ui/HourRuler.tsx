import * as React from "react";
import { cn } from "@/lib/cn";
import { formatInt } from "@/lib/format";
import { buildRulerLabels, buildTicks } from "@/lib/hourRuler";

export interface HourRulerProps {
  /** Hours practiced so far. */
  currentHours: number;
  /** Hour goal, e.g. 10_000. */
  goalHours?: number;
  tickCount?: number;
  /** Every Nth tick (1-based) renders taller, as a "major" mark. */
  majorEvery?: number;
  minorHeight?: number;
  majorHeight?: number;
  onColor?: string;
  offColor?: string;
  /** Color of the single partially-lit transitional tick. Defaults to a
   * 50/50 mix of onColor/offColor, matching the reference's
   * `rgba(244,244,241,.5)` partial-tick treatment. */
  partialColor?: string;
  /** Show the "0 / 2.500 / 5.000 / 7.500 / 10.000"-style labels beneath. */
  showLabels?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * The "100-mark ruler" for progress toward an hour goal: ~100 thin vertical
 * tick bars, a contiguous lit prefix up to the current progress fraction,
 * with evenly spaced hour labels beneath.
 */
export function HourRuler({
  currentHours,
  goalHours = 10_000,
  tickCount = 100,
  majorEvery = 10,
  minorHeight = 20,
  majorHeight = 34,
  onColor = "var(--ink)",
  offColor = "var(--line)",
  partialColor,
  showLabels = true,
  className,
  ariaLabel,
}: HourRulerProps) {
  const ticks = buildTicks(currentHours, goalHours, { tickCount, majorEvery, minorHeight, majorHeight });
  const labels = buildRulerLabels(goalHours);
  const resolvedPartial = partialColor ?? `color-mix(in srgb, ${onColor} 50%, ${offColor})`;

  function colorFor(level: 0 | 1 | 2) {
    if (level === 2) return onColor;
    if (level === 1) return resolvedPartial;
    return offColor;
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="img"
        aria-label={ariaLabel ?? `${formatInt(currentHours)} de ${formatInt(goalHours)} horas`}
        className="flex items-end gap-[3px]"
        style={{ height: majorHeight }}
      >
        {ticks.map((t) => (
          <i
            key={t.index}
            aria-hidden="true"
            className="block flex-1 rounded-[1px]"
            style={{ height: t.height, background: colorFor(t.level) }}
          />
        ))}
      </div>
      {showLabels && (
        <div className="label-xs flex justify-between" aria-hidden="true">
          {labels.map((l) => (
            <span key={l}>{formatInt(l)}</span>
          ))}
        </div>
      )}
    </div>
  );
}
