"use client";

import Link from "next/link";
import { Check, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

// Logros as an actual modal overlay, per explicit user direction ("debe
// ser estilo modal no una pagina aparte") — replaces the earlier routed
// page (app/(app)/logros/page.tsx, now removed). Content/logic unchanged
// (same milestone grid, same CelebrationDialog on "Ver"); only the shell
// changes, from a full-bleed page to a centered Dialog. Same --mode-bg
// redeclaration on DialogContent as AjustesModal, for the same Radix-
// portal reason — see that file's own comment.
const MILESTONE_TITLES: Record<number, string> = {
  1: "Primer paso",
  10: "Calentamiento",
  100: "Constancia",
  500: "Medio millar",
  1000: "Mil horas",
  5000: "Mitad del camino",
  10000: "Maestría",
};

export function LogrosModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
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

  const color = activeSkill ? resolveSkillColor(activeSkill.color) : "var(--mode-bg)";
  const hours = activeSkill ? activeSkill.totalMinutes / 60 : 0;
  const doneList = items.filter((i) => i.done);
  const next = items.find((i) => i.isNext);
  const celebrateItem = items.find((i) => i.hours === celebrateHours);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        aria-describedby={undefined}
        className="max-h-[88vh] w-[calc(100%-32px)] max-w-[760px] overflow-y-auto border-0 bg-transparent p-0"
        style={{ "--mode-bg": "var(--mode-focus)" } as React.CSSProperties}
      >
        <div className="flex flex-col gap-6 rounded-card p-6 sm:p-8" style={{ background: "var(--mode-bg)" }}>
          {!activeSkill ? (
            <>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Cerrar"
                className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-chip border border-card-tint-border bg-card-tint text-mode-ink transition-colors hover:bg-white/30"
              >
                <X size={18} aria-hidden="true" />
              </button>
              <DialogTitle className="sr-only">Logros</DialogTitle>
              <Card tone="solid" className="p-10 text-center text-card-solid-muted">
                Crea una habilidad para empezar a desbloquear logros.
              </Card>
            </>
          ) : (
            <>
              <header className="flex flex-wrap items-start justify-between gap-6">
                <div className="flex flex-col gap-3">
                  <span className="label-xs" style={{ color: "var(--mode-ink-muted)" }}>
                    Logros · {activeSkill.name}
                  </span>
                  <DialogTitle className="m-0 text-[40px] font-light leading-[0.95] tracking-tight text-mode-ink sm:text-[48px]">
                    {doneList.length} de {items.length}
                  </DialogTitle>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Cerrar"
                  className="flex size-9 shrink-0 items-center justify-center rounded-chip border border-card-tint-border bg-card-tint text-mode-ink transition-colors hover:bg-white/30"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </header>

              {skills.length > 1 && (
                <div role="group" aria-label="Habilidad" className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <Chip key={s.id} pressed={activeSkill.id === s.id} dotColor={resolveSkillColor(s.color)} onClick={() => setSkillId(s.id)}>
                      {s.name}
                    </Chip>
                  ))}
                </div>
              )}

              <Card tone="solid" className="grid grid-cols-1 items-center gap-6 p-6 sm:grid-cols-[140px_1fr_auto] sm:p-7">
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
                  <span className="text-[28px] font-light leading-tight tracking-tight">{next ? next.title : "Maestría"}</span>
                  {next && (
                    <ProgressBar
                      pct={next.pct}
                      color={color}
                      trackColor="var(--card-solid-line)"
                      height={6}
                      className="max-w-[360px]"
                      ariaLabel={`${activeSkill.name}: ${formatInt(hours)} de ${formatInt(next.hours)} horas`}
                    />
                  )}
                </div>
                <div className="text-left sm:text-right">
                  <div className="font-num text-[36px] leading-none tracking-tight">
                    {next ? `${formatInt(hours)} / ${formatInt(next.hours)}` : formatInt(hours)}
                    <span className="ml-1 text-base text-card-solid-muted">h</span>
                  </div>
                  <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-card-solid-muted">
                    {next ? `Faltan ${formatInt(next.hours - hours)} h` : "Completado"}
                  </span>
                </div>
              </Card>

              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {items.map((m) => (
                  <Card
                    key={m.hours}
                    tone="solid"
                    className="flex flex-col gap-3 p-5"
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

              <section className="flex flex-wrap items-center justify-between gap-4">
                <p className="m-0 max-w-[420px] text-sm text-mode-ink-muted">
                  La celebración aparece al cruzar un hito, justo al terminar la sesión o al registrar horas manualmente.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <Button asChild variant="onColor" size="sm" onClick={() => onOpenChange(false)}>
                    <Link href="/registrar">Registrar horas</Link>
                  </Button>
                  <Button asChild variant="dark" size="sm" onClick={() => onOpenChange(false)}>
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
