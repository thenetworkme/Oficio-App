"use client";

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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

// Rebuilt against design-reference/punto/html/PuntoLogros.dc.html: a label
// + big "N de M" count, a per-skill filter chip row, a hero stat row
// (ruler / next milestone / remaining), and a flat tile grid of every
// milestone — replacing the old connected-line timeline + sidebar layout.
// Real data model (per-skill hour thresholds in lib/milestones.ts, crossed
// achievements in lib/firestore/achievements.ts) is unchanged; the
// reference's extra badge types (streaks, early-bird, session-length,
// level-ups) don't exist in this app's data and are not fabricated here.

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

  if (!activeSkill) {
    return (
      <div className="rounded-card border border-line p-10 text-center text-muted">
        Crea una habilidad para empezar a desbloquear logros.
      </div>
    );
  }

  const color = resolveSkillColor(activeSkill.color);
  const hours = activeSkill.totalMinutes / 60;
  const doneList = items.filter((i) => i.done);
  const next = items.find((i) => i.isNext);

  const celebrateItem = items.find((i) => i.hours === celebrateHours);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <span className="label-xs">Logros · {activeSkill.name}</span>
          <h1 className="m-0 text-[52px] font-light leading-[0.95] tracking-tight sm:text-[64px]">
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

      <section className="grid grid-cols-1 items-center gap-8 border-y border-line py-8 sm:grid-cols-[180px_1fr_auto]">
        <HourRuler
          currentHours={hours}
          goalHours={activeSkill.goalHours}
          onColor={color}
          showLabels={false}
          minorHeight={14}
          majorHeight={24}
          ariaLabel={`${formatInt(hours)} de ${formatInt(activeSkill.goalHours)} horas en ${activeSkill.name}`}
        />
        <div className="flex flex-col gap-3">
          <span className="label-xs">Siguiente hito</span>
          <span className="text-[34px] font-light leading-tight tracking-tight">
            {next ? next.title : "Maestría"}
          </span>
          {next && (
            <ProgressBar
              pct={next.pct}
              color={color}
              height={6}
              className="max-w-[420px]"
              ariaLabel={`${activeSkill.name}: ${formatInt(hours)} de ${formatInt(next.hours)} horas`}
            />
          )}
        </div>
        <div className="text-left sm:text-right">
          <div className="font-num text-[44px] leading-none tracking-tight">
            {next ? `${formatInt(hours)} / ${formatInt(next.hours)}` : formatInt(hours)}
            <span className="ml-1 text-base text-muted">h</span>
          </div>
          <span className="label-xs">{next ? `Faltan ${formatInt(next.hours - hours)} h` : "Completado"}</span>
        </div>
      </section>

      <section className="grid grid-cols-1 border-b border-line sm:grid-cols-2 lg:grid-cols-4">
        {items.map((m) => (
          <div
            key={m.hours}
            className="flex flex-col gap-3 border-t border-line p-6 sm:border-l lg:[&:nth-child(4n+1)]:border-l-0"
            style={{ opacity: m.done || m.isNext ? 1 : 0.6 }}
          >
            <span
              className="flex size-10 items-center justify-center rounded-full border"
              style={{
                borderColor: m.done ? color : "var(--border)",
                background: m.done ? color : "transparent",
              }}
            >
              {m.done ? (
                <Check size={18} aria-hidden="true" style={{ color: "var(--ink-solid)" }} />
              ) : (
                <span className="font-num text-[11px] text-muted">{formatInt(m.hours)}</span>
              )}
            </span>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-num text-[22px] font-medium" style={{ color: m.done ? color : "var(--ink)" }}>
                {formatInt(m.hours)} h
              </span>
              <span className="text-[16px] font-medium">{m.title}</span>
            </div>
            <span className="min-h-10 text-sm text-muted">{m.detail}</span>
            <div className="mt-auto flex items-center gap-2.5">
              {m.isNext ? (
                <>
                  <ProgressBar pct={m.pct} color={color} height={4} className="flex-1" ariaLabel={`Progreso hacia ${m.title}`} />
                  <span className="font-num text-[11px]" style={{ color }}>
                    {formatPercent(m.pct)}
                  </span>
                </>
              ) : (
                <span className="label-xs" style={{ color: m.done ? color : "var(--muted)" }}>
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
          </div>
        ))}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <p className="m-0 max-w-[480px] text-sm text-muted">
          La celebración aparece al cruzar un hito, justo al terminar la sesión o al registrar horas manualmente.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild variant="outline" size="sm">
            <Link href="/registrar">Registrar horas</Link>
          </Button>
          <Button asChild size="sm">
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
    </>
  );
}
