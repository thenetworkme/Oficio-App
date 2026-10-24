"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeading } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ModeBackdrop } from "@/components/layout/ModeBackdrop";
import { ConsistencyHeatmap } from "@/components/dashboard/ConsistencyHeatmap";
import { useAppData } from "@/lib/hooks/useAppData";
import { listSessionsForSkill } from "@/lib/firestore/sessions";
import { listAchievementsForSkill } from "@/lib/firestore/achievements";
import { resolveSkillColor } from "@/lib/skill-color";
import { formatDateEs, formatInt, formatMinutes, formatShortDateEs } from "@/lib/format";
import { MILESTONES, nextMilestone } from "@/lib/milestones";
import { projectTimeRemaining, formatProjection } from "@/lib/projection";
import { buildSkillDailyMinutes } from "@/lib/heatmap";
import { computeCurrentStreak } from "@/lib/streak";
import { dateKeyInTz } from "@/lib/tz";
import { cn } from "@/lib/cn";
import type { Achievement, PracticeSession } from "@/lib/types";

export default function SkillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { skills, sessions: allSessions, timezone } = useAppData();
  const skill = skills.find((s) => s.id === id);
  const [recent, setRecent] = useState<PracticeSession[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (!id) return;
    listSessionsForSkill(id, 50).then(setRecent);
    listAchievementsForSkill(id).then(setAchievements);
  }, [id]);

  if (!skill) {
    return (
      <>
        <ModeBackdrop />
        <Card tone="solid" className="p-8 text-center text-card-solid-muted">
          Habilidad no encontrada.
        </Card>
      </>
    );
  }

  const color = resolveSkillColor(skill.color);
  const hours = skill.totalMinutes / 60;
  const nextH = nextMilestone(hours);
  const weeklyPace = skillWeeklyHours(allSessions, skill.id);
  const dailyMinPace = last30DaysAvgMinPerDay(allSessions, skill.id);
  const nextMilestoneProjection = nextH ? projectTimeRemaining(nextH - hours, weeklyPace) : null;
  const goalProjection = projectTimeRemaining(Math.max(0, skill.goalHours - hours), weeklyPace);

  // Per-skill "racha": consecutive days (ending today/yesterday) with any
  // logged practice for this skill — a lighter bar than the app-wide streak
  // (which requires profile.dailyMinForStreak across all skills combined),
  // matching the reference's skill-scoped "Racha" stat.
  const skillDailyMinutes = buildSkillDailyMinutes(allSessions, skill.id, timezone);
  const todayKey = dateKeyInTz(new Date(), timezone);
  const skillStreak = computeCurrentStreak(skillDailyMinutes, 1, todayKey);

  const skillSessionsToday = allSessions
    .filter((s) => s.skillId === skill.id)
    .filter((s) => new Date(s.startedAt).toDateString() === new Date().toDateString())
    .reduce((acc, s) => acc + s.durationMin, 0);
  const skillSessionsWeek = weekMinutesForSkill(allSessions, skill.id);

  const milestoneMarks = MILESTONES.filter((m) => m < skill.goalHours);

  const last14Days = buildLast14DayBars(skillDailyMinutes, timezone);

  return (
    <>
      <ModeBackdrop />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="label-xs inline-flex min-h-11 items-center gap-2 self-start text-mode-ink-muted hover:text-mode-ink">
          <ArrowLeft size={14} aria-hidden="true" />
          Panel
        </Link>
        <Button variant="onColor" size="iconSm" aria-label="Editar habilidad">
          <Pencil size={16} aria-hidden="true" />
        </Button>
      </div>

      <div role="tablist" aria-label="Habilidad" className="flex flex-wrap gap-1">
        {skills.map((s) => (
          <Link
            key={s.id}
            href={`/habilidades/${s.id}`}
            role="tab"
            aria-selected={s.id === skill.id}
            className={cn(
              "rounded-[4px] px-3 py-1 text-[16px] transition-colors",
              s.id === skill.id ? "bg-black/15 font-semibold text-mode-ink" : "font-normal text-mode-ink/90 hover:bg-white/10",
            )}
          >
            {s.name}
          </Link>
        ))}
      </div>

      <Card tone="solid" className="flex flex-col gap-6 p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="label-xs text-card-solid-muted">{skill.name}</span>
            <div className="font-num mt-1.5 text-[52px] font-extrabold leading-none tracking-tight sm:text-[64px]" style={{ color }}>
              {formatInt(hours)}
              <span className="text-[20px] font-semibold text-card-solid-muted"> / {formatInt(skill.goalHours)} h</span>
            </div>
          </div>
          <div className="text-right">
            <span className="label-xs text-card-solid-muted">Proyección</span>
            <div className="mt-1 text-xl font-bold">{goalProjection.reached ? "Meta alcanzada" : formatProjection(goalProjection)}</div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <ProgressBar
            pct={(hours / skill.goalHours) * 100}
            color={color}
            trackColor="var(--card-solid-line)"
            height={10}
            marks={milestoneMarks.map((m) => (m / skill.goalHours) * 100)}
            ariaLabel={`${skill.name}: ${formatInt(hours)} de ${formatInt(skill.goalHours)} horas`}
          />
          <div className="flex justify-between text-[12px] text-card-solid-muted">
            <span>0</span>
            {milestoneMarks.map((m) => <span key={m}>{formatInt(m)}</span>)}
            <span>{formatInt(skill.goalHours)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button asChild variant="dark" size="md" className="flex-1 sm:flex-none">
            <Link href="/temporizador">
              <Play size={14} fill="currentColor" aria-hidden="true" />
              Practicar ahora
            </Link>
          </Button>
          <Button asChild variant="light" size="md">
            <Link href="/registrar">Registrar horas</Link>
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2.5">
        <Card tone="tint" className="p-4.5">
          <div className="font-num text-[28px] font-bold leading-[1.1]">{formatMinutes(skillSessionsWeek)}</div>
          <div className="mt-0.5 text-[13px] opacity-85">esta semana</div>
        </Card>
        <Card tone="tint" className="p-4.5">
          <div className="font-num text-[28px] font-bold leading-[1.1]">{skillStreak}</div>
          <div className="mt-0.5 text-[13px] opacity-85">de racha</div>
        </Card>
        <Card tone="tint" className="p-4.5">
          <div className="font-num text-[28px] font-bold leading-[1.1]">{formatMinutes(dailyMinPace)}</div>
          <div className="mt-0.5 text-[13px] opacity-85">por día</div>
        </Card>
      </div>

      <Card tone="solid" className="flex flex-col gap-3.5 p-6 sm:p-7">
        <CardHeading className="text-[14px] font-bold uppercase tracking-tight text-card-solid-muted">Últimos 14 días</CardHeading>
        <div className="flex h-[110px] items-end gap-1.5 border-b border-card-solid-line">
          {last14Days.map((d, i) => (
            <div
              key={i}
              title={formatMinutes(d.minutes)}
              className="flex-1 rounded-t-[3px]"
              style={{
                height: `${Math.max(2, (d.minutes / Math.max(1, last14Days.reduce((m, x) => Math.max(m, x.minutes), 0) * 1.1)) * 100)}%`,
                background: d.isToday ? color : `color-mix(in srgb, ${color} 32%, var(--card-solid-line))`,
              }}
            />
          ))}
        </div>
      </Card>

      <Card tone="solid" className="flex flex-col p-6 sm:p-7">
        <CardHeading className="mb-1 text-[14px] font-bold uppercase tracking-tight text-card-solid-muted">Sesiones recientes</CardHeading>
        {recent.length === 0 ? (
          <p className="py-3 text-sm text-card-solid-muted">Todavía no hay sesiones registradas.</p>
        ) : (
          recent.slice(0, 8).map((s) => (
            <div key={s.id} className="grid grid-cols-[100px_1fr_auto] items-center gap-3 border-t border-card-solid-line py-3.5 first:border-t-0">
              <span className="text-card-solid-muted">{formatShortDateEs(new Date(s.startedAt))}</span>
              <div className="flex flex-col gap-1">
                <span className="font-medium">{s.note && s.note.trim() ? s.note : "Sesión de práctica"}</span>
                <div role="img" aria-label={`Calidad ${s.quality ?? 0} de 5`} className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className="size-1.5 rounded-full" style={{ background: (s.quality ?? 0) >= n ? color : "var(--card-solid-line)" }} />
                  ))}
                </div>
              </div>
              <span className="font-num font-bold" style={{ color }}>
                {formatMinutes(s.durationMin)}
              </span>
            </div>
          ))
        )}
      </Card>

      <Card tone="solid" className="flex flex-col gap-4 p-6 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <CardHeading className="text-[14px] font-bold uppercase tracking-tight text-card-solid-muted">Actividad</CardHeading>
          <span className="text-[13px] text-card-solid-muted">Últimas 26 semanas</span>
        </div>
        <ConsistencyHeatmap
          dailyMinutes={skillDailyMinutes}
          timezone={timezone}
          weeks={26}
          scaleMinutes={Math.max(30, skill.dailyGoalMin * 2)}
          accentColor={color}
          ariaLabel={`Mapa de actividad diaria de ${skill.name} en las últimas 26 semanas`}
        />
      </Card>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] items-start gap-4">
        <Card tone="solid" className="flex flex-col p-6 sm:p-7">
          <CardHeading className="mb-2 text-[14px] font-bold uppercase tracking-tight text-card-solid-muted">Hitos</CardHeading>
          {MILESTONES.filter((m) => m <= skill.goalHours).map((m, i, arr) => {
            const done = hours >= m;
            const isNext = !done && m === nextH;
            const achievement = achievements.find((a) => a.hours === m);
            const status = done ? "Logrado" : isNext ? "Siguiente" : "Pendiente";
            return (
              <div key={m} className={`flex items-center gap-4 py-3.5 ${i < arr.length - 1 ? "border-b border-card-solid-line" : ""}`}>
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: done ? color : "transparent", border: done ? "none" : `1px solid ${isNext ? color : "var(--card-solid-line)"}` }}
                />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="font-num text-[15px] font-medium">{formatInt(m)} horas</span>
                  <span className="text-[13px] text-card-solid-muted">
                    {done && achievement ? `Alcanzado el ${formatDateEs(new Date(achievement.achievedAt))}` : `Faltan ${formatInt(Math.max(0, m - hours))} h`}
                  </span>
                </div>
                <span className="label-xs" style={{ color: isNext ? color : "var(--card-solid-muted)" }}>
                  {status}
                </span>
              </div>
            );
          })}
        </Card>

        <Card tone="solid" className="flex flex-col gap-4.5 p-6 sm:p-7">
          <CardHeading className="text-[14px] font-bold uppercase tracking-tight text-card-solid-muted">Metas</CardHeading>
          <GoalRow label="Hoy" current={skillSessionsToday} goal={skill.dailyGoalMin} color={color} />
          <GoalRow label="Esta semana" current={skillSessionsWeek} goal={skill.dailyGoalMin * skill.daysPerWeek} color={color} />
          {nextH && nextMilestoneProjection && (
            <p className="m-0 border-t border-card-solid-line pt-4 text-[13px] text-card-solid-muted">
              Siguiente hito: {formatInt(nextH)} h · {formatProjection(nextMilestoneProjection)}
            </p>
          )}
        </Card>
      </section>
    </>
  );
}

