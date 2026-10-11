"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useChallenges } from "@/lib/hooks/useChallenges";
import { useAppData } from "@/lib/hooks/useAppData";
import { formatMinutesLong } from "@/lib/format";
import { DAY_STATE_COLOR, sampleDayDots } from "@/lib/challenge-ui";
import { MAX_ACTIVE_CHALLENGES, type ChallengeStatus } from "@/lib/types";

const TABS: { key: ChallengeStatus; label: string }[] = [
  { key: "active", label: "Activos" },
  { key: "completed", label: "Completados" },
  { key: "paused", label: "Pausados" },
];

export default function RetosListPage() {
  const { stats, loading } = useChallenges();
  const { skills } = useAppData();
  const [tab, setTab] = useState<ChallengeStatus>("active");

  const skillName = (skillId: string) => skills.find((s) => s.id === skillId)?.name ?? "Habilidad";

  const activeCount = stats.filter((s) => s.challenge.status === "active").length;
  const completedStats = stats.filter((s) => s.challenge.status === "completed");
  const bestStreak = Math.max(0, ...stats.map((s) => s.streak.best));
  const activeStreak = Math.max(0, ...stats.filter((s) => s.challenge.status === "active").map((s) => s.streak.current));
  const totalDaysPracticed = completedStats.reduce(
    (acc, s) => acc + s.days.filter((d) => d.durationMin > 0).length,
    0,
  );

  const counts: Record<ChallengeStatus, number> = {
    active: activeCount,
    completed: completedStats.length,
    paused: stats.filter((s) => s.challenge.status === "paused").length,
    abandoned: 0,
  };

  const visible = useMemo(() => stats.filter((s) => s.challenge.status === tab), [stats, tab]);
  const leftToStart = Math.max(0, MAX_ACTIVE_CHALLENGES - activeCount);

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-7">
        <div>
          <span className="label-xs">Aprende algo en X días</span>
          <h1 className="m-0 mt-2 text-[56px] font-bold leading-[0.95] tracking-tight sm:text-[72px]">Retos.</h1>
        </div>
        <Button asChild size="default" style={{ transform: "rotate(-1.5deg)" }}>
          <Link href="/retos/nuevo">+ Nuevo reto</Link>
        </Button>
      </section>

      <section className="flex flex-wrap gap-5">
        <div className="bx flex-1 basis-[260px] p-5 text-ink-solid" style={{ background: "var(--a1)", transform: "rotate(-1deg)" }}>
          <span className="label-xs !text-ink-solid opacity-70">Retos activos</span>
          <div className="font-num mt-1 text-[40px] font-bold leading-none">
            {activeCount} / {MAX_ACTIVE_CHALLENGES}
          </div>
          <span className="mt-1 block text-[13px]">
            {leftToStart > 0 ? `Puedes abrir ${leftToStart === 1 ? "uno más" : `${leftToStart} más`}` : "Ya tienes el máximo abierto"}
          </span>
        </div>
        <div className="bx flex-1 basis-[260px] p-5 text-ink-solid" style={{ background: "var(--a2)", transform: "rotate(1deg)" }}>
          <span className="label-xs !text-ink-solid opacity-70">Racha de retos</span>
          <div className="font-num mt-1 text-[40px] font-bold leading-none">{activeStreak} días</div>
          <span className="mt-1 block text-[13px]">Récord: {bestStreak} días</span>
        </div>
        <div className="bx flex-1 basis-[260px] p-5 text-ink-solid" style={{ background: "var(--a3)", transform: "rotate(-0.6deg)" }}>
          <span className="label-xs !text-ink-solid opacity-70">Retos completados</span>
          <div className="font-num mt-1 text-[40px] font-bold leading-none">{completedStats.length}</div>
          <span className="mt-1 block text-[13px]">{totalDaysPracticed} días de práctica</span>
        </div>
      </section>

      <div role="tablist" aria-label="Estado" className="flex flex-wrap gap-2.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className="press min-h-11 rounded-chip border-[3px] border-ink px-4.5 font-bold"
            style={tab === t.key ? { background: "var(--ink)", color: "var(--paper)" } : { background: "var(--card)", color: "var(--ink)" }}
          >
            {t.label} · {counts[t.key]}
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-7">
        {loading && <p className="text-sm text-muted">Cargando retos…</p>}
        {!loading && visible.length === 0 && (
          <p className="text-sm text-muted">No tienes retos en esta pestaña todavía.</p>
        )}
        {visible.map(({ challenge, currentDayNumber, states, streak, investedMin }) => {
          const pct = Math.round((currentDayNumber / challenge.totalDays) * 100);
          const dots = sampleDayDots(states, 30);
          const isDoneToday = states[currentDayNumber - 1] === "done";
          const statusLabel =
            challenge.status === "active" ? "En marcha" : challenge.status === "paused" ? "Pausado" : challenge.status === "completed" ? "Completado" : "Abandonado";
          const todayLabel =
            challenge.status === "paused"
              ? "Pausado"
              : challenge.status === "completed"
                ? "Terminado"
                : isDoneToday
                  ? "Hoy: ¡hecho!"
                  : "Hoy: pendiente";
          const primaryHref = challenge.status === "completed" ? `/retos/${challenge.id}/cierre` : `/retos/${challenge.id}`;
          const primaryCta = challenge.status === "completed" ? "Ver resumen" : "Abrir reto";
          const secondaryHref = challenge.status === "completed" || challenge.status === "paused" ? `/retos/${challenge.id}/galeria` : `/retos/${challenge.id}/dia`;
          const secondaryCta = challenge.status === "completed" ? "Ver galería" : challenge.status === "paused" ? "Ver diario" : isDoneToday ? "Ver diario" : "Practicar hoy";

          return (
            <article key={challenge.id} className="bx flex flex-wrap overflow-hidden bg-card">
              <div
                className="box-border flex flex-0 basis-[220px] flex-col justify-between gap-4 border-r-[3px] border-ink p-6 text-ink-solid"
                style={{ background: challenge.color }}
              >
                <span className="label-xs !text-ink-solid opacity-80">{skillName(challenge.skillId)}</span>
                <div>
                  <div className="font-num text-[56px] font-bold leading-[0.95]">{Math.min(currentDayNumber, challenge.totalDays)}</div>
                  <span className="font-num font-bold">de {challenge.totalDays} días</span>
                </div>
              </div>
              <div className="flex min-w-0 flex-1 basis-[420px] flex-col gap-3.5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="m-0 text-[24px] font-bold leading-tight tracking-tight">{challenge.name}</h2>
                  <span
                    className="whitespace-nowrap rounded-chip border-[3px] border-ink px-3.5 py-0.5 font-bold text-ink-solid"
                    style={{ background: challenge.status === "active" ? "var(--a3)" : challenge.status === "completed" ? "var(--a1)" : "var(--card)" }}
                  >
                    {statusLabel}
                  </span>
                </div>
                <ProgressBar pct={pct} color={challenge.color} ariaLabel={`Avance de ${challenge.name}`} height={22} />
                <div aria-hidden="true" className="flex gap-1">
                  {dots.map((s, i) => (
                    <span key={i} className="h-3.5 flex-1 rounded border-2 border-ink" style={{ background: DAY_STATE_COLOR[s] }} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="min-h-9 inline-flex items-center rounded-chip border-[3px] border-ink px-3.5 text-sm font-bold">
                    Racha {streak.current} días
                  </span>
                  <span className="min-h-9 inline-flex items-center rounded-chip border-[3px] border-ink px-3.5 text-sm font-bold">
                    {formatMinutesLong(investedMin)} invertidas
                  </span>
                  <span
                    className="min-h-9 inline-flex items-center rounded-chip border-[3px] border-ink px-3.5 text-sm font-bold"
                    style={isDoneToday ? { background: "var(--a3)" } : undefined}
                  >
                    {todayLabel}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-3.5">
                  <Link href={primaryHref} className="bx press flex min-h-12.5 items-center px-7 text-[17px] font-bold text-ink-solid" style={{ background: challenge.color }}>
                    {primaryCta}
                  </Link>
                  <Link href={secondaryHref} className="bx press flex min-h-12.5 items-center px-7 text-[17px] font-bold">
                    {secondaryCta}
                  </Link>
                </div>
              </div>
            </article>
          );
        })}

        <Link
          href="/retos/nuevo"
          className="hov flex flex-wrap items-center justify-between gap-5 rounded-card border-[3px] border-dashed border-ink p-6"
        >
          <div>
            <div className="text-xl font-bold">¿Algo nuevo que aprender?</div>
            <div className="font-num mt-1 text-[13px] text-muted">
              {leftToStart > 0
                ? `Puedes tener hasta ${MAX_ACTIVE_CHALLENGES} retos activos a la vez. Te queda ${leftToStart}.`
                : `Ya tienes ${MAX_ACTIVE_CHALLENGES} retos activos a la vez. Cierra uno para abrir otro.`}
            </div>
          </div>
          <span className="font-bold">Crear reto →</span>
        </Link>
      </section>
    </>
  );
}
