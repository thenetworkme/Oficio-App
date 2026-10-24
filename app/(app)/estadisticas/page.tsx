"use client";

import { useMemo, useState } from "react";
import { Card, CardHeading } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ModeBackdrop } from "@/components/layout/ModeBackdrop";
import { ConsistencyHeatmap } from "@/components/dashboard/ConsistencyHeatmap";
import { useAppData } from "@/lib/hooks/useAppData";
import { resolveSkillColor } from "@/lib/skill-color";
import { formatDecimal, formatInt, formatMinutes, formatMonthYearEs, formatPercent, formatShortDateEs, formatTimeEs } from "@/lib/format";
import { hoursPerWeek, projectTimeRemaining, formatProjection, recentWeeklyPace, projectTenThousandHours } from "@/lib/projection";
import { buildSkillDailyMinutes } from "@/lib/heatmap";
import { summarizeLibreSessions } from "@/lib/libre-sessions";
import { cn } from "@/lib/cn";

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"];
const TIME_SLOTS = [
  { label: "Madrugada", sub: "5–8 am", from: 5, to: 8 },
  { label: "Mañana", sub: "8 am–1 pm", from: 8, to: 13 },
  { label: "Tarde", sub: "1–7 pm", from: 13, to: 19 },
  { label: "Noche", sub: "7 pm–12", from: 19, to: 24 },
];
const SLOT_ROWS = 7;
const VIEWS = ["Resumen", "Detalle", "Ranking"] as const;
const RANGES = ["Semana", "Mes", "Año"] as const;

interface Bar {
  label: string;
  hours: number;
  highlight: boolean;
}

function dayStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function hoursBetween(sessions: { startedAt: number; durationMin: number }[], start: number, end: number): number {
  return sessions.filter((s) => s.startedAt >= start && s.startedAt < end).reduce((a, s) => a + s.durationMin, 0) / 60;
}

/** "Hoy 21:30" / "Ayer 13:05" / "Vie 9 oct · 08:40" — matches the reference's
 * relative-day + time log format (PomoInforme.dc.html's `{{x.d}}`). */
function relativeDateTime(d: Date): string {
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = formatTimeEs(d);
  if (isToday) return `Hoy · ${time}`;
  if (isYesterday) return `Ayer · ${time}`;
  return `${formatShortDateEs(d)} · ${time}`;
}

