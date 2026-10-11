"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useAppData } from "@/lib/hooks/useAppData";
import { listSessionsForSkill } from "@/lib/firestore/sessions";
import { listAchievementsForSkill } from "@/lib/firestore/achievements";
import { resolveSkillColor } from "@/lib/skill-color";
import { formatDateEs, formatDecimal, formatInt, formatMinutes, formatPercent, formatShortDateEs } from "@/lib/format";
import { MILESTONES, nextMilestone } from "@/lib/milestones";
import { projectTimeRemaining, formatProjection } from "@/lib/projection";
import type { Achievement, PracticeSession } from "@/lib/types";

export default function SkillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { skills, sessions: allSessions } = useAppData();
  const skill = skills.find((s) => s.id === id);
  const [recent, setRecent] = useState<PracticeSession[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (!id) return;
    listSessionsForSkill(id, 50).then(setRecent);
    listAchievementsForSkill(id).then(setAchievements);
  }, [id]);

  const weeks = useMemo(() => buildWeeklyTotals(recent, 8), [recent]);

  if (!skill) {
    return <Card className="p-8 text-center text-muted">Habilidad no encontrada.</Card>;
  }

  const color = resolveSkillColor(skill.color);
  const hours = skill.totalMinutes / 60;
  const pct = Math.min(100, (hours / skill.goalHours) * 100);
  const nextH = nextMilestone(hours);
  const weeklyPace = skillWeeklyHours(allSessions, skill.id);
  const projection = nextH ? projectTimeRemaining(nextH - hours, weeklyPace) : null;

  const skillSessionsToday = allSessions
    .filter((s) => s.skillId === skill.id)
    .filter((s) => new Date(s.startedAt).toDateString() === new Date().toDateString())
    .reduce((acc, s) => acc + s.durationMin, 0);
  const skillSessionsWeek = weekMinutesForSkill(allSessions, skill.id);
  const maxWeek = Math.max(1, ...weeks.map((w) => w.minutes));

  return (
    <>
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-muted">
        <ArrowLeft size={16} aria-hidden="true" />
        Panel
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="label-xs">
            Desde {formatDateEs(new Date(skill.createdAt))} · {recent.length} sesiones
          </span>
          <div className="flex items-center gap-3.5">
            <span className="size-4 rounded-full" style={{ background: color }} />
            <h1 className="m-0 text-[44px] font-bold leading-tight tracking-tight">{skill.name}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/registrar" className="inline-flex min-h-12 items-center gap-2 rounded-button border border-line px-5 font-semibold">
            Registrar horas
          </Link>
          <button aria-label="Editar habilidad" className="flex size-12 items-center justify-center rounded-button border border-line">
            <Pencil size={20} aria-hidden="true" />
          </button>
          <Link
            href="/temporizador"
            className="inline-flex min-h-12 items-center gap-2.5 rounded-button px-6 text-[16px] font-bold"
            style={{ background: "var(--accent)", color: "var(--on)" }}
          >
            <Play size={18} fill="currentColor" aria-hidden="true" />
            Practicar ahora
          </Link>
        </div>
      </header>

      <section className="flex flex-col gap-7 rounded-card border border-line bg-card p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 className="m-0 text-base font-semibold text-muted">Progreso hacia las {formatInt(skill.goalHours)} horas</h2>
            <div className="flex items-baseline gap-2.5">
              <span className="font-num text-[56px] font-medium leading-none" style={{ color }}>
                {formatInt(hours)}
              </span>
              <span className="font-num text-lg text-muted">h · {formatPercent((hours / skill.goalHours) * 100)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-0.5 text-right">
            <span className="label-xs">Siguiente hito</span>
            <span className="font-num text-xl">{nextH ? `${formatInt(nextH)} h` : "Completado"}</span>
            {nextH && (
              <span className="text-[13px] text-muted">
                faltan {formatInt(nextH - hours)} h · {formatProjection(projection!)} a tu ritmo
              </span>
            )}
          </div>
        </div>
        <div className="pb-7">
          <ProgressBar pct={pct} color={color} ariaLabel={`${skill.name}: ${formatInt(hours)} de ${formatInt(skill.goalHours)} horas`} />
        </div>
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3 p-0">
          {MILESTONES.filter((m) => m <= skill.goalHours).map((m) => {
            const done = hours >= m;
            const isNext = !done && m === nextH;
            const achievement = achievements.find((a) => a.hours === m);
            return (
              <li
                key={m}
                className="flex flex-col gap-0.5 rounded-xl border px-4 py-3.5"
                style={{ borderColor: done ? "var(--line)" : isNext ? color : "var(--line)" }}
              >
                <span className="font-num text-lg font-medium" style={{ color: done ? color : "var(--text)" }}>
                  {formatInt(m)} h
                </span>
                <span className="text-[13px] text-muted">
                  {done && achievement
                    ? `Alcanzado el ${formatDateEs(new Date(achievement.achievedAt))}`
                    : `Faltan ${formatInt(Math.max(0, m - hours))} h`}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-start gap-4">
        <Card className="flex flex-col gap-1.5 p-5.5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="m-0 text-lg font-bold">Sesiones recientes</h2>
            <span className="text-[13px] text-muted">Calidad de práctica de 1 a 5</span>
          </div>
          {recent.length === 0 ? (
            <p className="py-3 text-sm text-muted">Todavía no hay sesiones registradas.</p>
          ) : (
            recent.slice(0, 8).map((s) => (
              <div key={s.id} className="flex flex-col gap-1.5 border-t border-line py-3.5">
                <div className="flex flex-wrap items-center gap-2 gap-x-4">
                  <span className="min-w-[84px] font-semibold">{formatShortDateEs(new Date(s.startedAt))}</span>
                  <span className="font-num min-w-[70px] flex-1 text-sm">{formatMinutes(s.durationMin)}</span>
                  <div role="img" aria-label={`Calidad ${s.quality ?? 0} de 5`} className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className="size-2.5 rounded-full"
                        style={{ background: (s.quality ?? 0) >= n ? color : "var(--line)" }}
                      />
                    ))}
                  </div>
                </div>
                {s.note && <span className="text-sm text-muted">{s.note}</span>}
              </div>
            ))
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-5 p-5.5">
            <h2 className="m-0 text-lg font-bold">Horas por semana</h2>
            <div className="flex h-[190px] items-end justify-between gap-2">
              {weeks.map((w, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="font-num text-xs text-muted">{formatDecimal(w.minutes / 60)}</span>
                  <div
                    className="w-full max-w-[38px] rounded-t-md rounded-b-sm"
                    style={{
                      height: Math.max(3, Math.round((w.minutes / maxWeek) * 120)),
                      background: i === weeks.length - 1 ? color : "#8A8F80",
                    }}
                  />
                  <span className="whitespace-nowrap text-[11px] text-muted">{w.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-4.5 p-5.5">
            <h2 className="m-0 text-lg font-bold">Metas</h2>
            <GoalRow label="Hoy" current={skillSessionsToday} goal={skill.dailyGoalMin} color={color} />
            <GoalRow label="Esta semana" current={skillSessionsWeek} goal={skill.dailyGoalMin * skill.daysPerWeek} color={color} />
          </Card>
        </div>
      </section>
    </>
  );
}

function GoalRow({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between gap-3">
        <span className="font-semibold">{label}</span>
        <span className="font-num text-sm text-muted">
          {formatMinutes(current)} / {formatMinutes(goal)}
        </span>
      </div>
      <ProgressBar pct={(current / Math.max(1, goal)) * 100} color={color} ariaLabel={`${label}: ${formatMinutes(current)} de ${formatMinutes(goal)}`} />
    </div>
  );
}

function skillWeeklyHours(sessions: PracticeSession[], skillId: string): number {
  const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
  const minutes = sessions
    .filter((s) => s.skillId === skillId && s.startedAt >= fourWeeksAgo)
    .reduce((acc, s) => acc + s.durationMin, 0);
  return minutes / 60 / 4;
}

function weekMinutesForSkill(sessions: PracticeSession[], skillId: string): number {
  const now = new Date();
  const dow = now.getDay();
  const mondayOffset = (dow + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - mondayOffset);
  return sessions
    .filter((s) => s.skillId === skillId && s.startedAt >= monday.getTime())
    .reduce((acc, s) => acc + s.durationMin, 0);
}

function buildWeeklyTotals(sessions: PracticeSession[], weeksCount: number) {
  const now = new Date();
  const out: { label: string; minutes: number }[] = [];
  for (let i = weeksCount - 1; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    const minutes = sessions
      .filter((s) => s.startedAt > start.getTime() && s.startedAt <= end.getTime())
      .reduce((acc, s) => acc + s.durationMin, 0);
    out.push({ label: formatShortDateEs(start).replace(/^\w+\s/, ""), minutes });
  }
  return out;
}
