"use client";

import { formatMinutes } from "@/lib/format";

export interface DayTotal {
  label: string; // "L", "M", ...
  minutes: number;
  isToday: boolean;
}

export function WeekBars({ days, maxMinutes = 210 }: { days: DayTotal[]; maxMinutes?: number }) {
  return (
    <div className="flex h-[190px] items-end justify-between gap-2.5">
      {days.map((d, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="font-num text-xs text-muted">{d.minutes === 0 ? "—" : formatMinutes(d.minutes)}</span>
          <div
            className="w-full max-w-11 rounded-t-md rounded-b-sm border-2 border-ink"
            style={{
              height: Math.max(3, Math.round((d.minutes / maxMinutes) * 120)),
              background: d.isToday ? "var(--a1)" : d.minutes === 0 ? "var(--card)" : "#fff",
            }}
          />
          <span className="text-[13px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
