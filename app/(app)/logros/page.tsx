"use client";

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { HourRuler } from "@/components/ui/HourRuler";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CelebrationDialog } from "@/components/achievements/CelebrationDialog";
import { useAppData } from "@/lib/hooks/useAppData";
import { watchAchievementsForUser } from "@/lib/firestore/achievements";
import { resolveSkillColor } from "@/lib/skill-color";
import { formatDateEs, formatInt, formatPercent } from "@/lib/format";
import { MILESTONES } from "@/lib/milestones";
import { projectTimeRemaining, formatProjection, hoursPerWeek } from "@/lib/projection";
import type { Achievement } from "@/lib/types";

// Rebuilt against design-reference/pomodoro/html/PomoLogros.dc.html: a
// full-bleed `--mode-bg` backdrop (default focus-red — not a live-timer
// screen, so no override needed, same as Ajustes) behind a hero `wc`-style
// stat card and a 2-column grid of `wc` tile cards for each milestone,
// replacing the old bare bordered-flex layout the "Punto" redesign used.
//
// The reference's hero card is a gamified level/XP bar + "Canjear XP"
// button — there is no level/XP/currency system anywhere in this app's
// data model (lib/types.ts has no such field, no lib/firestore/ module for
// it), so, matching the precedent already set below for the reference's
// extra badge types (streaks, early-bird, session-length, level-ups),
// that's not fabricated — the hero card keeps this app's REAL equivalent
// (the per-skill hour ruler + next-milestone progress) in the same visual
// slot/treatment instead. Real data model (per-skill hour thresholds in
// lib/milestones.ts, crossed achievements in lib/firestore/achievements.ts)
// is unchanged.

const MILESTONE_TITLES: Record<number, string> = {
  1: "Primer paso",
  10: "Calentamiento",
  100: "Constancia",
  500: "Medio millar",
  1000: "Mil horas",
  5000: "Mitad del camino",
  10000: "Maestría",
};

