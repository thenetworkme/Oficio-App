"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeading } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ModeBackdrop } from "@/components/layout/ModeBackdrop";
import { ConsistencyHeatmap } from "@/components/dashboard/ConsistencyHeatmap";
import { useAppData } from "@/lib/hooks/useAppData";
import { usePet } from "@/lib/hooks/usePet";
import { useChallenges } from "@/lib/hooks/useChallenges";
import { computeBestStreak } from "@/lib/streak";
import { buildSkillDailyMinutes } from "@/lib/heatmap";
import { resolveSkillColor } from "@/lib/skill-color";
import { sampleDayDots } from "@/lib/challenge-ui";
import { formatInt } from "@/lib/format";
import { dateKeyInTz } from "@/lib/tz";
import { watchReminders } from "@/lib/firestore/reminders";
import type { Reminder } from "@/lib/types";
import type { ChallengeDayState } from "@/lib/challenge";

/** "H:MM" — matches the giant-number treatment used across this screen and
 * the Temporizador page's own session log (see lib/format's formatMinutes
 * for the "Xh Ym" long form used elsewhere; this short form is what the
 * reference's big clock-style numbers expect). */
function formatHM(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}:${String(r).padStart(2, "0")}`;
}

/** 24h "HH:MM", matching the reference's session-log time column. */
function formatClock24(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Day-square fill for the active-challenge dot row, mirroring
 * app/(app)/retos/page.tsx's own local `squareStyle` (not challenge-ui.ts's
 * DAY_STATE_STYLE, which is the old "Punto" --ink/--signal treatment that
 * doesn't apply to the mode-color system — see that file's own comment for
 * why it's out of scope to edit). Kept as its own small copy here rather
 * than exported/shared, since this card sits on --card-solid (white) while
 * Retos' own grid sits on --mode-bg directly, so the "done" dot needs the
 * skill-agnostic --mode-bg fill either way but "today"/default need the
 * solid-card variants instead of Retos' on-color ones.
 */
function challengeDotStyle(state: ChallengeDayState): React.CSSProperties {
  switch (state) {
    case "done":
      return { background: "var(--mode-bg)" };
    case "today":
      return { background: "var(--card-solid)", boxShadow: "inset 0 0 0 2px var(--mode-bg)" };
    case "missed":
      return { background: "var(--surface-muted)", boxShadow: "inset 0 0 0 1.5px var(--danger)" };
    default:
      return { background: "var(--surface-muted)" };
  }
}

const HOURS_GOAL = 10_000;

export default function PanelPage() {
  const { user, skills, sessions, dailyMinutes, timezone, todayKey, todayMinutes, weekMinutes, totalHours, streak, profile, loading } =
    useAppData();
  const { level, xpIntoLevel } = usePet();
  const { stats: challengeStats } = useChallenges();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [heatmapFilter, setHeatmapFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return watchReminders(user.uid, (r) => setReminders(r.filter((x) => x.enabled)));
  }, [user]);

  const minDaily = profile?.dailyMinForStreak ?? 30;
  const bestStreak = Math.max(streak, computeBestStreak(dailyMinutes, minDaily));
  const todayCounts = (dailyMinutes[todayKey] ?? 0) >= minDaily;
  const streakDots = useMemo(() => {
    const litCount = Math.max(0, streak - (todayCounts ? 1 : 0));
    return Array.from({ length: 21 }, (_, i) => {
      const daysAgo = 20 - i;
      if (daysAgo === 0) return todayCounts || streak > 0 ? "on" : "off";
      if (daysAgo <= litCount) return "lit";
      return "off";
    });
  }, [streak, todayCounts]);

  const selectedSkill = skills.find((s) => s.id === selectedSkillId) ?? skills[0] ?? null;
  const todayGoalMin = skills.reduce((acc, s) => acc + s.dailyGoalMin, 0) || 120;
  const pct = todayGoalMin > 0 ? Math.min(100, Math.round((todayMinutes / todayGoalMin) * 100)) : 0;

  const heatmapSkill = heatmapFilter ? skills.find((s) => s.id === heatmapFilter) : null;
  const heatmapDaily = heatmapSkill ? buildSkillDailyMinutes(sessions, heatmapSkill.id, timezone) : dailyMinutes;
  const heatmapColor = heatmapSkill ? resolveSkillColor(heatmapSkill.color) : "var(--card-solid-ink)";

  const todaySessions = useMemo(
    () =>
      sessions
        .filter((s) => dateKeyInTz(new Date(s.startedAt), timezone) === todayKey)
        .sort((a, b) => a.startedAt - b.startedAt),
    [sessions, timezone, todayKey],
  );

  const nextReminder = useMemo(() => {
    if (reminders.length === 0) return null;
    return [...reminders].sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay))[0];
  }, [reminders]);

  const activeChallenge = challengeStats.find((c) => c.challenge.status === "active");

  return (
    <>
      <ModeBackdrop />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Card tone="tint" className="flex min-w-0 flex-col gap-6 px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex items-baseline justify-between text-[14px] text-mode-ink-muted">
            <span>Hoy · meta {formatHM(todayGoalMin)}</span>
            <span className="font-num text-mode-ink">{pct}%</span>
          </div>

          <div className="font-sans text-[56px] font-bold leading-none tracking-tight text-mode-ink tabular-nums sm:text-[72px]">
            {formatHM(todayMinutes)}
          </div>

          {skills.length === 0 ? (
            <p className="m-0 text-[15px] text-mode-ink-muted">
              Todavía no tienes habilidades.{" "}
              <Link href="/habilidades/nueva" className="font-semibold text-mode-ink underline underline-offset-2">
                Crea la primera
              </Link>
              .
            </p>
          ) : (
            <div role="group" aria-label="Habilidad" className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <Chip key={s.id} pressed={selectedSkill?.id === s.id} dotColor={resolveSkillColor(s.color)} onClick={() => setSelectedSkillId(s.id)}>
                  {s.name}
                </Chip>
              ))}
            </div>
          )}

          <Button asChild variant="go" size="lg" className="w-full sm:w-auto">
            <Link href="/temporizador">{skills.length === 0 ? "Empezar" : `Empezar · ${selectedSkill?.name}`}</Link>
          </Button>
        </Card>

        <Card tone="tint" className="flex min-w-0 flex-col gap-5 px-5 py-6 sm:px-7 sm:py-7">
          <span className="text-[14px] text-mode-ink-muted">Racha</span>
          <div className="flex items-baseline gap-3">
            <span className="font-num text-[56px] font-bold leading-none tracking-tight text-mode-ink sm:text-[64px]">{streak}</span>
            <span className="font-num text-[13px] text-mode-ink-muted">DÍAS · RÉCORD {bestStreak}</span>
          </div>
          <div className="grid grid-cols-[repeat(21,1fr)] gap-1.5">
            {streakDots.map((d, i) => (
              <i
                key={i}
                aria-hidden="true"
                className="aspect-square rounded-full"
                style={{ background: d === "on" ? "var(--mode-ink)" : d === "lit" ? "rgb(255 255 255 / 55%)" : "rgb(0 0 0 / 15%)" }}
              />
            ))}
          </div>
          <div className="mt-auto flex flex-col">
            <div className="flex items-baseline justify-between border-t border-card-tint-border py-2.5 text-[14px] text-mode-ink">
              <span className="text-mode-ink-muted">Semana</span>
              <span className="font-num">{formatHM(weekMinutes)} H</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-card-tint-border py-2.5 text-[14px] text-mode-ink">
              <span className="text-mode-ink-muted">Total</span>
              <span className="font-num">{formatInt(totalHours)} H</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-card-tint-border py-2.5 text-[14px] text-mode-ink">
              <span className="text-mode-ink-muted">Nivel</span>
              <span className="font-num">
                {level} · {formatInt(xpIntoLevel)} XP
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t border-card-tint-border py-2.5 text-[14px] text-mode-ink">
              <span className="text-mode-ink-muted">Recordatorio</span>
              <span className="font-num">{nextReminder ? nextReminder.timeOfDay : "—"}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card tone="solid" className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <CardHeading className="flex-1 text-[18px] font-semibold">Actividad · 52 semanas</CardHeading>
          <div role="group" aria-label="Filtrar" className="flex flex-wrap gap-2">
            <Chip pressed={heatmapFilter === null} onClick={() => setHeatmapFilter(null)}>
              Todas
            </Chip>
            {skills.map((s) => (
              <Chip key={s.id} pressed={heatmapFilter === s.id} dotColor={resolveSkillColor(s.color)} onClick={() => setHeatmapFilter(s.id)}>
                {s.name}
              </Chip>
            ))}
          </div>
        </div>
        <ConsistencyHeatmap dailyMinutes={heatmapDaily} timezone={timezone} weeks={52} accentColor={heatmapColor} />
      </Card>

      <Card tone="solid" className="flex flex-col gap-1 p-5 sm:p-6">
        <div className="mb-2 flex items-center gap-4">
          <CardHeading className="flex-1 text-[18px] font-semibold">Hacia las 10.000 horas</CardHeading>
          <Link href="/habilidades/nueva" className="text-[14px] font-semibold text-card-solid-muted transition-colors hover:text-card-solid-ink">
            + Nueva habilidad
          </Link>
        </div>
        {!loading && skills.length === 0 ? (
          <p className="py-4 text-center text-[15px] text-card-solid-muted">
            Todavía no tienes habilidades.{" "}
            <Link href="/habilidades/nueva" className="font-semibold text-card-solid-ink underline underline-offset-2">
              Crea la primera
            </Link>
            .
          </p>
        ) : (
          skills.map((skill) => {
            const hours = skill.totalMinutes / 60;
            const skillDaily = buildSkillDailyMinutes(sessions, skill.id, timezone);
            const perSkillStreak = (() => {
              let s = 0;
              let cursor = todayKey;
              const shift = (key: string, days: number) => {
                const [y, m, d] = key.split("-").map(Number);
                const dt = new Date(Date.UTC(y, m - 1, d));
                dt.setUTCDate(dt.getUTCDate() + days);
                return dt.toISOString().slice(0, 10);
              };
              if ((skillDaily[cursor] ?? 0) <= 0) cursor = shift(cursor, -1);
              for (;;) {
                if ((skillDaily[cursor] ?? 0) <= 0) break;
                s += 1;
                cursor = shift(cursor, -1);
              }
              return s;
            })();
            const todayForSkill = sessions
              .filter((s) => s.skillId === skill.id && dateKeyInTz(new Date(s.startedAt), timezone) === todayKey)
              .reduce((acc, s) => acc + s.durationMin, 0);
            return (
              <Link key={skill.id} href={`/habilidades/${skill.id}`} className="border-t border-card-solid-line py-3.5 first:border-t-0">
                <div className="flex items-center justify-between text-[15px] font-medium">
                  <span>{skill.name}</span>
                  <span className="font-num">{formatInt(hours)} h</span>
                </div>
                <ProgressBar
                  pct={(hours / HOURS_GOAL) * 100}
                  color="var(--mode-bg)"
                  trackColor="var(--card-solid-line)"
                  height={6}
                  className="mt-2"
                  ariaLabel={`${skill.name}: ${formatInt(hours)} de ${formatInt(HOURS_GOAL)} horas`}
                />
                <div className="mt-1.5 flex items-center justify-between text-[12.5px] text-card-solid-muted">
                  <span>Racha {perSkillStreak} d</span>
                  <span style={{ color: todayForSkill > 0 ? "var(--mode-bg)" : "var(--card-solid-muted)" }}>
                    {todayForSkill > 0 ? `+${formatHM(todayForSkill)}` : "00:00"}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Card tone="solid" className="min-w-0 p-5 sm:p-6">
          <CardHeading className="mb-3 text-[18px] font-semibold">Sesiones de hoy</CardHeading>
          {todaySessions.length === 0 ? (
            <p className="py-3 text-[14px] text-card-solid-muted">Todavía no has practicado hoy.</p>
          ) : (
            <div className="flex flex-col">
              {todaySessions.map((s) => {
                const skill = skills.find((sk) => sk.id === s.skillId);
                return (
                  <div key={s.id} className="grid grid-cols-[70px_1fr_60px] items-center gap-4 border-t border-card-solid-line py-3 first:border-t-0">
                    <span className="font-num text-[13px] text-card-solid-muted">{formatClock24(new Date(s.startedAt))}</span>
                    <span className="truncate text-[15px]">{skill?.name ?? (s.note || "Sesión libre")}</span>
                    <span className="font-num text-right text-[13px]">{formatHM(s.durationMin)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card tone="solid" className="min-w-0 p-5 sm:p-6">
          {activeChallenge ? (
            <>
              <div className="flex items-baseline justify-between text-[14px]">
                <Link href={`/retos/${activeChallenge.challenge.id}`} className="font-semibold text-card-solid-muted transition-colors hover:text-card-solid-ink">
                  Reto · {activeChallenge.challenge.name} →
                </Link>
                <span className="font-num">
                  {Math.min(activeChallenge.currentDayNumber, activeChallenge.challenge.totalDays)} / {activeChallenge.challenge.totalDays}
                </span>
              </div>
              <div className="my-5 grid grid-cols-[repeat(10,1fr)] gap-2">
                {sampleDayDots(activeChallenge.states, 30).map((st, i) => (
                  <i key={i} aria-hidden="true" className="aspect-square rounded-[4px]" style={challengeDotStyle(st)} />
                ))}
              </div>
              <p className="m-0 text-[14px] text-card-solid-muted">
                {activeChallenge.challenge.why ? (
                  <>
                    Tu porqué: <span className="text-card-solid-ink">{activeChallenge.challenge.why}</span>
                  </>
                ) : (
                  <>Sigue con tu reto de hoy.</>
                )}
              </p>
              <Button asChild variant="light" size="md" className="mt-4">
                <Link href={`/retos/${activeChallenge.challenge.id}/dia`}>Añadir nota</Link>
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-start gap-2.5">
              <CardHeading className="text-[18px] font-semibold">Retos</CardHeading>
              <p className="m-0 text-[14px] text-card-solid-muted">Aprende algo nuevo en un número fijo de días, con diario y seguimiento.</p>
              <Button asChild variant="dark" size="md" className="mt-1.5">
                <Link href="/retos/nuevo">+ Nuevo reto</Link>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
