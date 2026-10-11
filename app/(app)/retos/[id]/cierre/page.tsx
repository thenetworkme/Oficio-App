"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { useAppData } from "@/lib/hooks/useAppData";
import { closeChallenge, watchChallenge, watchChallengeDays } from "@/lib/firestore/challenges";
import { computeChallengeStreak, computeDayStates, totalInvestedMin } from "@/lib/challenge";
import { coinsPerSession } from "@/lib/economy";
import { formatMinutesLong } from "@/lib/format";
import type { Challenge, ChallengeDay } from "@/lib/types";

export default function RetoCierrePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { skills } = useAppData();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [days, setDays] = useState<ChallengeDay[]>([]);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!id) return;
    return watchChallenge(id, setChallenge);
  }, [id]);
  useEffect(() => {
    if (!id) return;
    return watchChallengeDays(id, setDays);
  }, [id]);

  const completedDays = days.filter((d) => d.durationMin > 0).length;
  const investedMin = useMemo(() => totalInvestedMin(days.map((d) => ({ dayNumber: d.dayNumber, durationMin: d.durationMin }))), [days]);
  const notesCount = days.filter((d) => d.note.trim().length > 0).length;
  const photosCount = days.reduce((acc, d) => acc + d.photoUrls.length, 0);
  const bestDay = Math.max(0, ...days.map((d) => d.durationMin));
  const totalCoins = days.reduce((acc, d) => acc + coinsPerSession(d.durationMin, d.mood), 0);

  const states = useMemo(() => {
    if (!challenge) return [];
    return computeDayStates(
      challenge.totalDays,
      challenge.totalDays,
      days.map((d) => ({ dayNumber: d.dayNumber, durationMin: d.durationMin })),
      challenge.graceDaysAllowed,
    ).states;
  }, [challenge, days]);
  const streak = useMemo(() => computeChallengeStreak(states), [states]);

  if (!challenge) return <p className="text-sm text-muted">Cargando cierre…</p>;

  const skill = skills.find((s) => s.id === challenge.skillId);
  const win = challenge.status === "completed" && completedDays >= challenge.totalDays;
  const plannedMin = challenge.totalDays * challenge.dailyGoalMin;
  const pctConstancy = Math.round((completedDays / challenge.totalDays) * 100);
  const maxBar = Math.max(60, bestDay);

  async function handleClose(outcome: "completed" | "abandoned") {
    if (!challenge) return;
    setClosing(true);
    try {
      await closeChallenge(challenge.id, outcome);
    } finally {
      setClosing(false);
    }
  }

  return (
    <>
      <nav aria-label="Ruta" className="flex flex-wrap items-center gap-2.5">
        <Link href="/retos" className="bx press flex min-h-11 items-center px-4 font-bold">
          ← Retos
        </Link>
        <span className="label-xs">Cierre del reto</span>
      </nav>

      <section className="flex flex-wrap items-stretch gap-8">
        <div className="bx flex min-w-0 flex-[2_1_560px] flex-col gap-3.5 p-8.5 text-ink-solid" style={{ background: win ? "var(--a1)" : "var(--paper)", transform: "rotate(-0.6deg)" }}>
          <span className="label-xs !text-ink-solid opacity-80">
            {challenge.name} · {win ? "reto completado" : "tiempo cumplido"}
          </span>
          <h1 className="m-0 text-[52px] font-bold leading-[0.95] tracking-tight sm:text-[64px]">
            {win ? `¡${completedDays} de ${challenge.totalDays}!` : `${completedDays} de ${challenge.totalDays} días.`}
          </h1>
          <p className="m-0 max-w-[560px] text-xl font-medium">
            {win
              ? `Tocas, dibujas o avanzas en ${skill?.name ?? "tu habilidad"} de verdad. Hace ${challenge.totalDays} días ni habías empezado. Eso es lo que hace la constancia.`
              : `Eso también cuenta: ${completedDays} días más de práctica que el que nunca empezó. No lo cerramos como fallo; elige cómo seguir.`}
          </p>
          <div className="mt-auto flex flex-wrap gap-3">
            <span className="min-h-11 inline-flex items-center rounded-chip border-[3px] border-ink bg-card px-4 font-bold">
              Racha máxima: {streak.best} días
            </span>
            <span className="min-h-11 inline-flex items-center rounded-chip border-[3px] border-ink bg-card px-4 font-bold">
              {win ? `Usaste ${challenge.graceDaysUsed} día(s) de gracia` : `Usaste ${challenge.graceDaysUsed} de ${challenge.graceDaysAllowed} días de gracia`}
            </span>
          </div>
        </div>
        <div
          className="bx flex min-w-0 flex-1 basis-[300px] items-center justify-center p-4"
          style={{ background: win ? "var(--a2)" : "#BFE3FF", transform: "rotate(1.4deg)" }}
        >
          <Mascot size={220} mood={win ? "celebrate" : "sleepy"} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-5.5 sm:grid-cols-4">
        <Stat label="Tiempo total" value={formatMinutesLong(investedMin)} sub={`meta del reto: ${formatMinutesLong(plannedMin)}`} bg="#7CC4FF" />
        <Stat label="Días cumplidos" value={`${completedDays} / ${challenge.totalDays}`} sub={`${pctConstancy}% de constancia`} bg="var(--a3)" />
        <Stat label="Notas escritas" value={String(notesCount)} sub={notesCount === challenge.totalDays ? "ninguna sin nota" : "sigues aprendiendo"} bg="var(--a1)" />
        <Stat label="Fotos subidas" value={String(photosCount)} sub="tu galería está lista" bg="var(--a2)" />
      </section>

      <section className="bx flex flex-col gap-3.5 p-6.5">
        <div className="flex flex-wrap justify-between gap-3">
          <h2 className="m-0 text-2xl font-bold tracking-tight">Minutos por día</h2>
          <span className="font-num text-[13px] text-muted">Mejor día: {bestDay} min</span>
        </div>
        <div role="img" aria-label="Minutos practicados por día" className="flex h-[150px] items-end gap-1.5 border-b-[3px] border-ink">
          {Array.from({ length: challenge.totalDays }, (_, i) => {
            const d = days.find((x) => x.dayNumber === i + 1);
            const m = d?.durationMin ?? 0;
            return (
              <div
                key={i}
                className="min-h-1 flex-1 rounded-t-md border-[3px] border-b-0 border-ink"
                style={{ height: Math.max(4, Math.round((m / maxBar) * 130)), background: m === 0 ? "var(--card)" : challenge.color }}
              />
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="m-0 text-[32px] font-bold tracking-tight">{win ? "Tu recompensa." : "Lo que ya ganaste."}</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <RewardCard sym={win ? "🏅" : "⏱️"} title={win ? `+${totalCoins} monedas` : `${totalCoins} monedas`} sub={win ? "bonus por terminar el reto" : `por tus ${completedDays} días de práctica`} bg="var(--a1)" />
          <RewardCard sym="★" title={win ? `Insignia: ${challenge.totalDays} días de ${skill?.name ?? ""}` : `${formatMinutesLong(investedMin)} en ${skill?.name ?? ""}`} sub={win ? "nueva en tu álbum de logros" : "ya suman a tus 10.000 h"} bg="var(--a2)" />
          <RewardCard sym="✎" title={`${notesCount} notas y ${photosCount} fotos`} sub="guardadas en tu galería" bg="var(--a3)" />
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="m-0 text-[32px] font-bold tracking-tight">{win ? "¿Qué sigue?" : "Elige cómo seguir."}</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {win ? (
            <>
              <NextCard title="Repetir el reto" sub="Otros días, esta vez con una meta nueva." cta="Repetir" bg="var(--a1)" href="/retos/nuevo" />
              <NextCard title="Subir de nivel" sub="Mismo ritmo, el doble de camino. Conservas tu racha." cta="Subir de nivel" bg="var(--a3)" href="/retos/nuevo" />
              <NextCard title="Ver mi galería" sub={`Compara el día 1 con el día ${challenge.totalDays}.`} cta="Abrir galería" bg="var(--a2)" href={`/retos/${challenge.id}/galeria`} />
            </>
          ) : (
            <>
              <button type="button" disabled={closing} onClick={() => router.push(`/retos/${challenge.id}`)} className="hov bx press flex min-h-[130px] flex-col gap-2 p-5.5 text-left" style={{ background: "var(--a1)" }}>
                <span className="text-xl font-bold">Retomar el reto</span>
                <span className="text-sm font-medium">Vuelve al tablero y sigue sumando días.</span>
                <span className="mt-auto font-bold">Retomar →</span>
              </button>
              <Link href={`/retos/${challenge.id}`} className="hov bx press flex min-h-[130px] flex-col gap-2 p-5.5" style={{ background: "var(--a3)" }}>
                <span className="text-xl font-bold">Ajustar la meta</span>
                <span className="text-sm font-medium">Mejor un ritmo que puedas sostener en un mal día.</span>
                <span className="mt-auto font-bold">Ajustar meta →</span>
              </Link>
              <button type="button" disabled={closing} onClick={() => handleClose("abandoned")} className="hov bx press flex min-h-[130px] flex-col gap-2 p-5.5 text-left">
                <span className="text-xl font-bold">Cerrar y guardar</span>
                <span className="text-sm font-medium">Se queda en tus completados. Conservas todo.</span>
                <span className="mt-auto font-bold">{closing ? "Cerrando…" : "Cerrar reto →"}</span>
              </button>
            </>
          )}
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, sub, bg }: { label: string; value: string; sub: string; bg: string }) {
  return (
    <div className="bx flex flex-col gap-0.5 p-4.5 text-ink-solid" style={{ background: bg }}>
      <span className="label-xs !text-ink-solid text-[12px] opacity-80">{label}</span>
      <span className="font-num text-[32px] font-bold leading-[1.05]">{value}</span>
      <span className="font-num text-[12px]">{sub}</span>
    </div>
  );
}

function RewardCard({ sym, title, sub, bg }: { sym: string; title: string; sub: string; bg: string }) {
  return (
    <div className="hov bx flex items-center gap-4.5 p-5.5">
      <div className="flex size-19 shrink-0 items-center justify-center rounded-full border-[3px] border-ink text-2xl" style={{ background: bg }}>
        {sym}
      </div>
      <div>
        <div className="text-[22px] font-bold leading-tight tracking-tight">{title}</div>
        <div className="font-num mt-1 text-xs text-muted">{sub}</div>
      </div>
    </div>
  );
}

function NextCard({ title, sub, cta, bg, href }: { title: string; sub: string; cta: string; bg: string; href: string }) {
  return (
    <Link href={href} className="hov press bx flex min-h-[130px] flex-col gap-2 p-5.5 text-ink-solid" style={{ background: bg }}>
      <span className="text-xl font-bold">{title}</span>
      <span className="text-sm font-medium">{sub}</span>
      <span className="mt-auto font-bold">{cta} →</span>
    </Link>
  );
}
