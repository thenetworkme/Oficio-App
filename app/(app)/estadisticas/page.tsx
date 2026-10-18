"use client";

import { useMemo, useState } from "react";
import { Card, CardHeading } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { DotDigits } from "@/components/ui/DotDigits";
import { HourRuler } from "@/components/ui/HourRuler";
import { MonthlyHoursChart, type MonthDatum } from "@/components/stats/MonthlyHoursChart";
import { ConsistencyHeatmap } from "@/components/dashboard/ConsistencyHeatmap";
import { useAppData } from "@/lib/hooks/useAppData";
import { resolveSkillColor } from "@/lib/skill-color";
import { formatDecimal, formatInt, formatMinutes, formatMonthYearEs, formatPercent, formatShortDateEs } from "@/lib/format";
import { hoursPerWeek, projectTimeRemaining, formatProjection, recentWeeklyPace, projectTenThousandHours } from "@/lib/projection";
import { computeBestStreak } from "@/lib/streak";
import { buildSkillDailyMinutes } from "@/lib/heatmap";
import { summarizeLibreSessions } from "@/lib/libre-sessions";

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const TIME_SLOTS = [
  { label: "Madrugada", sub: "5–8 am", from: 5, to: 8 },
  { label: "Mañana", sub: "8 am–1 pm", from: 8, to: 13 },
  { label: "Tarde", sub: "1–7 pm", from: 13, to: 19 },
  { label: "Noche", sub: "7 pm–12", from: 19, to: 24 },
];
const SLOT_ROWS = 7;

