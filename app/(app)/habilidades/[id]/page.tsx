"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { format as dfFormat } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardHeading } from "@/components/ui/card";
import { DotDigits } from "@/components/ui/DotDigits";
import { HourRuler } from "@/components/ui/HourRuler";
import { ProgressBar } from "@/components/ui/progress-bar";
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
    return <Card className="p-8 text-center text-muted">Habilidad no encontrada.</Card>;
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

  return (
    <>
      <Link href="/" className="label-xs inline-flex min-h-11 items-center gap-2 self-start">
        <ArrowLeft size={14} aria-hidden="true" />
        Panel
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-2.5">
          <span className="label-xs">
            Desde {formatDateEs(new Date(skill.createdAt))} · {recent.length} sesiones
          </span>
          <div className="flex items-center gap-3.5">
            <span className="size-4 shrink-0 rounded-full" style={{ background: color }} />
            <h1 className="m-0 text-[44px] font-light leading-[0.95] tracking-tight sm:text-[56px]">{skill.name}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild variant="outline">
            <Link href="/registrar">Registrar horas</Link>
          </Button>
          <Button variant="outline" size="icon" aria-label="Editar habilidad">
            <Pencil size={18} aria-hidden="true" />
          </Button>
          <Button asChild variant="primary">
            <Link href="/temporizador">
              <Play size={16} fill="currentColor" aria-hidden="true" />
              Practicar ahora
            </Link>
          </Button>
        </div>
      </header>

      <Card className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] gap-8 p-7">
        <div className="flex flex-col gap-5">
          <div className="flex items-end gap-3">
            <DotDigits value={formatInt(hours)} size={15} onColor={color} ariaLabel={`${formatInt(hours)} horas`} />
            <span className="font-num pb-1.5 text-lg text-muted">/ {formatInt(skill.goalHours)} h</span>
          </div>
          <HourRuler
            currentHours={hours}
            goalHours={skill.goalHours}
            onColor={color}
            ariaLabel={`${skill.name}: ${formatInt(hours)} de ${formatInt(skill.goalHours)} horas`}
          />
        </div>

        <div className="flex flex-col sm:border-l sm:border-line sm:pl-8">
          <StatRow label="Racha" value={`${skillStreak} días`} />
          <StatRow label="Ritmo últimos 30 d" value={`${formatMinutes(dailyMinPace)} / día`} />
          {nextH && nextMilestoneProjection && (
            <StatRow label="Siguiente hito" value={`${formatInt(nextH)} h · ${formatProjection(nextMilestoneProjection)}`} />
          )}
          <StatRow
            label={`Proyección a ${formatInt(skill.goalHours)} h`}
            value={goalProjection.reached ? "Meta alcanzada" : formatProjection(goalProjection)}
          />
          {!goalProjection.reached && Number.isFinite(goalProjection.weeksRemaining) && (
            <StatRow label="Fecha estimada" value={estimatedDateLabel(goalProjection.weeksRemaining)} last />
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-5.5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <CardHeading>Actividad</CardHeading>
          <span className="text-[13px] text-muted">Últimas 26 semanas</span>
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
        <Card className="flex flex-col p-5.5">
          <CardHeading className="mb-2">Hitos</CardHeading>
          {MILESTONES.filter((m) => m <= skill.goalHours).map((m, i, arr) => {
            const done = hours >= m;
            const isNext = !done && m === nextH;
            const achievement = achievements.find((a) => a.hours === m);
            const status = done ? "Logrado" : isNext ? "Siguiente" : "Pendiente";
            return (
              <div
                key={m}
                className={`flex items-center gap-4 py-3.5 ${i < arr.length - 1 ? "border-b border-line" : ""}`}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: done ? color : "transparent", border: done ? "none" : `1px solid ${isNext ? color : "var(--border)"}` }}
                />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="font-num text-[15px] font-medium">{formatInt(m)} horas</span>
                  <span className="text-[13px] text-muted">
                    {done && achievement ? `Alcanzado el ${formatDateEs(new Date(achievement.achievedAt))}` : `Faltan ${formatInt(Math.max(0, m - hours))} h`}
                  </span>
                </div>
                <span className="label-xs" style={{ color: isNext ? color : undefined }}>
                  {status}
                </span>
              </div>
            );
          })}
        </Card>

        <Card className="flex flex-col p-5.5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
            <CardHeading>Sesiones recientes</CardHeading>
            <span className="text-[13px] text-muted">Calidad de 1 a 5</span>
          </div>
          {recent.length === 0 ? (
            <p className="py-3 text-sm text-muted">Todavía no hay sesiones registradas.</p>
          ) : (
            recent.slice(0, 8).map((s, i, arr) => (
              <div key={s.id} className={`flex flex-col gap-1.5 py-3.5 ${i < arr.length - 1 ? "border-b border-line" : ""}`}>
                <div className="flex flex-wrap items-center gap-2 gap-x-4">
                  <span className="min-w-[84px] font-semibold">{formatShortDateEs(new Date(s.startedAt))}</span>
                  <span className="font-num min-w-[70px] flex-1 text-sm text-muted">{formatMinutes(s.durationMin)}</span>
                  <div role="img" aria-label={`Calidad ${s.quality ?? 0} de 5`} className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className="size-2 rounded-full"
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
      </section>

      <Card className="flex flex-col gap-4.5 p-5.5">
        <CardHeading>Metas</CardHeading>
        <GoalRow label="Hoy" current={skillSessionsToday} goal={skill.dailyGoalMin} color={color} />
        <GoalRow label="Esta semana" current={skillSessionsWeek} goal={skill.dailyGoalMin * skill.daysPerWeek} color={color} />
      </Card>
    </>
  );
}

function StatRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-3 ${last ? "" : "border-b border-line"}`}>
      <span className="label-xs">{label}</span>
      <span className="font-num text-[15px]">{value}</span>
    </div>
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

/** Average minutes/day logged for `skillId` over the trailing 30 days — the
 * reference's "Ritmo últimos 30 d" stat (e.g. "1:37 / día"). */
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

/** "nov 2034" — short month + year, `weeksRemaining` from now. Page-local
 * display formatting only (not a projection.ts change): derives a calendar
 * estimate from the pure weeks-remaining figure already returned by
 * projectTimeRemaining. */
function estimatedDateLabel(weeksRemaining: number): string {
  const date = new Date(Date.now() + weeksRemaining * 7 * 24 * 60 * 60 * 1000);
  return dfFormat(date, "MMM yyyy", { locale: es });
}