function GoalRow({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between gap-3">
        <span className="font-semibold">{label}</span>
        <span className="font-num text-sm text-card-solid-muted">
          {formatMinutes(current)} / {formatMinutes(goal)}
        </span>
      </div>
      <ProgressBar pct={(current / Math.max(1, goal)) * 100} color={color} trackColor="var(--card-solid-line)" ariaLabel={`${label}: ${formatMinutes(current)} de ${formatMinutes(goal)}`} />
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

/** Average minutes/day logged for `skillId` over the trailing 30 days — the
 * reference's "Promedio diario" stat. */
function last30DaysAvgMinPerDay(sessions: PracticeSession[], skillId: string): number {
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const minutes = sessions
    .filter((s) => s.skillId === skillId && s.startedAt >= since)
    .reduce((acc, s) => acc + s.durationMin, 0);
  return minutes / 30;
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

/** Last 14 calendar days' minutes for this skill (reference's "Últimos 14
 * días" bar chart), from the already-built per-day minutes map. */
function buildLast14DayBars(dailyMinutes: Record<string, number>, timezone: string): { minutes: number; isToday: boolean }[] {
  const out: { minutes: number; isToday: boolean }[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateKeyInTz(d, timezone);
    out.push({ minutes: dailyMinutes[key] ?? 0, isToday: i === 0 });
  }
  return out;
}
