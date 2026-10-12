"use client";

import { useMemo, useState } from "react";
import { Card, CardHeading } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { MonthlyHoursChart, type MonthDatum } from "@/components/stats/MonthlyHoursChart";
import { ConsistencyHeatmap } from "@/components/dashboard/ConsistencyHeatmap";
import { useAppData } from "@/lib/hooks/useAppData";
import { resolveSkillColor } from "@/lib/skill-color";
import { formatDecimal, formatInt, formatMinutes, formatPercent, formatShortDateEs } from "@/lib/format";
import { hoursPerWeek, projectTimeRemaining, formatProjection, recentWeeklyPace, projectTenThousandHours } from "@/lib/projection";
import { computeBestStreak } from "@/lib/streak";
import { buildSkillDailyMinutes } from "@/lib/heatmap";
import { summarizeLibreSessions } from "@/lib/libre-sessions";

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const TIME_SLOTS = [
  { label: "Madrugada · 5–8 am", from: 5, to: 8 },
  { label: "Mañana · 8 am–1 pm", from: 8, to: 13 },
  { label: "Tarde · 1–7 pm", from: 13, to: 19 },
  { label: "Noche · 7 pm–12", from: 19, to: 24 },
];

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
    return TIME_SLOTS.map((slot, i) => ({ label: slot.label, hours: hoursBySlot[i], max, isBest: i === best }));
  }, [sessions]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthSessions = sessions.filter((s) => s.startedAt >= monthStart);
  const pomodorosMonth = monthSessions.reduce((a, s) => a + s.pomodoros, 0);
  const activeDays = new Set(monthSessions.map((s) => new Date(s.startedAt).toDateString())).size;
  const avgDailyMin = activeDays > 0 ? monthSessions.reduce((a, s) => a + s.durationMin, 0) / activeDays : 0;
  const longestSession = Math.max(0, ...sessions.map((s) => s.durationMin));
  const bestStreak = computeBestStreak(dailyMinutes, 30);
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

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="label-xs">Estadísticas</span>
          <h1 className="m-0 text-4xl font-bold leading-tight tracking-tight">Lo que mides, mejora.</h1>
        </div>
      </header>

      <div role="group" aria-label="Habilidad" className="flex flex-wrap gap-2">
        {skills.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={activeSkill.id === s.id}
            onClick={() => setSkillId(s.id)}
            className="inline-flex min-h-11 items-center gap-2 rounded-chip border-[3px] px-4.5 text-[15px] font-bold"
            style={{ borderColor: activeSkill.id === s.id ? resolveSkillColor(s.color) : "var(--ink)", background: activeSkill.id === s.id ? "var(--card)" : "transparent" }}
          >
            <span className="size-2.5 rounded-full" style={{ background: resolveSkillColor(s.color) }} />
            {s.name}
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-7 bx p-7">
        <div className="flex flex-wrap justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 className="m-0 text-lg font-bold">Camino a las {formatInt(activeSkill.goalHours)} horas · {activeSkill.name}</h2>
            <div className="flex items-baseline gap-2.5">
              <span className="font-num text-[56px] font-medium leading-none" style={{ color: resolveSkillColor(activeSkill.color) }}>
                {formatInt(hours)}
              </span>
              <span className="font-num text-lg text-muted">h · {formatPercent((hours / activeSkill.goalHours) * 100)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Card className="flex flex-col gap-0.5 px-4 py-3">
              <span className="label-xs">Ritmo actual</span>
              <span className="font-num text-xl">{formatDecimal(currentPace)} h/sem</span>
              <span className="text-[13px] text-muted">{formatProjection(projectTimeRemaining(remaining, currentPace))}</span>
            </Card>
            <Card className="flex flex-col gap-0.5 px-4 py-3">
              <span className="label-xs">Si practicas 3 h/día</span>
              <span className="font-num text-xl">{formatDecimal(altPace)} h/sem</span>
              <span className="text-[13px] text-muted">{formatProjection(projectTimeRemaining(remaining, altPace))}</span>
            </Card>
          </div>
        </div>
        <ProgressBar pct={(hours / activeSkill.goalHours) * 100} color={resolveSkillColor(activeSkill.color)} height={14} ariaLabel={`${activeSkill.name}: ${formatInt(hours)} de ${formatInt(activeSkill.goalHours)} horas`} />
      </section>

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
          accentColor={resolveSkillColor(activeSkill.color)}
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
          <div className="flex flex-col gap-4.5">
            {split.map((s) => (
              <div key={s.name} className="flex flex-col gap-2">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">{s.name}</span>
                  <span className="font-num text-sm text-muted">
                    {formatInt(s.hours)} h · {formatPercent(s.pct)}
                  </span>
                </div>
                <ProgressBar pct={s.pct} color={s.color} ariaLabel={`${s.name}: ${formatPercent(s.pct)}`} />
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-4">
        <Card className="flex flex-col gap-5 p-5.5">
          <div className="flex flex-col gap-1">
            <CardHeading>Tu mejor momento del día</CardHeading>
            <span className="text-[13px] text-muted">Horas totales registradas por franja horaria</span>
          </div>
          <div className="flex h-[150px] items-end justify-between gap-2.5">
            {slots.map((s) => (
              <div key={s.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="font-num text-xs text-muted">{formatDecimal(s.hours)} h</span>
                <div
                  className="w-full max-w-16 rounded-t-md rounded-b-sm border-2 border-ink"
                  style={{ height: Math.max(4, Math.round((s.hours / s.max) * 90)), background: s.isBest ? "var(--a1)" : "#fff" }}
                />
                <span className="text-center text-[13px] text-muted">{s.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] content-start gap-4 p-5.5">
          <Metric label="Pomodoros del mes" value={formatInt(pomodorosMonth)} />
          <Metric label="Promedio diario" value={formatMinutes(avgDailyMin)} />
          <Metric label="Sesión más larga" value={formatMinutes(longestSession)} />
          <Metric label="Mejor racha" value={`${bestStreak} días`} />
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
            <div className="flex flex-wrap gap-6">
              <Metric label="Sesiones libres del mes" value={formatInt(libreSummary.monthCount)} />
              <Metric label="Tiempo libre del mes" value={formatMinutes(libreSummary.monthMinutes)} />
            </div>

            <div className="flex flex-col gap-1">
              <span className="label-xs font-bold">En qué trabajaste</span>
              <div className="flex flex-col gap-1">
                {libreSummary.recent.map((s) => {
                  const skill = s.skillId ? skills.find((sk) => sk.id === s.skillId) : null;
                  return (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 border-t-2 border-dashed border-ink py-2.5">
                      <span className="font-num min-w-20 text-[13px] text-muted">{formatShortDateEs(new Date(s.startedAt))}</span>
                      <span className="min-w-[90px] font-bold">{skill?.name ?? "General"}</span>
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
      <span className="font-num text-[34px] font-medium">{value}</span>
    </div>
  );
}