export default function EstadisticasPage() {
  const { skills, sessions, timezone, weekMinutes, streak } = useAppData();
  const [view, setView] = useState<0 | 1 | 2>(0);
  const [range, setRange] = useState<0 | 1 | 2>(0);
  const [rankSkillId, setRankSkillId] = useState<string | null>(null);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthSessions = sessions.filter((s) => s.startedAt >= monthStart);
  const pomodorosMonth = monthSessions.reduce((a, s) => a + s.pomodoros, 0);
  const activeDaysMonth = new Set(monthSessions.map((s) => new Date(s.startedAt).toDateString())).size;
  const avgDailyMin = activeDaysMonth > 0 ? monthSessions.reduce((a, s) => a + s.durationMin, 0) / activeDaysMonth : 0;
  const longestSession = Math.max(0, ...sessions.map((s) => s.durationMin));
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- plain useMemo, no mutation; the compiler's heuristic trips on this file's shape.
  const libreSummary = useMemo(() => summarizeLibreSessions(sessions, monthStart), [sessions, monthStart]);

  const weekBars: Bar[] = useMemo(() => {
    const out: Bar[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const start = dayStart(d);
      out.push({ label: DAY_LETTERS[d.getDay()], hours: hoursBetween(sessions, start, start + 86_400_000), highlight: i === 0 });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);

  const monthBars: Bar[] = useMemo(() => {
    const out: Bar[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const start = dayStart(d);
      out.push({
        label: i % 5 === 0 ? String(d.getDate()) : "",
        hours: hoursBetween(sessions, start, start + 86_400_000),
        highlight: i === 0,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);

  const yearBars: Bar[] = useMemo(() => {
    const out: Bar[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.getTime();
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
      out.push({ label: MONTH_NAMES[d.getMonth()], hours: hoursBetween(sessions, start, end), highlight: i === 0 });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);

  const bars = range === 0 ? weekBars : range === 1 ? monthBars : yearBars;
  const barGap = range === 0 ? "gap-3.5" : range === 1 ? "gap-[3px]" : "gap-2.5";

  const totalMinutesAll = skills.reduce((acc, s) => acc + s.totalMinutes, 0);
  const split = skills
    .map((s) => ({
      id: s.id,
      name: s.name,
      hours: s.totalMinutes / 60,
      pct: totalMinutesAll > 0 ? (s.totalMinutes / totalMinutesAll) * 100 : 0,
      color: resolveSkillColor(s.color),
    }))
    .sort((a, b) => b.hours - a.hours);

  const slots = useMemo(() => {
    const hoursBySlot = TIME_SLOTS.map((slot) => {
      const minutes = sessions
        .filter((s) => {
          const h = new Date(s.startedAt).getHours();
          return h >= slot.from && h < slot.to;
        })
        .reduce((a, s) => a + s.durationMin, 0);
      return minutes / 60;
    });
    const max = Math.max(1, ...hoursBySlot);
    const best = hoursBySlot.indexOf(Math.max(...hoursBySlot));
    return TIME_SLOTS.map((slot, i) => ({ label: slot.label, sub: slot.sub, hours: hoursBySlot[i], max, isBest: i === best && hoursBySlot[i] > 0 }));
  }, [sessions]);

  const recentLog = useMemo(() => [...sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 10), [sessions]);

  const rankSkill = skills.find((s) => s.id === rankSkillId) ?? skills[0] ?? null;

  if (skills.length === 0) {
    return (
      <>
        <ModeBackdrop />
        <Card tone="solid" className="p-8 text-center text-card-solid-muted">
          Crea una habilidad para ver tus estadísticas.
        </Card>
      </>
    );
  }

  const rankHours = rankSkill ? rankSkill.totalMinutes / 60 : 0;
  const rankCurrentPace = rankSkill ? hoursPerWeek(rankSkill.dailyGoalMin, rankSkill.daysPerWeek) : 0;
  const rankAltPace = rankSkill ? hoursPerWeek(180, rankSkill.daysPerWeek) : 0;
  const rankRemaining = rankSkill ? Math.max(0, rankSkill.goalHours - rankHours) : 0;
  const rankDailyMinutes = rankSkill ? buildSkillDailyMinutes(sessions, rankSkill.id, timezone) : {};
  const rankActualPace = rankSkill ? recentWeeklyPace(sessions, rankSkill.id) : 0;
  const rankMastery = rankSkill ? projectTenThousandHours(rankHours, rankActualPace) : null;
  const rankColor = rankSkill ? resolveSkillColor(rankSkill.color) : "var(--mode-bg)";

  return (
    <>
      <ModeBackdrop />

      <header className="flex flex-col gap-2.5">
        <span className="label-xs text-mode-ink-muted">Informe · {formatMonthYearEs(now)}</span>
        <h1 className="m-0 text-[44px] font-light leading-[0.95] tracking-tight text-mode-ink sm:text-[56px]">Tus números</h1>
      </header>

      <div role="tablist" aria-label="Vista" className="flex justify-center gap-1">
        {VIEWS.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={view === i}
            onClick={() => setView(i as 0 | 1 | 2)}
            className={cn(
              "rounded-[4px] px-3 py-1 text-[16px] transition-colors",
              view === i ? "bg-black/15 font-semibold text-mode-ink" : "font-normal text-mode-ink/90 hover:bg-white/10",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 0 && (
        <>
          <Card tone="solid" className="flex flex-col gap-4.5 p-6 sm:p-7">
            <h2 className="m-0 text-center text-[17px] font-semibold text-card-solid-muted">Actividad</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <StatTile value={formatDecimal(weekMinutes / 60)} label="horas esta semana" />
              <StatTile value={formatInt(activeDaysMonth)} label="días activos" />
              <StatTile value={formatInt(streak)} label="días de racha" />
            </div>
          </Card>

          <Card tone="solid" className="flex flex-col gap-4.5 p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="m-0 text-[17px] font-semibold text-card-solid-muted">Horas enfocadas</h2>
              <div role="tablist" aria-label="Rango" className="flex gap-0.5">
                {RANGES.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    role="tab"
                    aria-selected={range === i}
                    onClick={() => setRange(i as 0 | 1 | 2)}
                    className={cn(
                      "rounded-[4px] px-2.5 py-1 text-[13px] font-semibold transition-colors",
                      range === i ? "bg-mode-bg text-mode-ink" : "text-card-solid-muted hover:bg-card-solid-line",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <FocusHoursChart bars={bars} gapClassName={barGap} />
          </Card>
        </>
      )}

      {view === 1 && (
        <>
          <Card tone="solid" className="flex flex-col p-6 sm:p-7">
            <CardHeading className="mb-1 text-[17px] font-semibold text-card-solid-muted">Sesiones recientes</CardHeading>
            {recentLog.length === 0 ? (
              <p className="py-4 text-sm text-card-solid-muted">Aún no registras sesiones.</p>
            ) : (
              recentLog.map((s) => {
                const skill = skills.find((sk) => sk.id === s.skillId);
                const name = s.note && s.note.trim() ? s.note : `Sesión${skill ? ` de ${skill.name}` : " libre"}`;
                return (
                  <div key={s.id} className="grid grid-cols-[110px_1fr_auto] items-baseline gap-3.5 border-t border-card-solid-line py-3.5 first:border-t-0">
                    <span className="text-[13px] text-card-solid-muted">{relativeDateTime(new Date(s.startedAt))}</span>
                    <span className="flex flex-col font-medium">
                      {name}
                      {skill && s.note && <span className="text-[12.5px] font-normal text-card-solid-muted">{skill.name}</span>}
                    </span>
                    <span className="font-num font-bold" style={{ color: "var(--mode-bg)" }}>
                      {formatMinutes(s.durationMin)}
                    </span>
                  </div>
                );
              })
            )}
          </Card>

          <Card tone="solid" className="flex flex-col gap-5 p-6 sm:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <CardHeading className="text-[17px] font-semibold text-card-solid-muted">Tu mejor momento del día</CardHeading>
              <span className="text-[13px] text-card-solid-muted">Horas totales registradas por franja</span>
            </div>
            <div className="flex items-end justify-between gap-4">
              {slots.map((s) => (
                <div key={s.label} className="flex flex-1 flex-col items-center gap-2.5">
                  <span className="font-num text-xs text-card-solid-muted">{formatDecimal(s.hours)} h</span>
                  <div className="grid gap-1.5" role="img" aria-label={`${s.label}: ${formatDecimal(s.hours)} horas`}>
                    {Array.from({ length: SLOT_ROWS }).map((_, row) => {
                      const level = Math.round((s.hours / s.max) * SLOT_ROWS);
                      const lit = SLOT_ROWS - row <= level;
                      return (
                        <i
                          key={row}
                          aria-hidden="true"
                          className="block size-3 justify-self-center rounded-full"
                          style={{ background: lit ? (s.isBest ? "var(--mode-bg)" : "var(--card-solid-ink)") : "var(--card-solid-line)" }}
                        />
                      );
                    })}
                  </div>
                  <div className="flex flex-col items-center gap-0.5 text-center">
                    <span className="text-[13px] font-medium" style={{ color: s.isBest ? "var(--mode-bg)" : "var(--card-solid-ink)" }}>
                      {s.label}
                    </span>
                    <span className="label-xs !text-[10px] text-card-solid-muted">{s.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card tone="solid" className="flex flex-col p-6 sm:p-7">
            <CardHeading className="mb-1 text-[17px] font-semibold text-card-solid-muted">Récords</CardHeading>
            <RecordRow label="Pomodoros del mes" value={formatInt(pomodorosMonth)} />
            <RecordRow label="Promedio diario" value={formatMinutes(avgDailyMin)} />
            <RecordRow label="Sesión más larga" value={formatMinutes(longestSession)} />
            <RecordRow label="Mejor racha" value={`${streak} días`} last />
          </Card>

          <Card tone="solid" className="flex flex-col gap-4 p-6 sm:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <CardHeading className="text-[17px] font-semibold text-card-solid-muted">Sesión libre</CardHeading>
              <span className="text-[13px] text-card-solid-muted">Todas las habilidades</span>
            </div>
            {!libreSummary.hasAny ? (
              <p className="m-0 text-card-solid-muted">Aún no registras sesiones libres. Pruébalas desde el Temporizador.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-8">
                  <Metric label="Sesiones libres del mes" value={formatInt(libreSummary.monthCount)} />
                  <Metric label="Tiempo libre del mes" value={formatMinutes(libreSummary.monthMinutes)} />
                </div>
                <div className="flex flex-col gap-1 pt-2">
                  <span className="label-xs text-card-solid-muted">En qué trabajaste</span>
                  <div className="flex flex-col">
                    {libreSummary.recent.map((s) => {
                      const skill = s.skillId ? skills.find((sk) => sk.id === s.skillId) : null;
                      return (
                        <div key={s.id} className="flex flex-wrap items-center gap-3 border-t border-card-solid-line py-3">
                          <span className="font-num min-w-20 text-[13px] text-card-solid-muted">{formatShortDateEs(new Date(s.startedAt))}</span>
                          <span className="min-w-[90px] font-semibold">{skill?.name ?? "General"}</span>
                          <span className="font-num min-w-16 text-sm text-card-solid-muted">{formatMinutes(s.durationMin)}</span>
                          <span className="min-w-[140px] flex-1 text-sm">
                            {s.note && s.note.trim() ? s.note : <span className="text-card-solid-muted">Sin objetivo anotado</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </Card>
        </>
      )}

      {view === 2 && (
        <>
          <Card tone="solid" className="flex flex-col p-6 pb-2 sm:p-7 sm:pb-2">
            <CardHeading className="mb-1 text-[17px] font-semibold text-card-solid-muted">Tiempo por habilidad</CardHeading>
            {split.map((s, i) => (
              <div key={s.id} className="border-t border-card-solid-line py-4 first:border-t-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[16px] font-semibold">
                    <span className="mr-2 text-card-solid-line">{i + 1}</span>
                    {s.name}
                  </span>
                  <span className="font-num text-[15px] font-bold" style={{ color: s.color }}>
                    {formatInt(s.hours)} h <span className="font-sans text-[13px] font-medium text-card-solid-muted">· {formatPercent(s.pct, 0)} del total</span>
                  </span>
                </div>
                <ProgressBar pct={s.pct} color={s.color} trackColor="var(--card-solid-line)" className="mt-2.5" height={8} ariaLabel={`${s.name}: ${formatPercent(s.pct, 0)} del tiempo total`} />
              </div>
            ))}
          </Card>

          {rankSkill && (
            <Card tone="solid" className="flex flex-col gap-5 p-6 sm:p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <CardHeading className="text-[17px] font-semibold text-card-solid-muted">Comparar una habilidad</CardHeading>
                <span className="text-[13px] text-card-solid-muted">Sin otros usuarios que comparar: elige una habilidad para ver su propio ritmo</span>
              </div>
              <div role="group" aria-label="Habilidad" className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <Chip key={s.id} pressed={rankSkill.id === s.id} dotColor={resolveSkillColor(s.color)} onClick={() => setRankSkillId(s.id)}>
                    {s.name}
                  </Chip>
                ))}
              </div>

              <div className="flex flex-wrap justify-between gap-6">
                <div className="flex flex-col gap-2">
                  <span className="label-xs text-card-solid-muted">{rankSkill.name}</span>
                  <div className="flex items-end gap-2.5">
                    <span className="font-num text-[44px] font-extrabold leading-none tracking-tight" style={{ color: rankColor }}>
                      {formatInt(rankHours)}
                    </span>
                    <span className="font-num pb-1 text-base text-card-solid-muted">/ {formatInt(rankSkill.goalHours)} h</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-6">
                  <div className="flex flex-col gap-0.5">
                    <span className="label-xs text-card-solid-muted">Ritmo actual</span>
                    <span className="font-num text-xl">{formatDecimal(rankCurrentPace)} h/sem</span>
                    <span className="text-[13px] text-card-solid-muted">{formatProjection(projectTimeRemaining(rankRemaining, rankCurrentPace))}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="label-xs text-card-solid-muted">Si practicas 3 h/día</span>
                    <span className="font-num text-xl">{formatDecimal(rankAltPace)} h/sem</span>
                    <span className="text-[13px] text-card-solid-muted">{formatProjection(projectTimeRemaining(rankRemaining, rankAltPace))}</span>
                  </div>
                </div>
              </div>
              <ProgressBar
                pct={(rankHours / rankSkill.goalHours) * 100}
                color={rankColor}
                trackColor="var(--card-solid-line)"
                ariaLabel={`${rankSkill.name}: ${formatInt(rankHours)} de ${formatInt(rankSkill.goalHours)} horas`}
              />

              <div className="flex flex-col gap-3 border-t border-card-solid-line pt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="font-semibold">Constancia · últimas 13 semanas</span>
                </div>
                <ConsistencyHeatmap
                  dailyMinutes={rankDailyMinutes}
                  timezone={timezone}
                  weeks={13}
                  scaleMinutes={Math.max(30, rankSkill.dailyGoalMin * 2)}
                  accentColor={rankColor}
                  ariaLabel={`Mapa de constancia diaria de ${rankSkill.name} en las últimas 13 semanas`}
                />
                {rankMastery && <p className="m-0 text-[13px] text-card-solid-muted">Ritmo real (90 días): {formatDecimal(rankActualPace)} h/sem · {rankMastery.message}</p>}
              </div>
            </Card>
          )}
        </>
      )}
    </>
  );
}

function FocusHoursChart({ bars, gapClassName }: { bars: Bar[]; gapClassName: string }) {
  const max = Math.max(1, ...bars.map((b) => b.hours)) * 1.1;
  const gridFractions = [0.5, 1];
  return (
    <div className="flex flex-col gap-2">
      <div className={cn("relative flex h-[180px] items-end border-b border-card-solid-line", gapClassName)}>
        {gridFractions.map((f) => (
          <div key={f} className="absolute left-0 right-0 border-t border-dashed border-card-solid-line" style={{ bottom: `${(f * 100) / 1.1}%` }}>
            <span className="absolute -left-0.5 -top-4 text-[11px] text-card-solid-muted">{formatDecimal((max / 1.1) * f)} h</span>
          </div>
        ))}
        {bars.map((b, i) => (
          <div
            key={i}
            title={`${formatDecimal(b.hours)} h`}
            className="flex-1 rounded-t-[3px] transition-[height]"
            style={{
              height: `${Math.max(1.5, (b.hours / max) * 100)}%`,
              background: b.highlight ? "var(--mode-bg)" : "color-mix(in srgb, var(--mode-bg) 32%, var(--card-solid-line))",
            }}
          />
        ))}
      </div>
      <div className={cn("flex text-[11.5px] text-card-solid-muted", gapClassName)}>
        {bars.map((b, i) => (
          <span key={i} className="flex-1 text-center whitespace-nowrap">
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-card bg-surface-muted px-2 py-4.5">
      <div className="font-num text-[32px] font-bold leading-[1.1]" style={{ color: "var(--mode-bg)" }}>
        {value}
      </div>
      <div className="mt-1 text-[13px] text-surface-muted-ink opacity-85">{label}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-xs text-card-solid-muted">{label}</span>
      <span className="font-num text-[32px] font-light">{value}</span>
    </div>
  );
}

function RecordRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-3.5 ${last ? "" : "border-b border-card-solid-line"}`}>
      <span className="font-semibold">{label}</span>
      <span className="font-num text-lg">{value}</span>
    </div>
  );
}
