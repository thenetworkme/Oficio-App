"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { Card, CardHeading } from "@/components/ui/card";
import { ConsistencyHeatmap } from "@/components/dashboard/ConsistencyHeatmap";
import { WeekBars, type DayTotal } from "@/components/dashboard/WeekBars";
import { SkillProgressCard } from "@/components/skills/SkillProgressCard";
import { useAppData } from "@/lib/hooks/useAppData";
import { formatDateEs, formatInt, formatMinutes } from "@/lib/format";
import { dateKeyInTz } from "@/lib/tz";
import { watchReminders } from "@/lib/firestore/reminders";
import type { Reminder } from "@/lib/types";

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const DAY_NAMES_LONG = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

function greetingHeadline() {
  const h = new Date().getHours();
  if (h < 12) return "Una mañana productiva.";
  if (h < 19) return "Una hora más cerca.";
  return "Cierra el día con práctica.";
}

export default function PanelPage() {
  const { user, skills, sessions, dailyMinutes, timezone, todayKey, todayMinutes, weekMinutes, totalHours, loading } =
    useAppData();
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    if (!user) return;
    return watchReminders(user.uid, (r) => setReminders(r.filter((x) => x.enabled)));
  }, [user]);

  const weekDays: DayTotal[] = (() => {
    const out: DayTotal[] = [];
    const today = new Date();
    const dow = today.getDay(); // 0 Sun..6 Sat
    const mondayOffset = (dow + 6) % 7;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - mondayOffset + i);
      const key = dateKeyInTz(d, timezone);
      out.push({ label: DAY_LABELS[i], minutes: dailyMinutes[key] ?? 0, isToday: key === todayKey });
    }
    return out;
  })();

  const todayGoalMin = skills.reduce((acc, s) => acc + s.dailyGoalMin, 0) || 180;
  const weekGoalMin = todayGoalMin * 7;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="label-xs">{formatDateEs(new Date())}</span>
          <h1 className="m-0 text-4xl font-extrabold leading-tight tracking-tight">{greetingHeadline()}</h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/registrar"
            className="inline-flex min-h-12 items-center rounded-button border border-line px-5 font-semibold"
          >
            Registrar horas
          </Link>
          <Link
            href="/temporizador"
            className="inline-flex min-h-12 items-center gap-2.5 rounded-button bg-accent px-6 text-[16px] font-bold text-on"
          >
            <Play size={18} fill="currentColor" aria-hidden="true" />
            Iniciar sesión
          </Link>
        </div>
      </header>

      <section aria-label="Resumen" className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
        <Card className="flex flex-col gap-1.5 p-5">
          <span className="label-xs">Hoy</span>
          <span className="font-num text-[30px] font-medium">{formatMinutes(todayMinutes)}</span>
          <span className="text-[13px] text-muted">Meta diaria: {formatMinutes(todayGoalMin)}</span>
        </Card>
        <Card className="flex flex-col gap-1.5 p-5">
          <span className="label-xs">Esta semana</span>
          <span className="font-num text-[30px] font-medium">{formatMinutes(weekMinutes)}</span>
          <span className="text-[13px] text-muted">Meta semanal: {formatMinutes(weekGoalMin)}</span>
        </Card>
        <Card className="flex flex-col gap-1.5 p-5">
          <span className="label-xs">Total acumulado</span>
          <span className="font-num text-[30px] font-medium">{formatInt(totalHours)} h</span>
          <span className="text-[13px] text-muted">
            En {skills.length} {skills.length === 1 ? "habilidad" : "habilidades"}
          </span>
        </Card>
      </section>

      <section aria-labelledby="h-skills" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="h-skills" className="m-0 text-xl font-bold">
            Mis habilidades
          </h2>
          <div className="flex flex-wrap gap-5">
            <Link href="/habilidades/nueva" className="min-h-11 inline-flex items-center text-sm font-semibold">
              + Nueva habilidad
            </Link>
            <Link href="/estadisticas" className="min-h-11 inline-flex items-center text-sm text-muted">
              Ver estadísticas →
            </Link>
          </div>
        </div>
        {!loading && skills.length === 0 ? (
          <Card className="p-7 text-center text-muted">
            Todavía no tienes habilidades.{" "}
            <Link href="/habilidades/nueva" className="font-semibold text-text underline">
              Crea la primera
            </Link>
            .
          </Card>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
            {skills.map((s) => (
              <SkillProgressCard
                key={s.id}
                skill={s}
                todayMinutes={sessions
                  .filter((sess) => sess.skillId === s.id && dateKeyInTz(new Date(sess.startedAt), timezone) === todayKey)
                  .reduce((acc, sess) => acc + sess.durationMin, 0)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] gap-4">
        <Card className="flex flex-col gap-5 p-5.5">
          <CardHeading>Esta semana</CardHeading>
          <WeekBars days={weekDays} />
        </Card>
        <Card className="flex flex-col gap-5 p-5.5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <CardHeading>Constancia</CardHeading>
            <span className="text-[13px] text-muted">Últimas 14 semanas</span>
          </div>
          <ConsistencyHeatmap dailyMinutes={dailyMinutes} timezone={timezone} />
        </Card>
      </section>

      <section aria-labelledby="h-next" className="flex flex-col gap-2 rounded-card border border-line bg-card p-5.5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="h-next" className="m-0 text-lg font-bold">
            Próximos recordatorios
          </h2>
          <Link href="/recordatorios" className="min-h-11 inline-flex items-center text-sm text-muted">
            Gestionar →
          </Link>
        </div>
        {reminders.length === 0 ? (
          <p className="py-3 text-sm text-muted">No tienes recordatorios activos.</p>
        ) : (
          reminders.slice(0, 4).map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-4 border-t border-line py-3">
              <span className="font-num min-w-[72px] text-sm text-accent">{r.timeOfDay}</span>
              <span className="min-w-[180px] flex-1 font-semibold">{r.message || reminderDefaultTitle(r.kind)}</span>
              <span className="text-[13px] text-muted">{reminderDaysLabel(r.days)}</span>
            </div>
          ))
        )}
      </section>
    </>
  );
}

function reminderDefaultTitle(kind: Reminder["kind"]) {
  if (kind === "streak_guard") return "Protección de racha";
  if (kind === "weekly_review") return "Revisión semanal de horas";
  return "Bloque de práctica";
}

function reminderDaysLabel(days: number[]) {
  if (days.length === 7) return "Todos los días";
  if (days.length === 5 && !days.includes(6) && !days.includes(7)) return "Lunes a viernes";
  return days.map((d) => DAY_NAMES_LONG[d - 1]?.slice(0, 3)).join(", ");
}