export default function LogrosPage() {
  const { user, skills } = useAppData();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [skillId, setSkillId] = useState<string | null>(null);
  const [celebrateHours, setCelebrateHours] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    return watchAchievementsForUser(user.uid, setAchievements);
  }, [user]);

  const activeSkill = skills.find((s) => s.id === skillId) ?? skills[0];

  const items = useMemo(() => {
    if (!activeSkill) return [];
    const hours = activeSkill.totalMinutes / 60;
    const weekly = hoursPerWeek(activeSkill.dailyGoalMin, activeSkill.daysPerWeek);
    let foundNext = false;
    return MILESTONES.filter((m) => m <= activeSkill.goalHours).map((m) => {
      const done = hours >= m;
      const isNext = !done && !foundNext;
      if (isNext) foundNext = true;
      const achievement = achievements.find((a) => a.skillId === activeSkill.id && a.hours === m);
      const left = Math.max(0, m - hours);
      return {
        hours: m,
        title: MILESTONE_TITLES[m],
        done,
        isNext,
        achievement,
        pct: Math.min(100, (hours / m) * 100),
        detail: done
          ? achievement
            ? formatDateEs(new Date(achievement.achievedAt))
            : "Logrado"
          : isNext
            ? `Faltan ${formatInt(left)} h · ${formatProjection(projectTimeRemaining(left, weekly))}`
            : `Faltan ${formatInt(left)} h`,
      };
    });
  }, [activeSkill, achievements]);

  // Same full-bleed treatment as Ajustes — breaks out of AppShell's `main`
  // padding (px-5 py-9 sm:px-10) with matching negative margins so this
  // backdrop reaches TopNav's own edges; not a live-timer screen, so it
  // just reads the default focus-red `--mode-bg`, no override needed.
  if (!activeSkill) {
    return (
      <div
        className="-mx-5 -my-9 flex items-center justify-center px-5 py-10 sm:-mx-10 sm:px-10"
        style={{ background: "var(--mode-bg)", minHeight: "calc(100vh - 60px)" }}
      >
        <Card tone="solid" className="max-w-[480px] p-10 text-center text-card-solid-muted">
          Crea una habilidad para empezar a desbloquear logros.
        </Card>
      </div>
    );
  }

  const color = resolveSkillColor(activeSkill.color);
  const hours = activeSkill.totalMinutes / 60;
  const doneList = items.filter((i) => i.done);
  const next = items.find((i) => i.isNext);

  const celebrateItem = items.find((i) => i.hours === celebrateHours);

  return (
    <div
      className="-mx-5 -my-9 flex flex-col gap-7 px-5 py-9 sm:-mx-10 sm:px-10"
      style={{ background: "var(--mode-bg)", minHeight: "calc(100vh - 60px)" }}
    >
      <header className="mx-auto flex w-full max-w-[1100px] flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <span className="label-xs" style={{ color: "var(--mode-ink-muted)" }}>
            Logros · {activeSkill.name}
          </span>
          <h1 className="m-0 text-[52px] font-light leading-[0.95] tracking-tight text-mode-ink sm:text-[64px]">
            {doneList.length} de {items.length}
          </h1>
        </div>
        <div role="group" aria-label="Habilidad" className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <Chip
              key={s.id}
              pressed={activeSkill.id === s.id}
              dotColor={resolveSkillColor(s.color)}
              onClick={() => setSkillId(s.id)}
            >
              {s.name}
            </Chip>
          ))}
        </div>
      </header>

      <Card tone="solid" className="mx-auto grid w-full max-w-[1100px] grid-cols-1 items-center gap-8 p-7 sm:grid-cols-[180px_1fr_auto] sm:p-9">
        <HourRuler
          currentHours={hours}
          goalHours={activeSkill.goalHours}
          onColor={color}
          offColor="var(--card-solid-line)"
          showLabels={false}
          minorHeight={14}
          majorHeight={24}
          ariaLabel={`${formatInt(hours)} de ${formatInt(activeSkill.goalHours)} horas en ${activeSkill.name}`}
        />
        <div className="flex flex-col gap-3">
          <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-card-solid-muted">Siguiente hito</span>
          <span className="text-[34px] font-light leading-tight tracking-tight">
            {next ? next.title : "Maestría"}
          </span>
          {next && (
            <ProgressBar
              pct={next.pct}
              color={color}
              trackColor="var(--card-solid-line)"
              height={6}
              className="max-w-[420px]"
              ariaLabel={`${activeSkill.name}: ${formatInt(hours)} de ${formatInt(next.hours)} horas`}
            />
          )}
        </div>
        <div className="text-left sm:text-right">
          <div className="font-num text-[44px] leading-none tracking-tight">
            {next ? `${formatInt(hours)} / ${formatInt(next.hours)}` : formatInt(hours)}
            <span className="ml-1 text-base text-card-solid-muted">h</span>
          </div>
          <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-card-solid-muted">
            {next ? `Faltan ${formatInt(next.hours - hours)} h` : "Completado"}
          </span>
        </div>
      </Card>

      <section className="mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((m) => (
          <Card
            key={m.hours}
            tone="solid"
            className="flex flex-col gap-3 p-6"
            style={{ opacity: m.done || m.isNext ? 1 : 0.7 }}
          >
            <div className="flex items-center gap-3.5">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-button border"
                style={{
                  borderColor: m.done ? color : "var(--card-solid-line)",
                  background: m.done ? color : "var(--surface-muted)",
                }}
              >
                {m.done ? (
                  <Check size={18} aria-hidden="true" style={{ color: "var(--ink-solid)" }} />
                ) : (
                  <span className="font-num text-[11px] text-surface-muted-ink">{formatInt(m.hours)}</span>
                )}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[16px] font-semibold">{m.title}</span>
                <span className="font-num text-sm" style={{ color: m.done ? color : "var(--card-solid-muted)" }}>
                  {formatInt(m.hours)} h
                </span>
              </div>
            </div>
            <span className="min-h-10 text-sm text-card-solid-muted">{m.detail}</span>
            <div className="mt-auto flex items-center gap-2.5">
              {m.isNext ? (
                <>
                  <ProgressBar
                    pct={m.pct}
                    color={color}
                    trackColor="var(--card-solid-line)"
                    height={4}
                    className="flex-1"
                    ariaLabel={`Progreso hacia ${m.title}`}
                  />
                  <span className="font-num text-[11px]" style={{ color }}>
                    {formatPercent(m.pct)}
                  </span>
                </>
              ) : (
                <span className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: m.done ? color : "var(--card-solid-muted)" }}>
                  {m.done ? "Logrado" : "Pendiente"}
                </span>
              )}
              {m.done && (
                <Button variant="ghost" size="sm" className="ml-auto gap-1.5 px-2" onClick={() => setCelebrateHours(m.hours)}>
                  <Sparkles size={14} aria-hidden="true" />
                  Ver
                </Button>
              )}
            </div>
          </Card>
        ))}
      </section>

      <section className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center justify-between gap-4 pb-2">
        <p className="m-0 max-w-[480px] text-sm text-mode-ink-muted">
          La celebración aparece al cruzar un hito, justo al terminar la sesión o al registrar horas manualmente.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild variant="onColor" size="sm">
            <Link href="/registrar">Registrar horas</Link>
          </Button>
          <Button asChild variant="dark" size="sm">
            <Link href="/temporizador">Practicar ahora</Link>
          </Button>
        </div>
      </section>

      <CelebrationDialog
        open={celebrateHours != null}
        onClose={() => setCelebrateHours(null)}
        skillName={activeSkill.name}
        skillColor={color}
        hours={celebrateHours ?? 1}
        achievedAt={celebrateItem?.achievement?.achievedAt ?? null}
        startedAt={activeSkill.createdAt}
      />
    </div>
  );
}
