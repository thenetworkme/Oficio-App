"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardHeading } from "@/components/ui/card";
import { Mascot } from "@/components/mascot/Mascot";
import { ConsistencyHeatmap } from "@/components/dashboard/ConsistencyHeatmap";
import { WeekBars, type DayTotal } from "@/components/dashboard/WeekBars";
import { StampAlbumCard } from "@/components/skills/StampAlbumCard";
import { useAppData } from "@/lib/hooks/useAppData";
import { usePet } from "@/lib/hooks/usePet";
import { formatInt, formatMinutesLong } from "@/lib/format";
import { dateKeyInTz } from "@/lib/tz";
import { watchReminders } from "@/lib/firestore/reminders";
import type { Reminder } from "@/lib/types";

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const DAY_NAMES_LONG = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export default function PanelPage() {
  const { user, skills, dailyMinutes, timezone, todayKey, todayMinutes, weekMinutes, streak, loading } = useAppData();
  const { pet, equipped, level, coins } = usePet();
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    if (!user) return;
    return watchReminders(user.uid, (r) => setReminders(r.filter((x) => x.enabled)));
  }, [user]);

  const weekDays: DayTotal[] = (() => {
    const out: DayTotal[] = [];
    const today = new Date();
    const dow = today.getDay();
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
  const minutesLeftToday = Math.max(0, todayGoalMin - todayMinutes);

  return (
    <>
      <section className="flex flex-wrap items-stretch gap-8">
        <div className="flex min-w-0 flex-[2_1_480px] flex-col justify-center gap-5 py-2">
          <h1 className="m-0 text-[64px] font-bold leading-[0.95] tracking-tight sm:text-[88px]">
            {streak} {streak === 1 ? "día" : "días"}
            <br />
            seguidos
            <span className="text-a2" style={{ WebkitTextStroke: "3px var(--ink)" }}>
              .
            </span>
          </h1>
          <p className="m-0 max-w-[520px] text-[18px] sm:text-[22px]">
            Hoy llevas{" "}
            <b className="bg-a1 px-1.5" style={{ color: "var(--ink)" }}>
              {formatMinutesLong(todayMinutes)}
            </b>
            . {minutesLeftToday > 0 ? `Faltan ${minutesLeftToday} para no romper la racha.` : "¡Meta de hoy cumplida!"}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/temporizador"
              className="bx hov press inline-flex min-h-14 items-center px-7 text-[18px] font-bold sm:text-[22px]"
              style={{ background: "var(--a2)", "--r": "-1deg" } as React.CSSProperties}
            >
              Empezar un tomate →
            </Link>
            <Link href="/registrar" className="bx hov press inline-flex min-h-14 items-center bg-card px-6 text-[16px] font-bold sm:text-[18px]">
              + Horas a mano
            </Link>
          </div>
        </div>

        <Link
          href="/tienda"
          aria-label={`Ir a la tienda de ${pet?.name ?? "Tomi"}`}
          className="bx hov flex flex-[1_1_250px] max-w-[300px] flex-col gap-2.5 self-center p-3.5"
          style={{ "--r": "-1.5deg", transform: "rotate(-1.5deg)" } as React.CSSProperties}
        >
          <div className="relative">
            <Mascot size={230} hat={equipped.hat} cape={equipped.cape} acc={equipped.acc} bg={equipped.bg} />
            <div className="bx absolute -right-3.5 -top-3 px-3 py-1.5 text-[13px] font-bold" style={{ background: "var(--a2)", transform: "rotate(6deg)" }}>
              ¡Racha {streak}!
            </div>
          </div>
          <div className="flex justify-between font-bold">
            <span>
              {pet?.name ?? "Tomi"} · Nv. {level}
            </span>
            <span className="font-num text-[13px]">{formatInt(coins)} $ →</span>
          </div>
        </Link>

        <div
          className="bx flex min-w-0 flex-[1_1_300px] flex-col gap-3 p-6"
          style={{ background: "var(--a3)", transform: "rotate(1.5deg)" }}
        >
          <span className="label-xs font-bold text-ink">Esta semana</span>
          <div className="font-num text-[56px] font-bold leading-none tracking-tight sm:text-[72px]">
            {formatInt(weekMinutes / 60)}
            <span className="text-[22px] sm:text-[28px]"> / {formatInt(weekGoalMin / 60)} h</span>
          </div>
          <WeekBars days={weekDays} />
        </div>
      </section>

      <section className="flex flex-col gap-4.5">
        <div className="flex flex-wrap items-baseline gap-3.5">
          <h2 className="m-0 text-[32px] font-bold tracking-tight sm:text-[38px]">Tu álbum de sellos</h2>
          <span className="font-num text-[14px]">1 sello = 100 horas</span>
        </div>
        {!loading && skills.length === 0 ? (
          <Card className="p-7 text-center text-muted">
            Todavía no tienes habilidades.{" "}
            <Link href="/habilidades/nueva" className="font-bold text-ink underline">
              Crea la primera
            </Link>
            .
          </Card>
        ) : (
          <div className="flex flex-wrap gap-7">
            {skills.map((s) => (
              <StampAlbumCard key={s.id} skill={s} />
            ))}
            <Link
              href="/habilidades/nueva"
              className="bx hov flex min-h-[220px] flex-[0_0_190px] flex-col items-center justify-center gap-2.5 bg-card p-6 text-center text-[22px] font-bold"
              style={{ borderStyle: "dashed", "--r": "1deg" } as React.CSSProperties}
            >
              <span aria-hidden="true" className="text-[56px] leading-none">
                +
              </span>
              Nueva habilidad
            </Link>
          </div>
        )}
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] gap-5">
        <Card className="flex flex-col gap-4 p-6">
          <CardHeading>Constancia</CardHeading>
          <ConsistencyHeatmap dailyMinutes={dailyMinutes} timezone={timezone} />
        </Card>

        <Card className="flex flex-col gap-2 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <CardHeading>Próximos recordatorios</CardHeading>
            <Link href="/recordatorios" className="min-h-11 inline-flex items-center text-sm font-bold underline">
              Gestionar →
            </Link>
          </div>
          {reminders.length === 0 ? (
            <p className="py-3 text-sm text-muted">No tienes recordatorios activos.</p>
          ) : (
            reminders.slice(0, 4).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-4 border-t-2 border-dashed border-ink py-3">
                <span className="font-num min-w-[72px] text-sm font-bold">{r.timeOfDay}</span>
                <span className="min-w-[180px] flex-1 font-bold">{r.message || reminderDefaultTitle(r.kind)}</span>
                <span className="text-[13px] text-muted">{reminderDaysLabel(r.days)}</span>
              </div>
            ))
          )}
        </Card>
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
