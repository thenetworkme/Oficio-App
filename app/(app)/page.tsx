"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { DotDigits } from "@/components/ui/DotDigits";
import { HourRuler } from "@/components/ui/HourRuler";
import { ConsistencyHeatmap } from "@/components/dashboard/ConsistencyHeatmap";
import { useAppData } from "@/lib/hooks/useAppData";
import { usePet } from "@/lib/hooks/usePet";
import { useChallenges } from "@/lib/hooks/useChallenges";
import { computeBestStreak } from "@/lib/streak";
import { buildSkillDailyMinutes } from "@/lib/heatmap";
import { resolveSkillColor } from "@/lib/skill-color";
import { DAY_STATE_STYLE, sampleDayDots } from "@/lib/challenge-ui";
import { formatInt } from "@/lib/format";
import { dateKeyInTz } from "@/lib/tz";
import { watchReminders } from "@/lib/firestore/reminders";
import type { Reminder } from "@/lib/types";

/** "H:MM" — the dot-matrix-friendly hour:minute format used across this
 * screen's hero number and per-skill delta badges (DotDigits only accepts
 * digits/':'/'.' — see lib/dotmatrix.ts). */
function formatHM(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}:${String(r).padStart(2, "0")}`;
}

/** 24h "HH:MM" clock, matching the reference's session-log time column. */
function formatClock24(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

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
    const whiteCount = Math.max(0, streak - (todayCounts ? 1 : 0));
    return Array.from({ length: 21 }, (_, i) => {
      const daysAgo = 20 - i;
      if (daysAgo === 0) return todayCounts || streak > 0 ? "signal" : "dim";
      if (daysAgo <= whiteCount) return "ink";
      return "dim";
    });
  }, [streak, todayCounts]);

  const selectedSkill = skills.find((s) => s.id === selectedSkillId) ?? skills[0] ?? null;
  const todayGoalMin = skills.reduce((acc, s) => acc + s.dailyGoalMin, 0) || 120;
  const pct = todayGoalMin > 0 ? Math.min(100, Math.round((todayMinutes / todayGoalMin) * 100)) : 0;

  const heatmapSkill = heatmapFilter ? skills.find((s) => s.id === heatmapFilter) : null;
  const heatmapDaily = heatmapSkill ? buildSkillDailyMinutes(sessions, heatmapSkill.id, timezone) : dailyMinutes;
  const heatmapColor = heatmapSkill ? resolveSkillColor(heatmapSkill.color) : "var(--ink)";

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
      <section className="grid grid-cols-1 border-b border-line lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex min-w-0 flex-col gap-7 py-9 pr-0 lg:border-r lg:border-line lg:pr-12">
          <div className="label-xs flex justify-between">
            <span>
              Hoy · meta {formatHM(todayGoalMin)}
            </span>
            <span className="text-ink">{pct}%</span>
          </div>
          <div className="overflow-x-auto">
            <DotDigits
              value={formatHM(todayMinutes)}
              size={20}
              gap={8}
              ariaLabel={`${formatHM(todayMinutes)} de ${formatHM(todayGoalMin)} hoy`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/temporizador"
              className="inline-flex min-h-[52px] items-center gap-3 rounded-button border border-signal bg-signal px-6 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-ink-solid transition-colors hover:brightness-110"
            >
              <Play size={14} aria-hidden="true" fill="currentColor" />
              {skills.length === 0 ? "Empezar" : `Empezar · ${selectedSkill?.name}`}
            </Link>
            {skills.length > 0 && (
              <div role="group" aria-label="Habilidad" className="flex flex-wrap gap-4 pl-1">
                {skills.map((s) => {
                  const on = selectedSkill?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSelectedSkillId(s.id)}
                      className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.1em] transition-colors"
                      style={{ color: on ? "var(--ink)" : "var(--muted)" }}
                    >
                      {on && <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: "var(--signal)" }} />}
                      {s.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {!loading && skills.length === 0 && (
            <p className="m-0 text-sm text-muted">
              Todavía no tienes habilidades.{" "}
              <Link href="/habilidades/nueva" className="font-medium text-ink underline">
                Crea la primera
              </Link>
              .
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-col py-9 pl-0 lg:pl-12">
          <span className="label-xs">Racha</span>
          <div className="my-2.5 flex items-baseline gap-3.5">
            <span className="font-num text-[72px] font-light leading-none tracking-tight sm:text-[88px]">{streak}</span>
            <span className="font-num text-[13px] text-muted">
              DÍAS · RÉCORD {bestStreak}
            </span>
          </div>
          <div className="mb-8 grid grid-cols-[repeat(21,1fr)] gap-1.5">
            {streakDots.map((d, i) => (
              <i
                key={i}
                aria-hidden="true"
                className="aspect-square rounded-full"
                style={{ background: d === "signal" ? "var(--signal)" : d === "ink" ? "var(--ink)" : "var(--line)" }}
              />
            ))}
          </div>
          <div className="mt-auto flex flex-col">
            <div className="flex items-baseline justify-between border-t border-line py-3">
              <span className="label-xs">Semana</span>
              <span className="font-num text-[15px]">{formatHM(weekMinutes)} H</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-line py-3">
              <span className="label-xs">Total</span>
              <span className="font-num text-[15px]">{formatInt(totalHours)} H</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-line py-3">
              <span className="label-xs">Nivel</span>
              <span className="font-num text-[15px]">
                {level} · {formatInt(xpIntoLevel)} XP
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t border-line py-3">
              <span className="label-xs">Recordatorio</span>
              <span className="font-num text-[15px]">{nextReminder ? nextReminder.timeOfDay : "—"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line py-8">
        <div className="mb-5 flex flex-wrap items-center gap-5">
          <span className="label-xs flex-1">Actividad · 52 semanas</span>
          <div role="group" aria-label="Filtrar" className="flex flex-wrap gap-5">
            <button
              type="button"
              aria-pressed={heatmapFilter === null}
              onClick={() => setHeatmapFilter(null)}
              className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.1em] transition-colors"
              style={{ color: heatmapFilter === null ? "var(--ink)" : "var(--muted)" }}
            >
              {heatmapFilter === null && <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: "var(--signal)" }} />}
              Todas
            </button>
            {skills.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={heatmapFilter === s.id}
                onClick={() => setHeatmapFilter(s.id)}
                className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.1em] transition-colors"
                style={{ color: heatmapFilter === s.id ? "var(--ink)" : "var(--muted)" }}
              >
                {heatmapFilter === s.id && <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: "var(--signal)" }} />}
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <ConsistencyHeatmap dailyMinutes={heatmapDaily} timezone={timezone} weeks={52} accentColor={heatmapColor} />
      </section>

      <section className="border-b border-line py-8">
        <div className="mb-6 flex items-center gap-4">
          <span className="label-xs flex-1">Horas hacia 10.000</span>
          <Link href="/habilidades/nueva" className="font-mono text-[12px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-ink">
            + Nueva habilidad
          </Link>
        </div>
        {!loading && skills.length === 0 ? (
          <Card className="p-7 text-center text-muted">
            Todavía no tienes habilidades.{" "}
            <Link href="/habilidades/nueva" className="font-medium text-ink underline">
              Crea la primera
            </Link>
            .
          </Card>
        ) : (
          <div className="flex flex-col">
            {skills.map((skill, i) => {
              const hours = skill.totalMinutes / 60;
              const skillDaily = buildSkillDailyMinutes(sessions, skill.id, timezone);
              const perSkillStreak = (() => {
                // current streak for this skill specifically (any practice day counts)
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
                <Link
                  key={skill.id}
                  href={`/habilidades/${skill.id}`}
                  className="grid grid-cols-[32px_1fr] items-center gap-5 border-t border-line py-5 first:border-t-0 sm:grid-cols-[32px_minmax(0,1fr)_minmax(0,320px)_90px]"
                >
                  <span className="font-num text-[13px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="truncate text-[28px] font-medium leading-tight tracking-tight sm:text-[30px]">{skill.name}</div>
                    <div className="font-num mt-1.5 text-[12px] text-muted">
                      {formatInt(hours)} / 10.000 H · RACHA {perSkillStreak} D
                    </div>
                  </div>
                  <div className="col-span-2 mt-3 sm:col-span-1 sm:mt-0">
                    <HourRuler currentHours={hours} showLabels minorHeight={16} majorHeight={28} />
                  </div>
                  <span
                    className="font-num text-right text-[14px]"
                    style={{ color: todayForSkill > 0 ? "var(--signal)" : "var(--muted)" }}
                  >
                    {todayForSkill > 0 ? `+${formatHM(todayForSkill)}` : "00:00"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 py-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="min-w-0 pr-0 lg:border-r lg:border-line lg:pr-12">
          <div className="label-xs mb-3.5">Sesiones de hoy</div>
          {todaySessions.length === 0 ? (
            <p className="py-3 text-sm text-muted">Todavía no has practicado hoy.</p>
          ) : (
            todaySessions.map((s) => {
              const skill = skills.find((sk) => sk.id === s.skillId);
              return (
                <div key={s.id} className="grid grid-cols-[70px_1fr_60px] items-center gap-4 border-t border-line/60 py-3">
                  <span className="font-num text-[13px] text-muted">{formatClock24(new Date(s.startedAt))}</span>
                  <span className="truncate text-[16px]">{skill?.name ?? (s.note || "Sesión libre")}</span>
                  <span className="font-num text-right text-[13px]">{formatHM(s.durationMin)}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="min-w-0 pl-0 pt-8 lg:pl-12 lg:pt-0">
          {activeChallenge ? (
            <>
              <div className="label-xs flex justify-between">
                <Link href={`/retos/${activeChallenge.challenge.id}`} className="text-muted transition-colors hover:text-ink">
                  Reto · {activeChallenge.challenge.name} →
                </Link>
                <span className="text-ink">
                  {Math.min(activeChallenge.currentDayNumber, activeChallenge.challenge.totalDays)} / {activeChallenge.challenge.totalDays}
                </span>
              </div>
              <div className="my-6 grid grid-cols-[repeat(10,1fr)] gap-2">
                {sampleDayDots(activeChallenge.states, 30).map((st, i) => (
                  <i
                    key={i}
                    aria-hidden="true"
                    className="aspect-square rounded-full"
                    style={{ background: DAY_STATE_STYLE[st].dot }}
                  />
                ))}
              </div>
              <p className="m-0 text-[15px] text-muted">
                {activeChallenge.challenge.why ? (
                  <>
                    Tu porqué: <span className="text-ink">{activeChallenge.challenge.why}</span>
                  </>
                ) : (
                  <>Sigue con tu reto de hoy.</>
                )}
              </p>
              <Link
                href={`/retos/${activeChallenge.challenge.id}/dia`}
                className="mt-5 inline-flex min-h-11 items-center rounded-button border border-border px-5 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors hover:border-border-hover hover:bg-card"
              >
                Añadir nota
              </Link>
            </>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <span className="label-xs">Retos</span>
              <p className="m-0 text-[15px] text-muted">
                Aprende algo nuevo en un número fijo de días, con diario y seguimiento.
              </p>
              <Link
                href="/retos/nuevo"
                className="mt-1 inline-flex min-h-11 items-center rounded-button border border-border px-5 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors hover:border-border-hover hover:bg-card"
              >
                + Nuevo reto
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
