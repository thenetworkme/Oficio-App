"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DotDigits } from "@/components/ui/DotDigits";
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
  const avgMin = challenge.totalDays > 0 ? Math.round(investedMin / challenge.totalDays) : 0;
  const dotRowCount = Math.min(challenge.totalDays, 30);

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
      <section className="border-b border-line pb-8">
        <Link href="/retos" className="label-xs mb-4.5 inline-block text-muted transition-colors hover:text-ink">
          ← Retos
        </Link>
        <span className="label-xs mb-3.5 block">
          {win ? "Reto completado" : "Tiempo cumplido"} · {skill?.name ?? "Habilidad"}
        </span>
        <h1 className="m-0 text-[52px] font-light leading-[0.95] tracking-tight sm:text-[72px]">{win ? "Lo lograste." : "Buen intento."}</h1>
      </section>

      <section className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-0">
        <div className="min-w-0 lg:border-r lg:border-line lg:pr-14">
          <p className="max-w-[560px] text-[17px] text-muted">
            {win
              ? `Tocas, dibujas o avanzas en ${skill?.name ?? "tu habilidad"} de verdad. Hace ${challenge.totalDays} días ni habías empezado. Eso es lo que hace la constancia.`
              : `Eso también cuenta: ${completedDays} días más de práctica que el que nunca empezó. No lo cerramos como fallo; elige cómo seguir.`}
          </p>

          <div className="label-xs mb-4 mt-8">{challenge.name}</div>
          <div className="mb-8 flex items-center gap-4" aria-label={`${completedDays} de ${challenge.totalDays} días`}>
            <DotDigits value={String(completedDays)} size={15} gap={6} ariaLabel={`${completedDays} días completados`} />
            <span className="font-num text-[22px] text-muted">/</span>
            <DotDigits value={String(challenge.totalDays)} size={15} gap={6} offColor="var(--line)" ariaLabel={`de ${challenge.totalDays} días`} />
          </div>

          <div aria-hidden="true" className="mb-8 grid gap-2" style={{ gridTemplateColumns: `repeat(${dotRowCount}, 1fr)` }}>
            {Array.from({ length: dotRowCount }, (_, i) => (
              <span key={i} className="aspect-square rounded-full" style={{ background: i < completedDays ? "var(--ink)" : "var(--line)" }} />
            ))}
          </div>

          {win && (
            <div className="flex items-center gap-6 rounded-card border border-line p-7">
              <Badge />
              <div>
                <div className="label-xs text-signal">Logro desbloqueado</div>
                <div className="mt-0.5 text-[22px] tracking-tight">Primer reto completo</div>
                <div className="font-num mt-1 text-[13px] text-muted">Completa un reto de principio a fin · +300 XP</div>
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 pt-9 lg:pt-0 lg:pl-14">
          <div className="label-xs mb-1">Resumen</div>
          <Fact k="Duración" v={`${challenge.totalDays} días`} />
          <Fact k="Tiempo total" v={formatMinutesLong(investedMin)} />
          <Fact k="Meta prevista" v={formatMinutesLong(plannedMin)} />
          <Fact k="Promedio diario" v={`${avgMin} min`} />
          <Fact k="Constancia" v={`${pctConstancy}%`} />
          <Fact k="Racha máxima" v={`${streak.best} días`} />
          <Fact k="Notas escritas" v={String(notesCount)} />
          <Fact k="Fotos subidas" v={String(photosCount)} />
          <Fact k="Monedas ganadas" v={`+${totalCoins}`} last />

          <div className="mt-9 flex flex-col gap-3">
            {win ? (
              <>
                <Button asChild size="default">
                  <Link href="/retos/nuevo">Crear un reto nuevo</Link>
                </Button>
                <Button asChild variant="outline" size="default">
                  <Link href={`/retos/${challenge.id}/galeria`}>Ver galería y diario</Link>
                </Button>
                <Button asChild variant="outline" size="default">
                  <Link href="/retos">Volver a retos</Link>
                </Button>
              </>
            ) : (
              <>
                <Button size="default" disabled={closing} onClick={() => router.push(`/retos/${challenge.id}`)}>
                  Retomar el reto
                </Button>
                <Button asChild variant="outline" size="default">
                  <Link href={`/retos/${challenge.id}`}>Ajustar la meta</Link>
                </Button>
                <Button variant="outline" size="default" disabled={closing} onClick={() => handleClose("abandoned")}>
                  {closing ? "Cerrando…" : "Cerrar y guardar"}
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

/** Small dot-built badge glyph for the achievement box — kept in the same
 * hand-drawn-with-dots idiom as DotDigits/HourRuler rather than an emoji or
 * icon font, since the reference's own achievement icon is dot-matrix art
 * too (see design-reference/punto/png/PuntoRetoCierre.png). A simple filled
 * ring rather than reproducing that exact bespoke glyph bitmap, which isn't
 * part of lib/dotmatrix.ts's shared glyph table. */
function Badge() {
  const ring = [
    "00111000",
    "01000100",
    "10000010",
    "10000010",
    "10000010",
    "01000100",
    "00111000",
  ];
  return (
    <div className="grid shrink-0 gap-[3px]" style={{ gridTemplateColumns: "repeat(8, 7px)" }} aria-hidden="true">
      {ring.flatMap((row, r) =>
        row.split("").map((cell, c) => (
          <span key={`${r}-${c}`} className="size-[7px] rounded-full" style={{ background: cell === "1" ? "var(--signal)" : "transparent" }} />
        )),
      )}
    </div>
  );
}

function Fact({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-3.5 ${last ? "" : "border-b border-line"}`}>
      <span className="label-xs">{k}</span>
      <span className="font-num text-[15px]">{v}</span>
    </div>
  );
}
