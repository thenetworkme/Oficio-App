"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ModeBackdrop } from "@/components/layout/ModeBackdrop";
import { useChallenges } from "@/lib/hooks/useChallenges";
import { useAppData } from "@/lib/hooks/useAppData";
import { formatMinutesLong, formatShortDateEs } from "@/lib/format";
import { sampleDayDots } from "@/lib/challenge-ui";
import type { ChallengeDayState } from "@/lib/challenge";
import { MAX_ACTIVE_CHALLENGES, type ChallengeStatus } from "@/lib/types";

const TABS: { key: ChallengeStatus; label: string }[] = [
  { key: "active", label: "Activos" },
  { key: "paused", label: "Pausados" },
  { key: "completed", label: "Completados" },
];

const STARTER_TEMPLATES = [
  { n: "7", u: "días", t: "Práctica diaria sin faltar" },
  { n: "21", u: "días", t: "Un hábito nuevo desde cero" },
  { n: "100", u: "horas", t: "En 30 días, a tu ritmo" },
];

/** Day-square fill for the Pomodoro day-grid, matching
 * design-reference/pomodoro/html/PomoRetos.dc.html's `.cells` treatment:
 * done = solid --mode-bg, today = white/card surface with a --mode-bg ring,
 * everything else a flat muted square (missed gets a thin danger ring so
 * that real distinction — a day of grace used vs. actually missed — isn't
 * lost in the restyle). Intentionally NOT reusing challenge-ui.ts's
 * DAY_STATE_STYLE, which is the "Punto" --ink/--signal treatment — out of
 * scope to edit that file, and its colors don't apply to the new mode-color
 * system anyway. */
