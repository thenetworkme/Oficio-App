"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModeBackdrop } from "@/components/layout/ModeBackdrop";
import { useAppData } from "@/lib/hooks/useAppData";
import { closeChallenge, watchChallenge, watchChallengeDays } from "@/lib/firestore/challenges";
import { computeChallengeStreak, computeDayStates, totalInvestedMin } from "@/lib/challenge";
import { coinsPerSession } from "@/lib/economy";
import { formatMinutesLong } from "@/lib/format";
import type { Challenge, ChallengeDay } from "@/lib/types";

function TrophyIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4h8v6a4 4 0 01-8 0zM8 6H4v1a4 4 0 004 4M16 6h4v1a4 4 0 01-4 4M12 14v4M8 21h8" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </svg>
  );
}

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

  if (!challenge) {
    return (
      <>
        <ModeBackdrop />
        <div className="flex flex-1 items-center justify-center py-20">
          <span className="text-[15px] text-mode-ink-muted">Cargando cierre…</span>
        </div>
      </>
    );
  }

  const skill = skills.find((s) => s.id === challenge.skillId);
  const win = challenge.status === "completed" && completedDays >= challenge.totalDays;
  const plannedMin = challenge.totalDays * challenge.dailyGoalMin;
  const pctConstancy = challenge.totalDays > 0 ? Math.round((completedDays / challenge.totalDays) * 100) : 0;
  const avgMin = challenge.totalDays > 0 ? Math.round(investedMin / challenge.totalDays) : 0;
  const cells = Math.min(challenge.totalDays, 30);

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
      <ModeBackdrop />
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6 text-mode-ink">
        <div className="mt-2 flex flex-col items-center text-center">
          <span className="mb-4 flex size-[72px] items-center justify-center rounded-full bg-go-bg text-[var(--mode-bg)]">
            <TrophyIcon />
          </span>
          <h1 className="m-0 text-[32px] font-bold leading-[1.15] tracking-tight">{win ? "¡Reto completado!" : "Buen intento."}</h1>
          <p className="m-0 mt-1.5 text-[16px] text-mode-ink-muted">
            {challenge.name} · {Math.min(completedDays, challenge.totalDays)} de {challenge.totalDays}
          </p>
        </div>

        <Card tone="solid" className="p-6 sm:p-7">
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(15, cells)}, 1fr)` }} role="img" aria-label={`${completedDays} de ${challenge.totalDays} días`}>
            {Array.from({ length: cells }, (_, i) => (
              <span key={i} className="aspect-square rounded-[4px]" style={{ background: i < completedDays ? "var(--mode-bg)" : "var(--surface-muted)" }} />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2.5 text-center">
            <StatTile value={formatMinutesLong(investedMin)} label="practicadas" />
            <StatTile value={String(streak.best)} label="días seguidos" />
            <StatTile value={`+${totalCoins}`} label="monedas" />
          </div>

          {win && (
            <div className="mt-5 flex items-center gap-3.5 rounded-card p-4" style={{ boxShadow: "inset 0 0 0 2px var(--card-solid-line)" }}>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] text-white" style={{ background: "var(--mode-bg)" }}>
                <FlagIcon />
              </span>
              <div>
                <div className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--mode-bg)" }}>
                  Logro desbloqueado
                </div>
                <div className="text-[16px] font-bold" style={{ color: "var(--card-solid-ink)" }}>
                  Reto de {challenge.totalDays} días completo
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-5 text-[13px] sm:grid-cols-3" style={{ borderColor: "var(--card-solid-line)" }}>
            <Fact k="Duración" v={`${challenge.totalDays} días`} />
            <Fact k="Meta prevista" v={formatMinutesLong(plannedMin)} />
            <Fact k="Promedio diario" v={`${avgMin} min`} />
            <Fact k="Constancia" v={`${pctConstancy}%`} />
            <Fact k="Notas escritas" v={String(notesCount)} />
            <Fact k="Fotos subidas" v={String(photosCount)} />
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            {win ? (
              <>
                <Button asChild variant="dark" size="md">
                  <Link href="/retos/nuevo">Crear un reto nuevo</Link>
                </Button>
                <div className="flex gap-2.5">
                  <Button asChild variant="light" size="md" className="flex-1">
                    <Link href={`/retos/${challenge.id}/galeria`}>Ver galería y diario</Link>
                  </Button>
                  <Button asChild variant="light" size="md" className="flex-1">
                    <Link href="/retos">Volver a retos</Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button variant="dark" size="md" disabled={closing} onClick={() => router.push(`/retos/${challenge.id}`)}>
                  Retomar el reto
                </Button>
                <div className="flex gap-2.5">
                  <Button asChild variant="light" size="md" className="flex-1">
                    <Link href={`/retos/${challenge.id}`}>Ajustar la meta</Link>
                  </Button>
                  <Button variant="light" size="md" className="flex-1" disabled={closing} onClick={() => handleClose("abandoned")}>
                    {closing ? "Cerrando…" : "Cerrar y guardar"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
        {skill && (
          <p className="m-0 text-center text-[13px] text-mode-ink-muted">
            Sigues aprendiendo {skill.name}. {win ? "Un reto más no te vendría mal." : "Vuelve cuando quieras retomarlo."}
          </p>
        )}
      </div>
    </>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-card p-3.5" style={{ background: "var(--surface-muted)" }}>
      <div className="font-num text-[20px] font-extrabold leading-tight" style={{ color: "var(--card-solid-ink)" }}>
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--card-solid-muted)" }}>
        {label}
      </div>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span style={{ color: "var(--card-solid-muted)" }}>{k}:</span>
      <span className="font-num font-semibold" style={{ color: "var(--card-solid-ink)" }}>
        {v}
      </span>
    </div>
  );
}
