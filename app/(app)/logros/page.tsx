"use client";

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CelebrationDialog } from "@/components/achievements/CelebrationDialog";
import { useAppData } from "@/lib/hooks/useAppData";
import { watchAchievementsForUser } from "@/lib/firestore/achievements";
import { resolveSkillColor } from "@/lib/skill-color";
import { formatDateEs, formatInt, formatPercent } from "@/lib/format";
import { MILESTONES } from "@/lib/milestones";
import { projectTimeRemaining, formatProjection, hoursPerWeek } from "@/lib/projection";
import type { Achievement } from "@/lib/types";

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
    return <Card className="p-8 text-center text-muted">Crea una habilidad para empezar a desbloquear logros.</Card>;
  }

  const color = resolveSkillColor(activeSkill.color);
  const hours = activeSkill.totalMinutes / 60;
  const doneList = items.filter((i) => i.done);
  const last = doneList[doneList.length - 1];
  const next = items.find((i) => i.isNext);
  const weekly = hoursPerWeek(activeSkill.dailyGoalMin, activeSkill.daysPerWeek);

  const celebrateItem = items.find((i) => i.hours === celebrateHours);

  return (
    <>
      <header className="flex flex-col gap-1">
        <span className="label-xs">Logros e hitos</span>
        <h1 className="m-0 text-4xl font-bold leading-tight tracking-tight">Cada hora deja huella.</h1>
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

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="h-line" className="min-w-0 flex-[3_1_480px] bx px-7 pb-3 pt-7">
          <h2 id="h-line" className="m-0 mb-6 text-xl font-bold">
            Línea de tiempo · {activeSkill.name}
          </h2>
          <ol className="m-0 list-none p-0">
            {items.map((m, i) => (
              <li key={m.hours} className="flex gap-5">
                <div className="flex flex-[0_0_40px] flex-col items-center">
                  <span
                    className="box-border flex size-10 items-center justify-center rounded-full border-2"
                    style={{
                      borderColor: m.done ? color : m.isNext ? "var(--ink)" : "var(--ink)",
                      background: m.done ? color : "var(--card)",
                      color: "var(--ink)",
                    }}
                  >
                    {m.done && <Check size={20} aria-hidden="true" />}
                    {m.isNext && <span className="size-3 rounded-full" style={{ background: "var(--ink)" }} />}
                  </span>
                  {i < items.length - 1 && (
                    <span className="min-h-6 w-0.5 flex-1" style={{ background: m.done ? color : "var(--ink)" }} />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2 pb-7">
                  <div className="flex flex-wrap items-baseline gap-1.5 gap-x-3.5">
                    <span className="font-num text-[26px] font-medium" style={{ color: m.done ? color : m.isNext ? "var(--ink)" : "var(--muted)" }}>
                      {formatInt(m.hours)} h
                    </span>
                    <span className="text-[17px] font-bold" style={{ color: m.done || m.isNext ? "var(--ink)" : "var(--muted)" }}>
                      {m.title}
                    </span>
                    <span
                      className="label-xs rounded-chip border-[3px] px-2.5 py-0.5"
                      style={{ borderColor: m.done ? color : m.isNext ? "var(--ink)" : "var(--ink)", color: m.done ? color : m.isNext ? "var(--ink)" : "var(--muted)" }}
                    >
                      {m.done ? "Logrado" : m.isNext ? "Siguiente" : "Pendiente"}
                    </span>
                  </div>
                  <span className="text-sm text-muted">{m.detail}</span>
                  {m.isNext && (
                    <div className="flex max-w-[480px] flex-col gap-2">
                      <ProgressBar pct={m.pct} color={color} ariaLabel={`${activeSkill.name}: ${formatInt(hours)} de ${formatInt(m.hours)} horas`} />
                      <span className="font-num text-[13px] text-muted">
                        {formatInt(hours)} / {formatInt(m.hours)} h · {formatPercent(m.pct)}
                      </span>
                    </div>
                  )}
                  {m.done && (
                    <button
                      type="button"
                      onClick={() => setCelebrateHours(m.hours)}
                      className="inline-flex min-h-11 items-center gap-2 self-start rounded-button border-[3px] border-ink px-4 text-sm font-semibold"
                    >
                      <Sparkles size={16} aria-hidden="true" />
                      Ver celebración
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <aside aria-label="Resumen" className="flex min-w-0 flex-[2_1_320px] flex-col gap-4">
          <Card className="flex flex-col gap-3.5 p-5.5">
            <span className="label-xs">Hitos desbloqueados</span>
            <div className="flex items-baseline gap-2">
              <span className="font-num text-[48px] font-medium leading-none" style={{ color }}>
                {doneList.length}
              </span>
              <span className="font-num text-lg text-muted">de {items.length}</span>
            </div>
            {last && (
              <div className="flex flex-col gap-2.5 border-t border-ink pt-3.5">
                <span className="text-sm text-muted">
                  Último: <span className="font-semibold text-ink">{formatInt(last.hours)} h · {last.title}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setCelebrateHours(last.hours)}
                  className="inline-flex min-h-11 items-center self-start rounded-button px-4 text-sm font-bold"
                  style={{ background: color, color: "var(--ink)" }}
                >
                  Ver última celebración
                </button>
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-3.5 p-5.5">
            <span className="label-xs">Siguiente hito</span>
            <div className="flex flex-wrap items-baseline gap-2.5">
              <span className="font-num text-[34px] font-medium">{next ? `${formatInt(next.hours)} h` : "10.000 h"}</span>
              <span className="font-semibold">{next ? next.title : "Maestría"}</span>
            </div>
            <span className="text-sm text-muted">
              {next ? `Faltan ${formatInt(next.hours - hours)} h · ${formatProjection(projectTimeRemaining(next.hours - hours, weekly))}` : ""}
            </span>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/temporizador" className="inline-flex min-h-11 items-center rounded-button px-4.5 text-sm font-bold" style={{ background: color, color: "var(--ink)" }}>
                Practicar ahora
              </Link>
              <Link href="/registrar" className="inline-flex min-h-11 items-center rounded-button border-[3px] border-ink px-4.5 text-sm font-semibold">
                Registrar horas
              </Link>
            </div>
          </Card>

          <p className="m-0 px-1 text-[13px] text-muted">
            La celebración aparece al cruzar un hito, justo al terminar la sesión o al registrar horas manualmente.
          </p>
        </aside>
      </div>

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
