"use client";

import { useMemo } from "react";
import { dateKeyInTz } from "@/lib/tz";
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

export function ConsistencyHeatmap({
  dailyMinutes,
  timezone,
  scaleMinutes = 120,
  weeks = 14,
}: {
  dailyMinutes: DailyMinutes;
  timezone: string;
  scaleMinutes?: number;
  weeks?: number;
}) {
  const cells = useMemo(() => {
    const totalDays = weeks * 7;
    const out: { level: number; dateKey: string }[] = [];
    const today = new Date();
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = dateKeyInTz(d, timezone);
      out.push({ level: levelFor(dailyMinutes[key] ?? 0, scaleMinutes), dateKey: key });
    }
    return out;
  }, [dailyMinutes, timezone, scaleMinutes, weeks]);

  function colorFor(level: number) {
    if (level === 0) return "var(--card)";
    return `color-mix(in srgb, var(--a1) ${LEVEL_MIX[level]}%, var(--card))`;
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={`Mapa de actividad diaria de las últimas ${weeks} semanas`}
        className="grid max-w-full gap-1 self-start overflow-x-auto"
        style={{
          gridTemplateRows: "repeat(7, 16px)",
          gridAutoFlow: "column",
          gridAutoColumns: "16px",
        }}
      >
        {cells.map((c, i) => (
          <div key={i} className="size-4 rounded-[4px]" style={{ background: colorFor(c.level) }} />
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