function squareStyle(state: ChallengeDayState): React.CSSProperties {
  switch (state) {
    case "done":
      return { background: "var(--mode-bg)" };
    case "today":
      return { background: "var(--card-solid)", boxShadow: "inset 0 0 0 2.5px var(--mode-bg)" };
    case "missed":
      return { background: "var(--surface-muted)", boxShadow: "inset 0 0 0 1.5px var(--danger)" };
    default:
      return { background: "var(--surface-muted)" };
  }
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 4l13 8-13 8z" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

export default function RetosListPage() {
  const { stats, loading } = useChallenges();
  const { skills } = useAppData();
  const [tab, setTab] = useState<ChallengeStatus>("active");

  const skillName = (skillId: string) => skills.find((s) => s.id === skillId)?.name ?? "Habilidad";

  const counts: Record<ChallengeStatus, number> = {
    active: stats.filter((s) => s.challenge.status === "active").length,
    paused: stats.filter((s) => s.challenge.status === "paused").length,
    completed: stats.filter((s) => s.challenge.status === "completed").length,
    abandoned: 0,
  };
  const activeCount = counts.active;
  const leftToStart = Math.max(0, MAX_ACTIVE_CHALLENGES - activeCount);
  const visible = useMemo(() => stats.filter((s) => s.challenge.status === tab), [stats, tab]);

  return (
    <>
      <ModeBackdrop />
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-5 text-mode-ink">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="m-0 text-[30px] font-bold leading-[1.15] tracking-tight">Retos</h1>
            <p className="m-0 mt-1 text-[15px]" style={{ color: "var(--mode-ink-muted)" }}>
              Pequeñas rachas con final: cierra uno y celébralo.
            </p>
          </div>
          <Button asChild variant="go" size="md">
            <Link href="/retos/nuevo">
              <PlusIcon /> Crear reto
            </Link>
          </Button>
        </div>

        <div role="tablist" aria-label="Estado" className="flex flex-wrap gap-1">
          {TABS.map((t) => {
            const selected = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(t.key)}
                className="min-h-9 rounded-[4px] border-0 bg-transparent px-3.5 text-[15px] transition-colors"
                style={{
                  background: selected ? "rgb(0 0 0 / 15%)" : "transparent",
                  fontWeight: selected ? 600 : 400,
                  color: "var(--mode-ink)",
                  opacity: selected ? 1 : 0.88,
                }}
              >
                {t.label} · {counts[t.key]}
              </button>
            );
          })}
        </div>

        {loading && (
          <p className="text-[15px]" style={{ color: "var(--mode-ink-muted)" }}>
            Cargando retos…
          </p>
        )}

        {!loading && visible.length === 0 && (
          <Card tone="tint" className="p-6 text-[15px]">
            {tab === "active"
              ? "No tienes retos activos. Crea uno para empezar."
              : tab === "paused"
                ? "No tienes retos pausados."
                : "Todavía no has completado ningún reto."}
          </Card>
        )}

        {tab !== "completed" &&
          visible.map((stat, i) => {
            const { challenge } = stat;
            const isDoneToday = stat.states[stat.currentDayNumber - 1] === "done";
            const detailHref = `/retos/${challenge.id}`;
            const diaHref = `/retos/${challenge.id}/dia`;

            if (tab === "active" && i === 0) {
              const cells = sampleDayDots(stat.states, 30);
              const cols = Math.min(15, cells.length);
              return (
                <Card key={challenge.id} tone="solid" className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--card-solid-muted)" }}>
                        {skillName(challenge.skillId)}
                      </div>
                      <div className="mt-0.5 truncate text-[22px] font-extrabold tracking-tight">{challenge.name}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-num text-[28px] font-extrabold leading-none" style={{ color: "var(--mode-bg)" }}>
                        {Math.min(stat.currentDayNumber, challenge.totalDays)}
                        <span className="text-[14px] font-normal" style={{ color: "var(--card-solid-muted)" }}>
                          {" "}
                          / {challenge.totalDays}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[12px]" style={{ color: "var(--card-solid-muted)" }}>
                        días
                      </div>
                    </div>
                  </div>

                  <div
                    className="my-5 grid gap-1.5"
                    style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
                    role="img"
                    aria-label={`Día ${stat.currentDayNumber} de ${challenge.totalDays}`}
                  >
                    {cells.map((s, idx) => (
                      <span key={idx} className="aspect-square rounded-[4px]" style={squareStyle(s)} />
                    ))}
                  </div>

                  <p className="m-0 mb-4 text-[15px]" style={{ color: "var(--card-solid-muted)" }}>
                    {isDoneToday ? (
                      "Hoy ya cumpliste tu meta."
                    ) : (
                      <>
                        Meta de hoy: <b style={{ color: "var(--card-solid-ink)" }}>{challenge.dailyGoalMin} min</b>.
                      </>
                    )}
                  </p>

                  <div className="flex gap-2.5">
                    <Button asChild variant="dark" size="md" className="flex-1">
                      <Link href={diaHref}>
                        {isDoneToday ? null : <PlayIcon />}
                        {isDoneToday ? "Ver diario" : "Practicar"}
                      </Link>
                    </Button>
                    <Button asChild variant="light" size="md">
                      <Link href={detailHref}>Ver reto</Link>
                    </Button>
                  </div>
                </Card>
              );
            }

            const pct = (Math.min(stat.currentDayNumber, challenge.totalDays) / challenge.totalDays) * 100;
            return (
              <Link key={challenge.id} href={detailHref} className="block">
                <Card tone="solid" className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--card-solid-muted)" }}>
                        {skillName(challenge.skillId)}
                      </div>
                      <div className="truncate text-[18px] font-extrabold" style={{ color: "var(--card-solid-ink)" }}>
                        {challenge.name}
                      </div>
                    </div>
                    <div className="shrink-0 font-num text-[20px] font-extrabold" style={{ color: "var(--mode-bg)" }}>
                      {Math.min(stat.currentDayNumber, challenge.totalDays)}
                      <span className="text-[13px] font-normal" style={{ color: "var(--card-solid-muted)" }}>
                        {" "}
                        / {challenge.totalDays}
                      </span>
                    </div>
                  </div>
                  <ProgressBar pct={pct} color="var(--mode-bg)" trackColor="var(--card-solid-line)" ariaLabel={`Progreso de ${challenge.name}`} className="mt-3.5" />
                </Card>
              </Link>
            );
          })}

        {tab === "completed" &&
          visible.map((stat) => {
            const { challenge } = stat;
            return (
              <Link key={challenge.id} href={`/retos/${challenge.id}/cierre`} className="block">
                <Card tone="solid" className="flex items-center gap-4 p-5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full text-white" style={{ background: "var(--mode-bg)" }}>
                    <CheckIcon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[17px] font-extrabold" style={{ color: "var(--card-solid-ink)" }}>
                      {challenge.name}
                    </div>
                    <div className="text-[13px]" style={{ color: "var(--card-solid-muted)" }}>
                      Cerrado el {challenge.completedAt ? formatShortDateEs(new Date(challenge.completedAt)) : "—"} ·{" "}
                      {Math.min(stat.currentDayNumber, challenge.totalDays)} de {challenge.totalDays} días
                    </div>
                  </div>
                  <span className="font-num shrink-0 text-[15px] font-extrabold" style={{ color: "var(--mode-bg)" }}>
                    {formatMinutesLong(stat.investedMin)}
                  </span>
                </Card>
              </Link>
            );
          })}

        {tab === "active" && (
          <div>
            <div className="mb-2.5 mt-2 text-[14px] font-bold" style={{ opacity: 0.85 }}>
              Para empezar
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {STARTER_TEMPLATES.map((tpl) => (
                <Link key={tpl.t} href="/retos/nuevo" className="block">
                  <Card tone="tint" className="p-4 transition-colors hover:bg-white/15">
                    <div className="font-num text-[26px] font-extrabold leading-none">{tpl.n}</div>
                    <div className="mt-0.5 text-[13px]" style={{ opacity: 0.85 }}>
                      {tpl.u}
                    </div>
                    <div className="mt-2.5 text-[14px] font-semibold leading-snug">{tpl.t}</div>
                  </Card>
                </Link>
              ))}
            </div>
            <p className="font-num mt-4 text-[13px]" style={{ color: "var(--mode-ink-muted)" }}>
              {leftToStart > 0
                ? `Puedes tener hasta ${MAX_ACTIVE_CHALLENGES} retos activos a la vez. Te queda${leftToStart === 1 ? "" : "n"} ${leftToStart}.`
                : `Ya tienes ${MAX_ACTIVE_CHALLENGES} retos activos. Cierra o pausa uno para abrir otro.`}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
