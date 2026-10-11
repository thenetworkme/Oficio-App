"use client";

import { useMemo } from "react";
import { dateKeyInTz } from "@/lib/tz";
import { formatDayMonthFromKey, formatMinutes } from "@/lib/format";
import type { DailyMinutes } from "@/lib/streak";

const LEVEL_MIX = [0, 30, 55, 78, 100];

function levelFor(minutes: number, scale: number): number {
  if (minutes <= 0) return 0;
  const ratio = minutes / scale;
  if (ratio < 0.2) return 1;
  if (ratio < 0.45) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

/**
 * GitHub-style contribution grid: one small square per day, 7 rows
 * (day-of-week) x N week columns, colored by minutes practiced that day.
 * Reused both for the overall "Constancia" widget on the dashboard
 * (default accent) and per-skill on Estadísticas (that skill's own color),
 * which is why the color scale is driven by an `accentColor` prop instead
 * of a hardcoded value — it must read correctly across all 8 themes, so it
 * interpolates the theme's own token with `--card` rather than a fixed hue.
 */
export function ConsistencyHeatmap({
  dailyMinutes,
  timezone,
  scaleMinutes = 120,
  weeks = 14,
  accentColor = "var(--a1)",
  ariaLabel,
}: {
  dailyMinutes: DailyMinutes;
  timezone: string;
  scaleMinutes?: number;
  weeks?: number;
  /** Any valid CSS color (a `var(--aN)` token or a skill's custom hex). */
  accentColor?: string;
  ariaLabel?: string;
}) {
  const cells = useMemo(() => {
    const totalDays = weeks * 7;
    const out: { level: number; dateKey: string; minutes: number }[] = [];
    const today = new Date();
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = dateKeyInTz(d, timezone);
      const minutes = dailyMinutes[key] ?? 0;
      out.push({ level: levelFor(minutes, scaleMinutes), dateKey: key, minutes });
    }
    return out;
  }, [dailyMinutes, timezone, scaleMinutes, weeks]);

  function colorFor(level: number) {
    if (level === 0) return "var(--card)";
    return `color-mix(in srgb, ${accentColor} ${LEVEL_MIX[level]}%, var(--card))`;
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={ariaLabel ?? `Mapa de actividad diaria de las últimas ${weeks} semanas`}
        className="grid max-w-full gap-1 self-start overflow-x-auto"
        style={{
          gridTemplateRows: "repeat(7, 16px)",
          gridAutoFlow: "column",
          gridAutoColumns: "16px",
        }}
      >
        {cells.map((c, i) => (
          <div
            key={i}
            title={`${formatDayMonthFromKey(c.dateKey)}: ${c.minutes > 0 ? formatMinutes(c.minutes) : "sin práctica"}`}
            className="size-4 rounded-[4px]"
            style={{ background: colorFor(c.level) }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span>Menos</span>
        {[0, 1, 2, 3, 4].map((lv) => (
          <div key={lv} className="size-3 rounded-sm" style={{ background: colorFor(lv) }} />
        ))}
        <span>Más</span>
      </div>
    </div>
  );
}
