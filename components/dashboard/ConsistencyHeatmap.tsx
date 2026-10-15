"use client";

import { useMemo } from "react";
import { dateKeyInTz } from "@/lib/tz";
import { formatDayMonthFromKey, formatMinutes } from "@/lib/format";
import { heatmapDotColor, heatmapLevel } from "@/lib/heatmap";
import type { DailyMinutes } from "@/lib/streak";

/**
 * Activity heatmap rendered as a DOT grid (Punto design) — one small round
 * dot per day, 7 rows (day-of-week) x N week columns, colored by a 5-level
 * opacity scale (see lib/heatmap.ts heatmapDotColor/heatmapLevel, ported
 * from design-reference/punto's `heat()`). Reused both for the overall
 * "Constancia" widget on the dashboard (default: plain --ink dots, like the
 * reference) and per-skill on Estadísticas (that skill's own color via
 * `accentColor`), which is why the color is driven by a prop instead of a
 * hardcoded value.
 */
export function ConsistencyHeatmap({
  dailyMinutes,
  timezone,
  scaleMinutes = 120,
  weeks = 14,
  accentColor = "var(--ink)",
  ariaLabel,
}: {
  dailyMinutes: DailyMinutes;
  timezone: string;
  scaleMinutes?: number;
  weeks?: number;
  /** Any valid CSS color (a `var(--x)` token or a skill's custom hex) — the
   * dot's fully-lit (level 4) tone; lower levels mix it toward --line. */
  accentColor?: string;
  ariaLabel?: string;
}) {
  const cells = useMemo(() => {
    const totalDays = weeks * 7;
    const out: { level: 0 | 1 | 2 | 3 | 4; dateKey: string; minutes: number }[] = [];
    const today = new Date();
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = dateKeyInTz(d, timezone);
      const minutes = dailyMinutes[key] ?? 0;
      out.push({ level: heatmapLevel(minutes, scaleMinutes), dateKey: key, minutes });
    }
    return out;
  }, [dailyMinutes, timezone, scaleMinutes, weeks]);

  function colorFor(level: 0 | 1 | 2 | 3 | 4) {
    return heatmapDotColor(level, accentColor, "var(--line)");
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={ariaLabel ?? `Mapa de actividad diaria de las últimas ${weeks} semanas`}
        className="grid max-w-full gap-[5px] self-start overflow-x-auto"
        style={{
          gridTemplateRows: "repeat(7, 14px)",
          gridAutoFlow: "column",
          gridAutoColumns: "14px",
        }}
      >
        {cells.map((c, i) => (
          <i
            key={i}
            title={`${formatDayMonthFromKey(c.dateKey)}: ${c.minutes > 0 ? formatMinutes(c.minutes) : "sin práctica"}`}
            className="block size-3.5 rounded-full"
            style={{ background: colorFor(c.level) }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span>Menos</span>
        {([0, 1, 2, 3, 4] as const).map((lv) => (
          <i key={lv} className="block size-2.5 rounded-full" style={{ background: colorFor(lv) }} />
        ))}
        <span>Más</span>
      </div>
    </div>
  );
}
