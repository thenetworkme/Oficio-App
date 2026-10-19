"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useChallenges } from "@/lib/hooks/useChallenges";
import { useAppData } from "@/lib/hooks/useAppData";
import { formatMinutesLong } from "@/lib/format";
import { DAY_STATE_STYLE, sampleDayDots } from "@/lib/challenge-ui";
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
      <section className="flex flex-wrap items-end justify-between gap-8 border-b border-line pb-8">
        <div>
          <span className="label-xs">Retos</span>
          <h1 className="m-0 mt-3 text-[56px] font-light leading-[0.95] tracking-tight sm:text-[72px]">Práctica con meta.</h1>
        </div>
        <Button asChild size="default">
          <Link href="/retos/nuevo">+ Nuevo reto</Link>
        </Button>
      </section>

      <section className="grid grid-cols-1 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
        <Stat label="Retos activos" value={`${activeCount} / ${MAX_ACTIVE_CHALLENGES}`} sub={leftToStart > 0 ? `Puedes abrir ${leftToStart === 1 ? "uno más" : `${leftToStart} más`}` : "Ya tienes el máximo abierto"} />
        <Stat label="Racha de retos" value={`${activeStreak} días`} sub={`Récord: ${bestStreak} días`} />
        <Stat label="Retos completados" value={String(completedStats.length)} sub={`${totalDaysPracticed} días de práctica`} />
      </section>

      <div role="tablist" aria-label="Estado" className="flex flex-wrap gap-2.5">
        {TABS.map((t) => {
          const selected = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(t.key)}
              className="inline-flex min-h-10 items-center gap-2 rounded-chip border px-4.5 font-mono text-[12px] font-medium uppercase tracking-[0.1em] transition-colors"
              style={selected ? { borderColor: "var(--ink)", background: "var(--ink)", color: "var(--paper)" } : { borderColor: "var(--border)", color: "var(--muted)" }}
            >
              {t.label} · {counts[t.key]}
            </button>
          );
        })}
      </div>

      <section className="flex flex-col border-t border-line">
        {loading && <p className="py-8 text-sm text-muted">Cargando retos…</p>}
        {!loading && visible.length === 0 && (
          <p className="py-8 text-sm text-muted">No tienes retos en esta pestaña todavía.</p>
        )}
        {visible.map(({ challenge, currentDayNumber, states, streak, investedMin }) => {
          const dots = sampleDayDots(states, 30);
          const isDoneToday = states[currentDayNumber - 1] === "done";
          const statusLabel =
            challenge.status === "active" ? "en marcha" : challenge.status === "paused" ? "pausado" : challenge.status === "completed" ? "completado" : "abandonado";
          const primaryHref = challenge.status === "completed" ? `/retos/${challenge.id}/cierre` : `/retos/${challenge.id}`;
          const secondaryHref = challenge.status === "completed" || challenge.status === "paused" ? `/retos/${challenge.id}/galeria` : `/retos/${challenge.id}/dia`;
          const secondaryCta = challenge.status === "completed" ? "Ver galería" : challenge.status === "paused" ? "Ver diario" : isDoneToday ? "Ver diario" : "Practicar hoy";

          return (
            <article key={challenge.id} className="flex flex-wrap items-center gap-6 border-b border-line py-8">
              <Link href={primaryHref} className="flex min-w-0 flex-1 basis-[420px] flex-wrap items-center gap-6">
                <div
                  aria-hidden="true"
                  className="grid shrink-0 gap-[5px]"
                  style={{ gridTemplateColumns: `repeat(${Math.min(15, dots.length)}, 1fr)`, width: Math.min(15, dots.length) * 13 }}
                >
                  {dots.map((s, i) => (
                    <span
                      key={i}
                      className="aspect-square rounded-full"
                      style={{
                        background: DAY_STATE_STYLE[s].dot,
                        boxShadow: s === "today" ? "0 0 0 3px color-mix(in srgb, var(--signal) 25%, transparent)" : "none",
                      }}
                    />
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[28px] font-light leading-tight tracking-tight sm:text-[30px]">{challenge.name}</div>
                  <div className="font-num mt-1.5 text-[12px] text-muted">
                    {skillName(challenge.skillId)} · racha {streak.current} días · {formatMinutesLong(investedMin)}
                  </div>
                </div>
              </Link>
              <Link href={primaryHref} className="text-right">
                <div className="font-num text-[30px] leading-none tracking-tight" style={{ color: challenge.status === "completed" ? "var(--muted)" : "var(--ink)" }}>
                  {Math.min(currentDayNumber, challenge.totalDays)}/{challenge.totalDays}
                </div>
                <div className="label-xs mt-1.5">{statusLabel}</div>
              </Link>
              <Button asChild variant="outline" size="sm" className="hidden shrink-0 lg:inline-flex">
                <Link href={secondaryHref}>{secondaryCta}</Link>
              </Button>
              <Link href={primaryHref} aria-label={`Abrir ${challenge.name}`} className="shrink-0 text-muted transition-colors hover:text-ink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            </article>
          );
        })}

        <Link href="/retos/nuevo" className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-7 text-muted transition-colors hover:text-ink">
          <span className="label-xs">+ Crear un reto nuevo · por ejemplo, 21 días de dibujo</span>
          <span className="font-num text-[13px]">
            {leftToStart > 0
              ? `Puedes tener hasta ${MAX_ACTIVE_CHALLENGES} retos activos. Te queda ${leftToStart}.`
              : `Ya tienes ${MAX_ACTIVE_CHALLENGES} retos activos. Cierra uno para abrir otro.`}
          </span>
        </Link>
      </section>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="flex flex-col gap-1.5 rounded-none border-0 p-6">
      <span className="label-xs">{label}</span>
      <span className="font-num text-[32px] font-normal leading-none">{value}</span>
      <span className="font-num text-[12px] text-muted">{sub}</span>
    </Card>
  );
}