export default function EstadisticasPage() {
  const { skills, sessions, dailyMinutes, timezone } = useAppData();
  const [skillId, setSkillId] = useState<string | null>(null);
  const activeSkill = skills.find((s) => s.id === skillId) ?? skills[0];

  const months: MonthDatum[] = useMemo(() => {
    const now = new Date();
    const out: MonthDatum[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.getTime();
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
      const minutes = sessions.filter((s) => s.startedAt >= start && s.startedAt < end).reduce((a, s) => a + s.durationMin, 0);
      out.push({ label: MONTH_NAMES[d.getMonth()], hours: Math.round((minutes / 60) * 10) / 10, isCurrent: i === 0 });
    }
    return out;
  }, [sessions]);

  const totalMinutesAll = skills.reduce((acc, s) => acc + s.totalMinutes, 0);
  const split = skills.map((s) => ({
    name: s.name,
    hours: s.totalMinutes / 60,
    pct: totalMinutesAll > 0 ? (s.totalMinutes / totalMinutesAll) * 100 : 0,
    color: resolveSkillColor(s.color),
  }));

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

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthSessions = sessions.filter((s) => s.startedAt >= monthStart);
  const pomodorosMonth = monthSessions.reduce((a, s) => a + s.pomodoros, 0);
  const activeDays = new Set(monthSessions.map((s) => new Date(s.startedAt).toDateString())).size;
  const avgDailyMin = activeDays > 0 ? monthSessions.reduce((a, s) => a + s.durationMin, 0) / activeDays : 0;
  const longestSession = Math.max(0, ...sessions.map((s) => s.durationMin));
  const bestStreak = computeBestStreak(dailyMinutes, 30);
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- plain useMemo, no mutation; the compiler's heuristic trips on this file's shape.
  const libreSummary = useMemo(() => summarizeLibreSessions(sessions, monthStart), [sessions, monthStart]);

  if (!activeSkill) {
    return <Card className="p-8 text-center text-muted">Crea una habilidad para ver tus estadísticas.</Card>;
  }

  const hours = activeSkill.totalMinutes / 60;
  const currentPace = hoursPerWeek(activeSkill.dailyGoalMin, activeSkill.daysPerWeek);
  const altPace = hoursPerWeek(180, activeSkill.daysPerWeek);
  const remaining = Math.max(0, activeSkill.goalHours - hours);

  const skillDailyMinutes = buildSkillDailyMinutes(sessions, activeSkill.id, timezone);
  const actualPace = recentWeeklyPace(sessions, activeSkill.id);
  const masteryProjection = projectTenThousandHours(hours, actualPace);
  const skillColor = resolveSkillColor(activeSkill.color);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3.5">
          <span className="label-xs">Datos · {formatMonthYearEs(now)}</span>
          <h1 className="m-0 text-[52px] font-light leading-[0.95] tracking-tight sm:text-[68px]">Tus números</h1>
        </div>
      </header>

      <div role="group" aria-label="Habilidad" className="flex flex-wrap gap-2">
        {skills.map((s) => (
          <Chip key={s.id} pressed={activeSkill.id === s.id} dotColor={resolveSkillColor(s.color)} onClick={() => setSkillId(s.id)}>
            {s.name}
          </Chip>
        ))}
      </div>

      <Card className="flex flex-col gap-7 p-7">
        <div className="flex flex-wrap justify-between gap-6">
          <div className="flex flex-col gap-2">
            <CardHeading>Camino a las {formatInt(activeSkill.goalHours)} horas · {activeSkill.name}</CardHeading>
            <div className="flex items-end gap-3">
              <DotDigits value={formatInt(hours)} size={13} onColor={skillColor} ariaLabel={`${formatInt(hours)} horas`} />
              <span className="font-num pb-1 text-lg text-muted">h · {formatPercent((hours / activeSkill.goalHours) * 100)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col gap-0.5">
              <span className="label-xs">Ritmo actual</span>
              <span className="font-num text-xl">{formatDecimal(currentPace)} h/sem</span>
              <span className="text-[13px] text-muted">{formatProjection(projectTimeRemaining(remaining, currentPace))}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="label-xs">Si practicas 3 h/día</span>
              <span className="font-num text-xl">{formatDecimal(altPace)} h/sem</span>
              <span className="text-[13px] text-muted">{formatProjection(projectTimeRemaining(remaining, altPace))}</span>
            </div>
          </div>
        </div>
        <HourRuler currentHours={hours} goalHours={activeSkill.goalHours} onColor={skillColor} ariaLabel={`${activeSkill.name}: ${formatInt(hours)} de ${formatInt(activeSkill.goalHours)} horas`} />
      </Card>

      <Card className="flex flex-col gap-4 p-5.5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <CardHeading>Constancia · {activeSkill.name}</CardHeading>
          <span className="text-[13px] text-muted">Últimas 13 semanas</span>
        </div>
        <ConsistencyHeatmap
          dailyMinutes={skillDailyMinutes}
          timezone={timezone}
          weeks={13}
          scaleMinutes={Math.max(30, activeSkill.dailyGoalMin * 2)}
          accentColor={skillColor}
          ariaLabel={`Mapa de constancia diaria de ${activeSkill.name} en las últimas 13 semanas`}
        />
        <p className="m-0 text-[13px] text-muted">
          Ritmo real (90 días): {formatDecimal(actualPace)} h/sem · {masteryProjection.message}
        </p>
      </Card>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-4">
        <Card className="flex flex-col gap-5 p-5.5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <CardHeading>Horas por mes</CardHeading>
            <span className="text-[13px] text-muted">Últimos 12 meses · todas las habilidades</span>
          </div>
          <MonthlyHoursChart data={months} />
        </Card>

        <Card className="flex flex-col gap-5 p-5.5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <CardHeading>Reparto por habilidad</CardHeading>
            <span className="text-[13px] text-muted">{formatInt(totalMinutesAll / 60)} h en total</span>
          </div>
          <div className="flex h-10 items-stretch gap-[3px]" role="img" aria-label="Reparto proporcional por habilidad">
            {split.map((s) => (
              <div key={s.name} style={{ flex: Math.max(0.02, s.pct / 100), background: s.color }} className="rounded-[1px]" />
            ))}
          </div>
          <div className="flex flex-col">
            {split.map((s) => (
              <div key={s.name} className="flex items-center gap-4 border-t border-line py-3.5">
                <span className="size-3 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 font-semibold">{s.name}</span>
                <span className="font-num text-[13px] text-muted">{formatInt(s.hours)} h</span>
                <span className="font-num w-14 text-right text-[13px]">{formatPercent(s.pct, 0)}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-4">
        <Card className="flex flex-col gap-5 p-5.5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <CardHeading>Tu mejor momento del día</CardHeading>
            <span className="text-[13px] text-muted">Horas totales registradas por franja horaria</span>
          </div>
          <div className="flex items-end justify-between gap-4">
            {slots.map((s) => (
              <div key={s.label} className="flex flex-1 flex-col items-center gap-2.5">
                <span className="font-num text-xs text-muted">{formatDecimal(s.hours)} h</span>
                <div className="grid gap-1.5" role="img" aria-label={`${s.label}: ${formatDecimal(s.hours)} horas`}>
                  {Array.from({ length: SLOT_ROWS }).map((_, row) => {
                    const level = Math.round((s.hours / s.max) * SLOT_ROWS);
                    const lit = SLOT_ROWS - row <= level;
                    return (
                      <i
                        key={row}
                        aria-hidden="true"
                        className="block size-3 justify-self-center rounded-full"
                        style={{ background: lit ? (s.isBest ? "var(--signal)" : "var(--ink)") : "var(--line)" }}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-col items-center gap-0.5 text-center">
                  <span className="text-[13px] font-medium" style={{ color: s.isBest ? "var(--signal)" : "var(--ink)" }}>
                    {s.label}
                  </span>
                  <span className="label-xs !text-[10px]">{s.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col p-5.5">
          <CardHeading className="mb-2">Récords</CardHeading>
          <RecordRow label="Pomodoros del mes" value={formatInt(pomodorosMonth)} />
          <RecordRow label="Promedio diario" value={formatMinutes(avgDailyMin)} />
          <RecordRow label="Sesión más larga" value={formatMinutes(longestSession)} />
          <RecordRow label="Mejor racha" value={`${bestStreak} días`} last />
        </Card>
      </section>

      <Card className="flex flex-col gap-4 p-5.5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <CardHeading>Sesión libre</CardHeading>
          <span className="text-[13px] text-muted">Todas las habilidades</span>
        </div>

        {!libreSummary.hasAny ? (
          <p className="m-0 text-muted">Aún no registras sesiones libres. Pruébalas desde el Temporizador.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-8">
              <Metric label="Sesiones libres del mes" value={formatInt(libreSummary.monthCount)} />
              <Metric label="Tiempo libre del mes" value={formatMinutes(libreSummary.monthMinutes)} />
            </div>

            <div className="flex flex-col gap-1 pt-2">
              <span className="label-xs">En qué trabajaste</span>
              <div className="flex flex-col">
                {libreSummary.recent.map((s) => {
                  const skill = s.skillId ? skills.find((sk) => sk.id === s.skillId) : null;
                  return (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 border-t border-line py-3">
                      <span className="font-num min-w-20 text-[13px] text-muted">{formatShortDateEs(new Date(s.startedAt))}</span>
                      <span className="min-w-[90px] font-semibold">{skill?.name ?? "General"}</span>
                      <span className="font-num min-w-16 text-sm text-muted">{formatMinutes(s.durationMin)}</span>
                      <span className="min-w-[140px] flex-1 text-sm">
                        {s.note && s.note.trim() ? s.note : <span className="text-muted">Sin objetivo anotado</span>}
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
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-xs">{label}</span>
      <span className="font-num text-[32px] font-light">{value}</span>
    </div>
  );
}

function RecordRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-3.5 ${last ? "" : "border-b border-line"}`}>
      <span className="font-semibold">{label}</span>
      <span className="font-num text-lg">{value}</span>
    </div>
  );
}
